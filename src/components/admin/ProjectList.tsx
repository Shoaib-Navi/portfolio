"use client";

import Link from "next/link";
import { adminSrc } from "@/lib/admin/paths";
import type { Project } from "@/lib/content/schema";
import { IssueList, SaveBar } from "./fields";
import { Sortable } from "./Sortable";
import { move, useCollection } from "./useCollection";

/** Order of this list is the order on the site, and sets the "01", "02"… index. */
export function ProjectList({ initial }: { initial: Project[] }) {
  const f = useCollection("projects", initial);
  // Unverified projects are hidden on the site, so they don't take an index.
  const indexOf = new Map<string, string>();
  f.value.filter((p) => p.verified).forEach((p, i) => indexOf.set(p.slug, String(i + 1).padStart(2, "0")));
  return (
    <section className="card">
      <IssueList issues={f.issues} />
      {f.value.length ? (
        <Sortable
          items={f.value}
          keyOf={(p) => p.slug}
          onMove={(from, to) => f.setValue(move(f.value, from, to))}
          render={(p, _i, controls) => {
            const index = indexOf.get(p.slug) ?? "—";
            return (
              <div className="row">
                {controls}
                <span className="code" title="Index on the site">
                  {index}
                </span>
                {p.shots[0] ? <img className="thumb" src={adminSrc(p.shots[0])} alt="" /> : <span className="thumb" />}
                <span className="row__main">
                  <Link href={`/admin/projects/${p.slug}`}>{p.name}</Link>
                  <span className="muted">{p.tagline}</span>
                </span>
                {!p.verified ? <span className="pill pill--warn">Unverified</span> : null}
                {p.status ? <span className="pill pill--info">{p.status.split("·")[0].trim()}</span> : null}
                <Link href={`/admin/projects/${p.slug}`} className="btn btn--sm">
                  Edit
                </Link>
              </div>
            );
          }}
        />
      ) : (
        <p className="empty">No projects yet.</p>
      )}
      {f.dirty ? <SaveBar dirty={f.dirty} saving={f.saving} onSave={() => f.save(undefined, "New order saved")} onReset={f.reset} label="Save order" /> : null}
    </section>
  );
}
