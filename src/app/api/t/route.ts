import { getAnalytics, sourceOf, type Hit } from "@/lib/analytics";
import { knownPaths, requestContext } from "@/lib/analytics/request";

// Receives page views and clicks from components/AnalyticsTracker.tsx (sent with
// navigator.sendBeacon). Everything is validated here; unknown paths, bots, the site
// owner's own visits and malformed payloads are dropped silently with 204.

const known = knownPaths();
const done = () => new Response(null, { status: 204 });

type Payload = { k?: string; p?: string; r?: string; ref?: string; land?: boolean; to?: string };

export async function POST(request: Request) {
  const headers = request.headers;
  const ctx = requestContext(headers);
  // Only our own pages may report. (Same-origin beacons always carry Origin.)
  const origin = headers.get("origin");
  if (!origin || new URL(origin).host !== ctx.host) return done();
  if (ctx.skip) return done();

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
    if (body.to === "mailto:") target = "email";
    else {
      try {
        const url = new URL(String(body.to));
        if (!/^https?:$/.test(url.protocol)) return done();
        // Host + path is enough to tell "GitHub profile" from "a GitHub repo"; no query strings.
        target = `${url.hostname.replace(/^www\./, "")}${url.pathname.replace(/\/$/, "")}`.slice(0, 120);
      } catch {
        return done();
      }
    }
  }

  // Tracking links only count when they were created in the admin.
  const code = typeof body.ref === "string" && /^[a-z0-9-]{1,40}$/.test(body.ref) ? body.ref : undefined;
  const ref = code && (await store.hasLink(code)) ? code : undefined;

  const hit: Hit = {
    kind,
    ...ctx.base,
    path,
    ...(kind === "pageview" ? { source: sourceOf(typeof body.r === "string" ? body.r : undefined, ctx.host) } : {}),
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
