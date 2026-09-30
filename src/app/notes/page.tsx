import type { Metadata } from "next";
import Link from "next/link";
import Bar from "@/components/Bar";
import DocFoot from "@/components/DocFoot";
import { notes } from "@/data/profile";
import { formatDay } from "@/lib/format";
import { readingMinutes } from "@/lib/markdown";

const LEDE = "Write-ups of engineering problems from real projects: what broke, why, and what changed.";

export const metadata: Metadata = {
  title: "Notes",
  description: LEDE,
  alternates: { canonical: "/notes" },
};

export default function NotesIndex() {
  return (
    <div className="site">
      <Bar back={{ href: "/", label: "Home" }} />
      <div className="doc">
        <main>
          <p className="doc__meta">
            {notes.length} note{notes.length === 1 ? "" : "s"}
          </p>
          <h1>Notes</h1>
          <p className="doc__lede">{LEDE}</p>
          {notes.length ? (
            <div className="doc__list">
              {notes.map((n) => (
                <Link key={n.slug} className="doc__row note-row" href={`/notes/${n.slug}`}>
                  <span className="doc__rowno">{formatDay(n.date, "axis")}</span>
                  <span>
                    <h2>
                      {n.title}
                      {!n.verified ? <span className="draft-badge">Draft</span> : null}
                    </h2>
                    <p>{n.summary}</p>
                    <span className="note-row__meta">
                      {readingMinutes(n.body)} min read
                      {n.tags.length ? ` · ${n.tags.join(" · ")}` : ""}
                    </span>
                  </span>
                  <span className="doc__rowgo" aria-hidden>
                    →
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="doc__empty">No notes published yet.</p>
          )}
        </main>
        <DocFoot back={{ href: "/", label: "Home" }} />
      </div>
    </div>
  );
}
