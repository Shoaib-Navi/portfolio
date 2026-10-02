import type { ReactNode } from "react";
import ArchitectureDiagram from "@/components/ArchitectureDiagram";
import Rich from "@/components/Rich";
import Shots from "@/components/Shots";
import type { Project } from "@/lib/content/schema";
import { Markdown, slugify } from "@/lib/markdown";

/**
 * A project write-up. The public /work/[slug] page and the admin preview both render this,
 * so the preview is exactly what will ship. `src` maps image paths (the admin points them
 * at draft files).
 */
export default function ProjectArticle({
  project,
  src = (p) => p,
  side,
}: {
  project: Project;
  src?: (path: string) => string;
  /** Extra sidebar content (e.g. the live-status check), rendered under the links */
  side?: ReactNode;
}) {
  const cs = project.caseStudy;
  const sections = cs?.sections.map((s) => ({ ...s, id: slugify(s.heading) })) ?? [];
  return (
    <article>
      <p className="doc__meta">{project.status ?? "Project"}</p>
      <h1>{project.name}</h1>
      <p className="doc__tag">{project.tagline}</p>
      <p className="doc__lede">{project.lede}</p>

      {project.shots.length > 0 ? (
        <Shots
          images={project.shots.map(src)}
          alt={`${project.name} screenshot`}
        />
      ) : (
        <div className="shots shots--pending">
          <span className="case__pending">No screenshot yet</span>
        </div>
      )}

      <div className="doc__body">
        <div className="doc__main">
          <section id="what-it-does">
            <h2>What it does</h2>
            <ul className="doc__points">
              {project.points.map((point) => (
                <li key={point.label}>
                  <strong>{point.label}:</strong> <Rich text={point.text} />
                </li>
              ))}
            </ul>
          </section>

          {cs ? (
            <div className="study" id="case-study">
              <p className="study__kicker">
                Case study
                {!cs.verified ? <span className="draft-badge">Draft · hidden in production until verified</span> : null}
              </p>
              {sections.map((s) => (
                <section key={s.id} id={s.id} className="study__section">
                  <h2>{s.heading}</h2>
                  <Markdown source={s.body} />
                  {s.diagram && cs.architecture ? (
                    <ArchitectureDiagram architecture={cs.architecture} title={`${project.name} architecture: request path and supporting services`} />
                  ) : null}
                </section>
              ))}
            </div>
          ) : null}
        </div>

        <aside className="doc__side">
          {cs ? (
            <nav className="toc" aria-label="On this page">
              <h2>On this page</h2>
              <ol>
                <li>
                  <a href="#what-it-does">What it does</a>
                </li>
                {sections.map((s) => (
                  <li key={s.id}>
                    <a href={`#${s.id}`}>{s.heading}</a>
                  </li>
                ))}
              </ol>
            </nav>
          ) : null}
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
          {side}
        </aside>
      </div>
    </article>
  );
}
