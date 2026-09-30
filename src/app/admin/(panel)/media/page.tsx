import type { Metadata } from "next";
import { MediaGrid } from "@/components/admin/MediaGrid";
import { LoadError, PageHead } from "@/components/admin/ui";
import { errorText } from "@/lib/admin/data";
import { getStore } from "@/lib/admin/store";
import { assetUsage, MEDIA_FOLDERS } from "@/lib/admin/usage";

export const metadata: Metadata = { title: "Media library" };

const TITLES: Record<(typeof MEDIA_FOLDERS)[number], string> = {
  pfp: "Portraits",
  shots: "Screenshots",
  logos: "Logos",
  resumes: "Résumé versions",
};

export default async function MediaPage() {
  const store = getStore();
  try {
    const [usage, ...lists] = await Promise.all([assetUsage(store), ...MEDIA_FOLDERS.map((f) => store.list(`public/${f}`))]);
    const unused = MEDIA_FOLDERS.reduce((n, folder, i) => n + lists[i].filter((name) => !usage.has(`/${folder}/${name}`)).length, 0);
    return (
      <>
        <PageHead crumb={[{ label: "Files" }]} title="Media library">
          Every uploaded file and where it’s used. Files still in use can’t be deleted.
          {unused ? ` ${unused} file${unused === 1 ? " is" : "s are"} unused.` : ""}
        </PageHead>
        <div className="stack">
          {MEDIA_FOLDERS.map((folder, i) => (
            <section key={folder} className="card">
              <div className="card__head">
                <h2>{TITLES[folder]}</h2>
                <span className="muted">
                  /{folder}/ · {lists[i].length}
                </span>
              </div>
              <MediaGrid items={lists[i].map((name) => ({ path: `/${folder}/${name}`, usedBy: usage.get(`/${folder}/${name}`) ?? [] }))} />
            </section>
          ))}
        </div>
      </>
    );
  } catch (e) {
    return (
      <>
        <PageHead title="Media library" />
        <LoadError message={errorText(e)} />
      </>
    );
  }
}
