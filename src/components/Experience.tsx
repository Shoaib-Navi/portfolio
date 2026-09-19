"use client";

import { useEffect, useId, useRef, useState } from "react";
import { prefersReducedMotion } from "@/lib/motion";
import Rich from "./Rich";
import type { Job } from "@/data/profile";

function JobCard({ job, onSeen }: { job: Job; onSeen: (slug: string) => void }) {
  const [open, setOpen] = useState(false);
  const bodyId = useId();
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && onSeen(job.slug)),
      { rootMargin: "-25% 0px -55% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [job.slug, onSeen]);

  return (
    <article ref={ref} className="job reveal" id={`job-${job.slug}`} data-job data-open={open ? "1" : "0"}>
      <p className="job__when">
        <b>{job.period}</b>
      </p>
      <h3>
        <button
          type="button"
          className="job__toggle"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() => setOpen((v) => !v)}
        >
          <span>
            {job.role} <span className="job__at">— {job.company}</span>
          </span>
          <span className="job__chev" aria-hidden />
          <span className="job__sr">{open ? "Hide details" : "Show details"}</span>
        </button>
      </h3>
      <div className="job__body" id={bodyId}>
        <>
          <ul className="job__points">
            {job.highlights.map((h) => (
              <li key={h}>
                <Rich text={h} />
              </li>
            ))}
          </ul>
          {job.stack.length > 0 && (
            <div className="s-chips">
              {job.stack.map((t) => (
                <span key={t} className="s-chip">
                  {t}
                </span>
              ))}
            </div>
          )}
        </>
      </div>
    </article>
  );
}

function showJob(slug: string) {
  const card = document.getElementById(`job-${slug}`);
  if (!card) return;
  card.scrollIntoView({ behavior: prefersReducedMotion() ? "instant" : "smooth", block: "start" });
  card.removeAttribute("data-flash");
  void card.offsetWidth;
  card.setAttribute("data-flash", "1");
  window.setTimeout(() => card.removeAttribute("data-flash"), 2100);
}

export default function Experience({ jobs }: { jobs: Job[] }) {
  const [active, setActive] = useState(jobs[0]?.slug ?? "");

  return (
    <div className="wrap xp__grid">
      <aside className="xp__index">
        <div className="section__head reveal">
          <p className="eyebrow">Experience</p>
          <h2>Where I&apos;ve been</h2>
        </div>
        <ol className="xp__list" aria-label="Roles">
          {jobs.map((job) => (
            <li key={job.slug}>
              <button
                type="button"
                className="xp__item"
                data-on={active === job.slug ? "1" : "0"}
                onClick={() => showJob(job.slug)}
              >
                <span className="xp__bullet" aria-hidden />
                <span>
                  <b>{job.company}</b>
                  <span>
                    {job.role} · {job.year}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ol>
      </aside>
      <div className="xp__detail">
        {jobs.map((job) => (
          <JobCard key={job.slug} job={job} onSeen={setActive} />
        ))}
      </div>
    </div>
  );
}
