import Link from "next/link";
import ScrollToSection from "@/components/ScrollToSection";
import type { SectionId } from "@/lib/sections";
import Bar from "@/components/Bar";
import Experience from "@/components/Experience";
import SectionHead from "@/components/SectionHead";
import Tools from "@/components/Tools";
import BackToTop from "@/components/BackToTop";
import Footer from "@/components/Footer";
import {
  awards,
  education,
  experience,
  profile,
  projects,
  skills,
  stats,
} from "@/data/profile";

function Words({ text, bold }: { text: string; bold?: boolean }) {
  const words = text.split(" ").map((word, i) => (
    <span className="word" key={`${word}-${i}`}>
      <span style={{ animationDelay: `${0.5 + i * 0.035}s` }}>{word}</span>
    </span>
  ));
  const joined = words.map((w, i) => (
    <span key={i}>
      {w}
      {i < words.length - 1 ? " " : null}
    </span>
  ));
  return bold ? <b>{joined}</b> : <>{joined}</>;
}

export default function HomeView({ section }: { section?: SectionId }) {
  const { headline, about } = profile;

  return (
    <div className="site" id="top">
      <Bar />
      <ScrollToSection section={section} />

      <main>
        <section className="hero" data-hero>
          <div className="hero__grid" aria-hidden>
            <div className="hero__lines" aria-hidden />
            <div className="hero__glow" aria-hidden />
          </div>
          <div
            className="hero__light"
            data-hero-light
            data-on="0"
            aria-hidden
          />

          <div className="wrap hero__inner">
            <p className="eyebrow hero__eyebrow">{profile.location}</p>

            <h1 className="name">
              {profile.name.split(" ").map((part) => (
                <span className="name__line" key={part}>
                  <span>{part}</span>
                </span>
              ))}
            </h1>

            <p className="headline">
              <Words text={headline.lead} />{" "}
              <Words text={headline.emphasis} bold />{" "}
              <Words text={headline.tail} />
            </p>

            <div className="hero__actions">
              <Link className="cta" href="/work">
                <span className="cta__fill" aria-hidden />
                <span className="cta__text">See the work</span>
                <span className="cta__icon" aria-hidden>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      d="M3 8h10M9 4l4 4-4 4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </Link>
              <a className="ghost" href={`mailto:${profile.email}`}>
                <span className="ghost__dot" aria-hidden />
                Email me
              </a>
            </div>

            <ul className="s-stats">
              {stats.map((s) => (
                <li key={s.label}>
                  {s.count !== undefined ? (
                    <b
                      data-count={s.count}
                      data-dec={s.dec ?? 0}
                      data-group={s.group ? "1" : "0"}
                    >
                      {s.value}
                    </b>
                  ) : (
                    <b>{s.value}</b>
                  )}
                  <span>{s.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="about" id="about">
          <div className="wrap">
            <SectionHead kicker="About" title="Hi there!" />
            <div className="about__grid">
              <div className="portrait reveal">
                <img
                  src={profile.photo.src}
                  alt={profile.name}
                  width={profile.photo.width}
                  height={profile.photo.height}
                />
              </div>
              <div>
                <p className="about__lede reveal">{about.lede}</p>
                <div className="about__notes reveal">
                  {about.notes.map((n) => (
                    <p key={n}>{n}</p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="skills" id="skills">
          <div className="wrap">
            <SectionHead kicker="Toolbox" title="What I build with" />
            <div className="skills__grid">
              {skills.map((group) => (
                <Tools key={group.label} group={group} />
              ))}
            </div>
          </div>
        </section>

        <section id="experience">
          <Experience jobs={experience} />
        </section>

        <section className="work" id="work">
          <div className="wrap">
            <SectionHead
              kicker="Selected work"
              title="Three things worth opening"
              lede="Each of these has a full write-up — highlights, stack and links."
            />
            <div className="cases">
              {projects.map((p) => (
                <article className="case reveal" key={p.slug}>
                  <Link
                    className={
                      p.shots.length > 0
                        ? "case__shot"
                        : "case__shot case__shot--none"
                    }
                    href={`/work/${p.slug}`}
                    tabIndex={-1}
                    aria-hidden
                  >
                    {p.shots.length > 0 ? (
                      <img
                        src={p.shots[0]}
                        alt=""
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <span className="case__pending">No screenshot yet</span>
                    )}
                  </Link>
                  <div>
                    <p className="case__no">
                      {p.index}
                      {p.status ? ` · ${p.status}` : ""}
                    </p>
                    <h3>{p.name}</h3>
                    <p className="case__tag">{p.tagline}</p>
                    <p className="case__lede">{p.lede}</p>
                    <div className="s-chips">
                      {p.stack.map((t) => (
                        <span className="s-chip" key={t}>
                          {t}
                        </span>
                      ))}
                    </div>
                    <Link className="case__go" href={`/work/${p.slug}`}>
                      Read the write-up <span aria-hidden>→</span>
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section>
          <div className="wrap">
            <SectionHead kicker="The rest of it" title="Education and awards" />
            <div className="creds">
              <div className="cred reveal">
                <h3>Education</h3>
                <ul>
                  {education.map((e) => (
                    <li key={e.title}>
                      <b>{e.title}</b>
                      <span>{e.org}</span>
                      <span>{e.detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="cred reveal">
                <h3>Awards</h3>
                <ul>
                  {awards.map((a) => (
                    <li key={a.title}>
                      {a.href ? (
                        <a
                          href={a.href}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <b>{a.title}</b>
                          <span>{a.detail}</span>
                        </a>
                      ) : (
                        <>
                          <b>{a.title}</b>
                          <span>{a.detail}</span>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="closer" id="contact">
          <div className="closer__field" aria-hidden />
          <div className="wrap closer__inner">
            <h2>
              <span style={{ display: "block" }}>Let&apos;s build</span>
              <span style={{ display: "block" }}>something.</span>
            </h2>
            <a className="closer__mail" href={`mailto:${profile.email}`}>
              {profile.email}
            </a>
            <div className="closer__links">
              {profile.links.map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {l.label} <span aria-hidden>{l.icon}</span>
                </a>
              ))}
            </div>
          </div>
        </section>
      </main>

      <BackToTop />
      <Footer />
    </div>
  );
}
