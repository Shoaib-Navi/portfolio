import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Bar from "@/components/Bar";
import DocFoot from "@/components/DocFoot";
import Rich from "@/components/Rich";
import Shots from "@/components/Shots";
import { profile, projects } from "@/data/profile";

type Params = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const project = projects.find((p) => p.slug === slug);
  if (!project) return {};
  const title = `${project.name} — ${project.tagline}`;
  return {
    title,
    description: project.lede,
    alternates: { canonical: `/work/${slug}` },
    openGraph: { title, description: project.lede },
  };
}

export default async function ProjectPage({ params }: Params) {
  const { slug } = await params;
  const project = projects.find((p) => p.slug === slug);
  if (!project) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: project.name,
    headline: project.tagline,
    description: project.lede,
    author: { "@type": "Person", name: profile.name },
    keywords: project.stack.join(", "),
  };

  return (
    <div className="site">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <Bar back={{ href: "/work", label: "All work" }} />

      <div className="doc">
        <main>
          <article>
            <p className="doc__meta">{project.status ?? "Project"}</p>
            <h1>{project.name}</h1>
            <p className="doc__tag">{project.tagline}</p>
            <p className="doc__lede">{project.lede}</p>

            {project.shots.length > 0 ? (
              <Shots
                images={project.shots}
                alt={`${project.name} screenshot`}
              />
            ) : (
              <div className="shots shots--pending">
                <span className="case__pending">No screenshot yet</span>
              </div>
            )}

            <div className="doc__body">
              <section>
                <h2>What it does</h2>
                <ul className="doc__points">
                  {project.points.map((point) => (
                    <li key={point.label}>
                      <strong>{point.label}:</strong> <Rich text={point.text} />
                    </li>
                  ))}
                </ul>
              </section>

              <aside className="doc__side">
                <h2>Built with</h2>
                <div className="s-chips">
                  {project.stack.map((t) => (
                    <span key={t} className="s-chip">
                      {t}
                    </span>
                  ))}
                </div>
                {(project.links.length > 0 || project.note) && (
                  <div className="doc__links">
                    {project.links.map((l) => (
                      <a
                        key={l.label}
                        href={l.href}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {l.label} <span aria-hidden>↗</span>
                      </a>
                    ))}
                    {project.note && (
                      <p className="doc__note">{project.note}</p>
                    )}
                  </div>
                )}
              </aside>
            </div>
          </article>
        </main>
        <DocFoot back={{ href: "/work", label: "Back to all work" }} />
      </div>
    </div>
  );
}
