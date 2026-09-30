import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Bar from "@/components/Bar";
import DocFoot from "@/components/DocFoot";
import { notes, profile } from "@/data/profile";
import { formatDay } from "@/lib/format";
import { headingsOf, Markdown, readingMinutes } from "@/lib/markdown";

type Params = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return notes.map((n) => ({ slug: n.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const note = notes.find((n) => n.slug === slug);
  if (!note) return {};
  return {
    title: note.title,
    description: note.summary,
    alternates: { canonical: `/notes/${slug}` },
    openGraph: { title: note.title, description: note.summary, type: "article", publishedTime: note.date },
  };
}

export default async function NotePage({ params }: Params) {
  const { slug } = await params;
  const note = notes.find((n) => n.slug === slug);
  if (!note) notFound();
  const toc = headingsOf(note.body).filter((h) => h.level === 2);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: note.title,
    description: note.summary,
    datePublished: note.date,
    author: { "@type": "Person", name: profile.name },
    keywords: note.tags.join(", "),
  };

  return (
    <div className="site">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\u003c") }} />
      <Bar back={{ href: "/notes", label: "All notes" }} />
      <div className="doc">
        <main>
          <article>
            <p className="doc__meta">
              {formatDay(note.date, "long")} · {readingMinutes(note.body)} min read
            </p>
            <h1 className="note__title">{note.title}</h1>
            {!note.verified ? (
              <p style={{ marginTop: "1rem" }}>
                <span className="draft-badge">Draft · hidden in production until verified</span>
              </p>
            ) : null}
            <p className="doc__lede">{note.summary}</p>

            <div className="doc__body">
              <div className="doc__main">
                <Markdown source={note.body} />
              </div>
              <aside className="doc__side">
                {toc.length > 1 ? (
                  <nav className="toc" aria-label="On this page">
                    <h2>On this page</h2>
                    <ol>
                      {toc.map((h) => (
                        <li key={h.id}>
                          <a href={`#${h.id}`}>{h.text}</a>
                        </li>
                      ))}
                    </ol>
                  </nav>
                ) : null}
                {note.tags.length ? (
                  <>
                    <h2>Topics</h2>
                    <div className="s-chips">
                      {note.tags.map((t) => (
                        <span key={t} className="s-chip">
                          {t}
                        </span>
                      ))}
                    </div>
                  </>
                ) : null}
                {note.project && note.projectName ? (
                  <div className="doc__links">
                    <Link href={`/work/${note.project}`}>
                      From the {note.projectName} write-up <span aria-hidden>→</span>
                    </Link>
                  </div>
                ) : null}
              </aside>
            </div>
          </article>
        </main>
        <DocFoot back={{ href: "/notes", label: "All notes" }} />
      </div>
    </div>
  );
}
