/**
 * Canonical origin for metadata, sitemap.xml and robots.txt.
 * Vercel supplies its own domain, so only self-hosting needs NEXT_PUBLIC_SITE_URL.
 */
const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  (vercelHost ? `https://${vercelHost}` : "http://localhost:3000")
).replace(/\/$/, "");
