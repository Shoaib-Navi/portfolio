"use client";

import type { Evidence, Practice } from "@/lib/content/schema";
import { Checkbox, IssueList, RestoreBanner, RichField, SaveBar, TextField } from "./fields";
import { ListField } from "./ListField";
import { useCollection } from "./useCollection";

/** The home page's "Engineering, with evidence" section. */
export function EngineeringEditor({ initial, projects }: { initial: Practice[]; projects: { slug: string; name: string }[] }) {
  const f = useCollection("practices", initial);
  const sources = [...projects.map((p) => ({ value: p.slug, label: p.name })), { value: "site", label: "This site" }];

  return (
    <>
      {f.restorable ? <RestoreBanner at={f.restorable.at} onRestore={f.restore} onDrop={f.dropRestorable} /> : null}
      <IssueList issues={f.issues.filter((i) => !/\.evidence\[\d+\]\.(text|source)$|\.(area|summary)$/.test(i.path))} />
      <section className="card">
        <ListField
          label="Practices"
          items={f.value}
          onChange={f.setValue}
          blank={(): Practice => ({ area: "", summary: "", evidence: [{ text: "", source: "site" }], verified: false })}
          addLabel="+ Add practice"
          max={12}
          render={(p, update, i) => {
            const err = (k: string) => f.issueAt(`[${i}].${k}`);
            return (
              <>
                <div className="fields">
                  <TextField label="Area" value={p.area} onChange={(area) => update({ ...p, area })} error={err("area")} max={30} placeholder="Testing" />
                  <TextField label="Summary" value={p.summary} onChange={(summary) => update({ ...p, summary })} error={err("summary")} max={200} />
                </div>
                <ListField
                  label="Evidence"
                  hint="Specific and checkable. Each item links to the project it comes from."
                  items={p.evidence}
                  onChange={(evidence) => update({ ...p, evidence })}
                  blank={(): Evidence => ({ text: "", source: sources[0]?.value ?? "site" })}
                  addLabel="+ Add evidence"
                  max={6}
                  render={(e, set, j) => (
                    <>
                      <RichField label="Text" value={e.text} onChange={(text) => set({ ...e, text })} error={err(`evidence[${j}].text`)} rows={2} max={300} />
                      <div className="field">
                        <label htmlFor={`src-${i}-${j}`}>Source</label>
                        <select id={`src-${i}-${j}`} className="input" value={e.source} onChange={(ev) => set({ ...e, source: ev.target.value })}>
                          {sources.map((s) => (
                            <option key={s.value} value={s.value}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}
                />
                <Checkbox label="Verified" hint="Unverified practices never appear on the site." checked={p.verified} onChange={(verified) => update({ ...p, verified })} />
              </>
            );
          }}
        />
      </section>
      <SaveBar dirty={f.dirty} saving={f.saving} onSave={() => f.save()} onReset={f.reset} />
    </>
  );
}
