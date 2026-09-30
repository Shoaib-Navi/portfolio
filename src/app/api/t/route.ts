import { notes, projects } from "@/data/profile";
import { readSessionToken, SESSION_COOKIE } from "@/lib/admin/session";
import { dayOf, deviceOf, getAnalytics, isBot, sourceOf, visitorHash, type Hit } from "@/lib/analytics";

// Receives page views and clicks from components/AnalyticsTracker.tsx (sent with
// navigator.sendBeacon). Everything is validated here; unknown paths, bots, the site
// owner's own visits and malformed payloads are dropped silently with 204.

const SECTIONS = ["/", "/about", "/skills", "/experience", "/engineering", "/contact", "/work", "/notes"];
const known = new Set([...SECTIONS, ...projects.map((p) => `/work/${p.slug}`), ...notes.map((n) => `/notes/${n.slug}`)]);
const done = () => new Response(null, { status: 204 });

type Payload = { k?: string; p?: string; r?: string; ref?: string; land?: boolean; to?: string };

export async function POST(request: Request) {
  const headers = request.headers;
  const host = headers.get("host") ?? "";
  // Only our own pages may report. (Same-origin beacons always carry Origin.)
  const origin = headers.get("origin");
  if (!origin || new URL(origin).host !== host) return done();

  const ua = headers.get("user-agent") ?? "";
  if (isBot(ua)) return done();
  // Don't count the site owner while they're signed in to the admin.
  const cookie = headers.get("cookie") ?? "";
  const session = new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`).exec(cookie)?.[1];
  if (session && readSessionToken(decodeURIComponent(session))) return done();

  const raw = await request.text();
  if (raw.length > 2048) return done();
  let body: Payload;
  try {
    body = JSON.parse(raw) as Payload;
  } catch {
    return done();
  }

  const path = typeof body.p === "string" ? body.p.split(/[?#]/)[0].replace(/(.)\/$/, "$1") : "";
  if (!known.has(path)) return done();
  const kind = body.k === "pv" ? "pageview" : body.k === "dl" ? "download" : body.k === "out" ? "outbound" : null;
  if (!kind) return done();

  const store = getAnalytics();
  if (store.mode === "off") return done();

  let target: string | undefined;
  if (kind === "outbound") {
    try {
      target = new URL(String(body.to)).hostname.replace(/^www\./, "").slice(0, 60);
    } catch {
      return done();
    }
  }

  // Tracking links only count when they were created in the admin.
  const code = typeof body.ref === "string" && /^[a-z0-9-]{1,40}$/.test(body.ref) ? body.ref : undefined;
  const ref = code && (await store.hasLink(code)) ? code : undefined;

  const now = new Date();
  const day = dayOf(now);
  const ip = headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "local";
  const hit: Hit = {
    kind,
    day,
    at: now.toISOString(),
    path,
    country: (headers.get("x-vercel-ip-country") || "").toUpperCase().slice(0, 2) || "Unknown",
    device: deviceOf(ua),
    visitor: visitorHash(ip, ua, day),
    ...(kind === "pageview" ? { source: sourceOf(typeof body.r === "string" ? body.r : undefined, host) } : {}),
    ...(ref ? { ref, landing: kind === "pageview" && body.land === true } : {}),
    ...(target ? { target } : {}),
  };

  try {
    await store.record(hit);
  } catch (e) {
    // Analytics must never break the site; log and move on.
    console.error("[analytics]", e);
  }
  return done();
}
