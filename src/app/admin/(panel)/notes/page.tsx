import type { Metadata } from "next";
import Link from "next/link";
import { LoadError, PageHead } from "@/components/admin/ui";
import { errorText, load } from "@/lib/admin/data";
import { formatDay } from "@/lib/format";
import { readingMinutes } from "@/lib/markdown";

export const metadata: Metadata = { title: "Notes" };

export default async function NotesAdmin() {
  try {
    const { notes } = await load(["notes"]);
    const sorted = [...notes].sort((a, b) => b.date.localeCompare(a.date));
    return (
      <>
        <PageHead
          crumb={[{ label: "Content" }]}
          title="Notes"
          actions={
            <Link href="/admin/notes/new" className="btn btn--pri">
              + New note
            </Link>
          }
        >
          Technical articles at /notes, newest first. Drafts stay hidden on the live site until verified.
        </PageHead>
        <section className="card">
          {sorted.length ? (
            <ul className="rows">
              {sorted.map((n) => (
                <li key={n.slug} className="row">
                  <span className="row__main">
                    <Link href={`/admin/notes/${n.slug}`} title={n.title}>
                      {n.title}
                    </Link>
                    <span className="muted">
                      {formatDay(n.date)} · {readingMinutes(n.body)} min read{n.tags.length ? ` · ${n.tags.join(", ")}` : ""}
                    </span>
                  </span>
                  <span className="row__end">
                    {n.verified ? <span className="pill pill--ok">Published</span> : <span className="pill pill--warn">Draft</span>}
                    <Link href={`/admin/notes/${n.slug}`} className="btn btn--sm">
                      Edit
                    </Link>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty">No notes yet.</p>
          )}
        </section>
      </>
    );
  } catch (e) {
    return (
      <>
        <PageHead title="Notes" />
        <LoadError message={errorText(e)} />
      </>
    );
  }
}
