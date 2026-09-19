import type { Metadata } from "next";
import Link from "next/link";
import Bar from "@/components/Bar";
import DocFoot from "@/components/DocFoot";
import { projects } from "@/data/profile";

const LEDE = "Every project, as its own page — linkable, indexable, and readable without JavaScript.";

export const metadata: Metadata = {
  title: "Work",
  description: LEDE,
  alternates: { canonical: "/work" },
};

export default function WorkIndex() {
  return (
    <div className="site">
      <Bar back={{ href: "/", label: "Home" }} />
      <div className="doc">
        <main>
          <p className="doc__meta">{projects.length} projects</p>
          <h1>Work</h1>
          <p className="doc__lede">{LEDE}</p>
          <div className="doc__list">
            {projects.map((p) => (
              <Link key={p.slug} className="doc__row" href={`/work/${p.slug}`}>
                <span className="doc__rowno">{p.index}</span>
                <span>
                  <h2>{p.name}</h2>
                  <p>{p.tagline}</p>
                </span>
                <span className="doc__rowgo" aria-hidden>
                  →
                </span>
              </Link>
            ))}
          </div>
        </main>
        <DocFoot back={{ href: "/", label: "Home" }} />
      </div>
    </div>
  );
}
