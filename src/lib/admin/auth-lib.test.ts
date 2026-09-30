import { randomBytes, scryptSync } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { verifyPassword } from "./password";
import { clearFailures, recordFailure, retryAfter } from "./rate-limit";
import { createSessionToken, readSessionToken, SESSION_TTL_S } from "./session";

describe("session tokens", () => {
  const now = Date.UTC(2026, 0, 1);

  beforeEach(() => {
    process.env.ADMIN_USER = "shoaib";
    process.env.SESSION_SECRET = "s".repeat(40);
  });

  it("round-trips", () => {
    expect(readSessionToken(createSessionToken("shoaib", now), now)).toBe("shoaib");
  });

  it("rejects missing and malformed tokens", () => {
    expect(readSessionToken(undefined, now)).toBeNull();
    expect(readSessionToken("", now)).toBeNull();
    expect(readSessionToken("nodot", now)).toBeNull();
    expect(readSessionToken(".sig", now)).toBeNull();
  });

  it("rejects a tampered payload or signature", () => {
    const token = createSessionToken("shoaib", now);
    const [data, sig] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ u: "shoaib", exp: 9e9 })).toString("base64url");
    expect(readSessionToken(`${forged}.${sig}`, now)).toBeNull();
    const flipped = sig.slice(0, -1) + (sig.endsWith("A") ? "B" : "A");
    expect(readSessionToken(`${data}.${flipped}`, now)).toBeNull();
    expect(readSessionToken(`${data}.${sig}x`, now)).toBeNull();
  });

  it("rejects an expired token", () => {
    const token = createSessionToken("shoaib", now);
    expect(readSessionToken(token, now + SESSION_TTL_S * 1000 - 1000)).toBe("shoaib");
    expect(readSessionToken(token, now + SESSION_TTL_S * 1000 + 1000)).toBeNull();
  });

  it("rejects a token for a different user", () => {
    const token = createSessionToken("shoaib", now);
    process.env.ADMIN_USER = "someone-else";
    expect(readSessionToken(token, now)).toBeNull();
  });

  it("rejects tokens after the secret changes", () => {
    const token = createSessionToken("shoaib", now);
    process.env.SESSION_SECRET = "t".repeat(40);
    expect(readSessionToken(token, now)).toBeNull();
  });

  it("rejects everything when the secret is shorter than 32 characters", () => {
    process.env.SESSION_SECRET = "short-secret";
    const token = createSessionToken("shoaib", now);
    expect(readSessionToken(token, now)).toBeNull();
  });
});

describe("verifyPassword", () => {
  // Same format as scripts/admin-hash.mjs.
  const hash = (password: string) => {
    const [N, r, p] = [16384, 8, 1];
    const salt = randomBytes(16);
    const key = scryptSync(password, salt, 32, { N, r, p });
    return `scrypt$${N}$${r}$${p}$${salt.toString("base64")}$${key.toString("base64")}`;
  };
  const stored = hash("correct horse battery");

  it("accepts the right password and rejects a wrong one", async () => {
    expect(await verifyPassword("correct horse battery", stored)).toBe(true);
    expect(await verifyPassword("correct horse batterY", stored)).toBe(false);
    expect(await verifyPassword("", stored)).toBe(false);
  });

  it("rejects malformed hashes", async () => {
    const parts = stored.split("$");
    expect(await verifyPassword("x", "")).toBe(false);
    expect(await verifyPassword("x", "plaintext")).toBe(false);
    expect(await verifyPassword("x", ["bcrypt", ...parts.slice(1)].join("$"))).toBe(false);
    expect(await verifyPassword("x", parts.slice(0, 5).join("$"))).toBe(false);
    expect(await verifyPassword("x", ["scrypt", "abc", ...parts.slice(2)].join("$"))).toBe(false);
    expect(await verifyPassword("x", [...parts.slice(0, 5), "c2hvcnQ="].join("$"))).toBe(false);
  });
});

describe("rate limit", () => {
  const t0 = 1_000_000_000_000;

  it("blocks after 5 failures in the window", () => {
    for (let i = 0; i < 4; i++) recordFailure("ip-a", t0 + i);
    expect(retryAfter("ip-a", t0 + 10)).toBe(0);
    recordFailure("ip-a", t0 + 4);
    expect(retryAfter("ip-a", t0 + 10)).toBeGreaterThan(0);
    expect(retryAfter("ip-a", t0 + 10)).toBe(15 * 60);
    expect(retryAfter("ip-b", t0 + 10)).toBe(0);
  });

  it("allows again once the oldest failure leaves the window", () => {
    for (let i = 0; i < 5; i++) recordFailure("ip-c", t0 + i * 1000);
    expect(retryAfter("ip-c", t0 + 5000)).toBeGreaterThan(0);
    expect(retryAfter("ip-c", t0 + 15 * 60 * 1000 + 1)).toBe(0);
  });

  it("clearFailures resets the key", () => {
    for (let i = 0; i < 5; i++) recordFailure("ip-d", t0);
    expect(retryAfter("ip-d", t0)).toBeGreaterThan(0);
    clearFailures("ip-d");
    expect(retryAfter("ip-d", t0)).toBe(0);
  });
});
