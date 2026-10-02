import { COLLECTIONS, collectionPath } from "@/lib/content/schema";
import type { Store } from "./store";

export const MEDIA_FOLDERS = ["pfp", "shots", "logos", "resumes"] as const;

/** Public paths ("/logos/x.svg") that some content file still points at, with where. */
export async function assetUsage(store: Store): Promise<Map<string, string[]>> {
  const usage = new Map<string, string[]>();
  for (const name of COLLECTIONS) {
    const raw = await store.read(collectionPath(name));
    if (!raw) continue;
    for (const m of new TextDecoder().decode(raw).matchAll(/"(\/(?:logos|shots|pfp|resumes)\/[^"]+)"/g)) {
      const list = usage.get(m[1]) ?? [];
      if (!list.includes(name)) list.push(name);
      usage.set(m[1], list);
    }
  }
  return usage;
}
