import type { Architecture } from "@/lib/content/schema";

/**
 * The request path drawn top to bottom (client → API → database), with the things that
 * run alongside it (jobs, CI) in a side column. Plain HTML and CSS, so it reflows on small
 * screens, reads with a screen reader as nested lists, and needs no JavaScript.
 */
export default function ArchitectureDiagram({ architecture, title }: { architecture: Architecture; title: string }) {
  return (
    <figure className="arch" aria-label={title}>
      <ol className="arch__flow">
        {architecture.layers.map((layer, i) => (
          <li key={layer.label} className="arch__layer">
            {i > 0 ? <span className="arch__arrow" aria-hidden /> : null}
            <p className="arch__label">{layer.label}</p>
            <ul className="arch__nodes">
              {layer.nodes.map((n) => (
                <li key={n.label} className="arch__node">
                  <b>{n.label}</b>
                  {n.detail ? <span>{n.detail}</span> : null}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
      {architecture.aside.length ? (
        <ul className="arch__aside" aria-label="Alongside the request path">
          {architecture.aside.map((layer) => (
            <li key={layer.label} className="arch__layer arch__layer--aside">
              <p className="arch__label">{layer.label}</p>
              <ul className="arch__nodes">
                {layer.nodes.map((n) => (
                  <li key={n.label} className="arch__node">
                    <b>{n.label}</b>
                    {n.detail ? <span>{n.detail}</span> : null}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      ) : null}
      <figcaption className="arch__caption">{title}</figcaption>
    </figure>
  );
}
