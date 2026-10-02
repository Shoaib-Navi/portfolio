import type { Metadata } from "next";
import { PublishPanel, type Review } from "@/components/admin/PublishPanel";
import { LoadError, PageHead } from "@/components/admin/ui";
import { errorText } from "@/lib/admin/data";
import { lineDiff } from "@/lib/admin/diff";
import { adminSrc } from "@/lib/admin/paths";
import { getStore, type DeployState } from "@/lib/admin/store";

export const metadata: Metadata = { title: "Publish" };

const decode = (b: Uint8Array | null) => (b ? new TextDecoder().decode(b) : "");

/** "content: projects, skills; 2 files" */
function suggestMessage(paths: string[]) {
  const collections = paths.filter((p) => p.startsWith("content/")).map((p) => p.slice(8, -5));
  const files = paths.filter((p) => p.startsWith("public/")).length;
  const parts = [collections.length ? collections.join(", ") : null, files ? `${files} file${files === 1 ? "" : "s"}` : null].filter(Boolean);
  return `content: update ${parts.join("; ") || "site"}`;
}

export default async function PublishPage() {
  const store = getStore();
  try {
    const [pending, commits] = await Promise.all([store.pending(), store.history(8)]);
    const reviews: Review[] = await Promise.all(
      pending.map(async (p): Promise<Review> => {
        const publicPath = p.path.replace(/^public/, "");
        if (/\.(json|svg)$/.test(p.path)) {
          const [before, after] = await Promise.all([p.kind === "added" ? null : store.readLive(p.path), p.kind === "deleted" ? null : store.read(p.path)]);
          if (p.path.endsWith(".json")) return { ...p, diff: lineDiff(decode(before), decode(after)) };
        }
        if (/\.(webp|png|jpe?g|svg)$/.test(p.path)) {
          return {
            ...p,
            image: {
              // The live file is served by the deployed site; the new one only exists in the draft.
              before: p.kind === "added" ? null : publicPath,
              after: p.kind === "deleted" ? null : adminSrc(publicPath),
            },
          };
        }
        return p;
      }),
    );
    const history = await Promise.all(
      commits.map(async (c) => ({ ...c, state: (await store.deployState(c.sha).catch(() => "unknown")) as DeployState })),
    );
    return (
      <>
        <PageHead crumb={[{ label: "Site" }]} title="Review & publish">
          Saved edits live in a draft until you publish them here.
        </PageHead>
        <PublishPanel reviews={reviews} history={history} mode={store.mode} suggested={suggestMessage(pending.map((p) => p.path))} />
      </>
    );
  } catch (e) {
    return (
      <>
        <PageHead title="Publish" />
        <LoadError message={errorText(e)} />
      </>
    );
  }
}
