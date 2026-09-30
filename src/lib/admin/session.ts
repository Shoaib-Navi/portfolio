import { createHmac, timingSafeEqual } from "node:crypto";
import { adminEnv } from "./env";

// Stateless session: base64url(JSON payload) + "." + HMAC-SHA256 signature.
// Used by proxy.ts (optimistic redirect) and re-checked inside every admin action and page.

export const SESSION_COOKIE = "admin_session";
export const SESSION_TTL_S = 8 * 60 * 60;

type Payload = { u: string; exp: number };

const sign = (data: string, secret: string) => createHmac("sha256", secret).update(data).digest("base64url");

export function createSessionToken(user: string, now = Date.now()): string {
  const payload: Payload = { u: user, exp: Math.floor(now / 1000) + SESSION_TTL_S };
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${data}.${sign(data, adminEnv.sessionSecret())}`;
}

/** Returns the user name for a valid, unexpired token signed with the current secret. */
export function readSessionToken(token: string | undefined, now = Date.now()): string | null {
  const secret = adminEnv.sessionSecret();
  if (!token || secret.length < 32) return null;
  const dot = token.indexOf(".");
  if (dot < 1) return null;
  const data = token.slice(0, dot);
  const given = Buffer.from(token.slice(dot + 1));
  const expected = Buffer.from(sign(data, secret));
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(data, "base64url").toString()) as Payload;
    if (typeof payload.exp !== "number" || payload.exp * 1000 < now) return null;
    if (payload.u !== adminEnv.user()) return null;
    return payload.u;
  } catch {
    return null;
  }
}
