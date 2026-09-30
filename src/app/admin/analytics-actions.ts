"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, Unauthorized } from "@/lib/admin/auth";
import { getAnalytics, type TrackingLink } from "@/lib/analytics";
import { isLinkTarget } from "@/lib/analytics/request";
import type { Result } from "./actions";

const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

async function guarded<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    await requireAdmin();
    const data = await fn();
    revalidatePath("/admin/analytics");
    return { ok: true, data };
  } catch (e) {
    if (!(e instanceof Unauthorized)) console.error("[analytics admin]", e);
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong" };
  }
}

/**
 * A link like /go/acme-backend to put in one application. It redirects to `target` (a page
 * or the résumé PDF), and visits through it are credited to it.
 */
export async function createTrackingLink(label: string, target = "/", code?: string): Promise<Result<TrackingLink>> {
  return guarded(async () => {
    const clean = label.trim().slice(0, 60);
    if (!clean) throw new Error("Give the link a name, e.g. the company and role");
    if (!isLinkTarget(target)) throw new Error("Choose where the link should go");
    const store = getAnalytics();
    let base = slug(code?.trim() || clean);
    if (!base) throw new Error("The code needs letters or numbers");
    // Keep codes unique without asking: acme, acme-2, acme-3…
    let candidate = base;
    for (let n = 2; await store.hasLink(candidate); n++) candidate = `${base.slice(0, 36)}-${n}`;
    base = candidate;
    const link: TrackingLink = { code: base, label: clean, createdAt: new Date().toISOString(), target };
    await store.saveLink(link);
    return link;
  });
}

export async function deleteTrackingLink(code: string): Promise<Result> {
  if (!/^[a-z0-9-]{1,40}$/.test(code)) return { ok: false, error: "Invalid link" };
  return guarded(async () => {
    await getAnalytics().deleteLink(code);
    return null;
  });
}
