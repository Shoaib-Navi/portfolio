import { checkProjects } from "@/lib/status";

// Project live-demo and repository status. Vercel's edge caches the response for ten
// minutes (and serves the previous result while refreshing), so visitors never fan out
// into requests to the demo sites or GitHub.
export const dynamic = "force-dynamic";

export async function GET() {
  const report = await checkProjects();
  return Response.json(report, {
    headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600", "X-Robots-Tag": "noindex" },
  });
}
