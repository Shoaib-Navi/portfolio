"use client";

import type { Award, Education } from "@/lib/content/schema";
import { Checkbox, IssueList, RestoreBanner, RichField, SaveBar, TextField } from "./fields";
import { ListField } from "./ListField";
import { useCollection } from "./useCollection";

export function EducationEditor({ initial }: { initial: Education[] }) {
  const f = useCollection("education", initial);
  return (
    <section className="card">
      <div className="card__head">
        <h2>Education</h2>
      </div>
      {f.restorable ? <RestoreBanner at={f.restorable.at} onRestore={f.restore} onDrop={f.dropRestorable} /> : null}
      <IssueList issues={f.issues} shown={f.value.flatMap((_, i) => [`[${i}].title`, `[${i}].org`, `[${i}].detail`])} />
      <ListField
        label="Entries"
        items={f.value}
        onChange={f.setValue}
        blank={() => ({ title: "", org: "", detail: "" })}
        addLabel="+ Add education"
        max={6}
        render={(e, update, i) => (
          <>
            <TextField label="Title" value={e.title} onChange={(title) => update({ ...e, title })} error={f.issueAt(`[${i}].title`)} placeholder="B.Tech, Information Technology" />
            <TextField label="Institution" value={e.org} onChange={(org) => update({ ...e, org })} error={f.issueAt(`[${i}].org`)} />
            <TextField label="Detail" value={e.detail} onChange={(detail) => update({ ...e, detail })} error={f.issueAt(`[${i}].detail`)} placeholder="CGPA 8.05/10 · 2023 – 2027" />
          </>
        )}
      />
      <SaveBar dirty={f.dirty} saving={f.saving} onSave={() => f.save()} onReset={f.reset} inline />
    </section>
  );
}

export function AwardsEditor({ initial }: { initial: Award[] }) {
  const f = useCollection("awards", initial);
  return (
    <section className="card">
      <div className="card__head">
        <h2>Awards & certifications</h2>
      </div>
      {f.restorable ? <RestoreBanner at={f.restorable.at} onRestore={f.restore} onDrop={f.dropRestorable} /> : null}
      <IssueList issues={f.issues} shown={f.value.flatMap((_, i) => [`[${i}].title`, `[${i}].detail`, `[${i}].href`])} />
      <ListField
        label="Entries"
        items={f.value}
        onChange={f.setValue}
        blank={(): Award => ({ title: "", detail: "", verified: false })}
        addLabel="+ Add award"
        max={12}
        render={(a, update, i) => (
          <>
            <TextField label="Title" value={a.title} onChange={(title) => update({ ...a, title })} error={f.issueAt(`[${i}].title`)} />
            <RichField label="Detail" value={a.detail} onChange={(detail) => update({ ...a, detail })} error={f.issueAt(`[${i}].detail`)} rows={2} max={300} rich={false} />
            <TextField
              label="Link (optional)"
              value={a.href ?? ""}
              onChange={(href) => update({ ...a, href: href || undefined })}
              error={f.issueAt(`[${i}].href`)}
              mono
              placeholder="https://"
            />
            <Checkbox label="Verified" checked={a.verified} onChange={(verified) => update({ ...a, verified })} />
          </>
        )}
      />
      <SaveBar dirty={f.dirty} saving={f.saving} onSave={() => f.save()} onReset={f.reset} inline />
    </section>
  );
}
