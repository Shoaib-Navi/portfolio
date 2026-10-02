import { scrypt, timingSafeEqual } from "node:crypto";

// Hash format: scrypt$<N>$<r>$<p>$<salt b64>$<hash b64>, produced by `npm run admin:hash`.

function derive(password: string, salt: Buffer, N: number, r: number, p: number, len: number) {
  return new Promise<Buffer>((resolve, reject) =>
    scrypt(password, salt, len, { N, r, p, maxmem: 256 * N * r }, (err, key) => (err ? reject(err) : resolve(key))),
  );
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [N, r, p] = parts.slice(1, 4).map(Number);
  if (![N, r, p].every(Number.isInteger)) return false;
  const salt = Buffer.from(parts[4], "base64");
  const expected = Buffer.from(parts[5], "base64");
  if (expected.length < 16) return false;
  const actual = await derive(password, salt, N, r, p, expected.length);
  return timingSafeEqual(actual, expected);
}
