// Prints the ADMIN_PASSWORD_HASH and a fresh SESSION_SECRET for .env.local / Vercel.
// Usage: npm run admin:hash -- "your password"
import { randomBytes, scryptSync } from "node:crypto";

const password = process.argv[2];
if (!password || password.length < 12) {
  console.error('Usage: npm run admin:hash -- "a password of at least 12 characters"');
  process.exit(1);
}
const [N, r, p] = [16384, 8, 1];
const salt = randomBytes(16);
const hash = scryptSync(password, salt, 32, { N, r, p });
console.log(`ADMIN_PASSWORD_HASH=scrypt$${N}$${r}$${p}$${salt.toString("base64")}$${hash.toString("base64")}`);
console.log(`SESSION_SECRET=${randomBytes(32).toString("base64url")}`);
