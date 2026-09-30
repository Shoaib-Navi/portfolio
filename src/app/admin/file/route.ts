import { sessionUser } from "@/lib/admin/auth";
import { getStore } from "@/lib/admin/store";

// Serves draft files to the admin UI (a new screenshot exists only in the draft until
// published). Signed-in only; limited to the folders the admin manages.

const TYPES: Record<string, string> = {
  webp: "image/webp",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  svg: "image/svg+xml",
  pdf: "application/pdf",
};

export async function GET(request: Request) {
  if (!(await sessionUser())) return new Response("Unauthorized", { status: 401 });
  const p = new URL(request.url).searchParams.get("p") ?? "";
  const match = /^\/((?:logos|shots|pfp|resumes)\/[a-z0-9][a-z0-9._-]*|resume)\.(webp|png|jpg|jpeg|svg|pdf)$/.exec(p);
  if (!match || p.includes("..")) return new Response("Not found", { status: 404 });
  const bytes = await getStore().read(`public${p}`);
  if (!bytes) return new Response("Not found", { status: 404 });
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": TYPES[match[2]],
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      // An SVG opened directly renders as a document; give it nothing to run.
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; img-src data:",
    },
  });
}
