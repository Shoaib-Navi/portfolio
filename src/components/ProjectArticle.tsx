import Rich from "@/components/Rich";
import Shots from "@/components/Shots";
import type { Project } from "@/lib/content/schema";

/**
 * A project write-up. The public /work/[slug] page and the admin preview both render this,
 * so the preview is exactly what will ship. `src` maps image paths (the admin points them
 * at draft files).
 */
export default function ProjectArticle({ project, src = (p) => p }: { project: Project; src?: (path: string) => string }) {
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
  );
}
