import { getAnalytics, sourceOf } from "@/lib/analytics";
import { isLinkTarget, requestContext } from "@/lib/analytics/request";

// Tracking links: /go/<code> records the open on the server (so it works for the résumé
// PDF, which can't run the tracker) and redirects. Unknown codes go to the home page
// without revealing whether a code exists. Bots and link previews are redirected but not
// counted.

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ code: string }> };

const go = (request: Request, path: string) =>
  new Response(null, {
    status: 302,
    headers: { Location: new URL(path, request.url).toString(), "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
  });

export async function GET(request: Request, { params }: Params) {
  const { code } = await params;
  if (!/^[a-z0-9-]{1,40}$/.test(code)) return go(request, "/");
  const store = getAnalytics();
  const link = await store.getLink(code).catch(() => null);
  if (!link) return go(request, "/");
  const target = isLinkTarget(link.target) ? link.target : "/";

  const ctx = requestContext(request.headers);
  if (!ctx.skip) {
    try {
      await store.record({
        kind: "open",
        ...ctx.base,
        path: target,
        target,
        ref: code,
        source: sourceOf(request.headers.get("referer") ?? undefined, ctx.host),
      });
    } catch (e) {
      console.error("[analytics]", e);
    }
  }

  // Pages carry the code so the visit's page views and a download are credited to it;
  // via=go tells the tracker the open itself is already counted.
  if (target === "/resume.pdf") return go(request, target);
  return go(request, `${target}?ref=${encodeURIComponent(code)}&via=go`);
}
