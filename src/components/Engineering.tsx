import Link from "next/link";
import Rich from "@/components/Rich";
import SectionHead from "@/components/SectionHead";
import { practices } from "@/data/profile";

/** How the work is built: each practice backed by specific, checkable evidence. */
export default function Engineering() {
  if (!practices.length) return null;
  return (
    <section className="engineering" id="engineering">
      <div className="wrap">
        <SectionHead
          kicker="How I work"
          title="Engineering, with evidence"
          lede="Practices from real projects. Each one is backed by something you can check in the write-ups."
        />
        <div className="practices">
          {practices.map((p) => (
            <article className="practice reveal" key={p.area}>
              <h3>{p.area}</h3>
              <p className="practice__sum">{p.summary}</p>
              <ul>
                {p.evidence.map((e) => (
                  <li key={e.text}>
                    <p>
                      <Rich text={e.text} />
                    </p>
                    {e.href ? (
                      <Link className="practice__src" href={e.href}>
                        {e.label} <span aria-hidden>→</span>
                      </Link>
                    ) : (
                      <span className="practice__src practice__src--plain">{e.label}</span>
                    )}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
