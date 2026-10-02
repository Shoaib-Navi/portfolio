"use client";

import type { Profile, Stat } from "@/lib/content/schema";
import { Checkbox, IssueList, NumberField, RestoreBanner, RichField, SaveBar, TextField } from "./fields";
import { ListField } from "./ListField";
import { useCollection } from "./useCollection";

export function ProfileEditor({ initial }: { initial: Profile }) {
  const f = useCollection("profile", initial);
  const p = f.value;
  const set = (patch: Partial<Profile>) => f.setValue({ ...p, ...patch });
  // The photo is changed from its own card; always save the server's latest value for it.
  const save = () => f.save({ ...p, photo: initial.photo });

  return (
    <>
      {f.restorable ? <RestoreBanner at={f.restorable.at} onRestore={f.restore} onDrop={f.dropRestorable} /> : null}
      <IssueList
        issues={f.issues}
        shown={["name", "initials", "role", "location", "email", "headline.lead", "headline.emphasis", "headline.tail", "about.lede"]}
      />
      <section className="card">
        <div className="card__head">
          <h2>Identity</h2>
        </div>
        <div className="fields">
          <TextField label="Name" value={p.name} onChange={(name) => set({ name })} error={f.issueAt("name")} max={80} />
          <TextField
            label="Initials"
            value={p.initials}
            onChange={(initials) => set({ initials })}
            error={f.issueAt("initials")}
            hint="Shown in the monogram"
            max={3}
          />
          <TextField label="Role" value={p.role} onChange={(role) => set({ role })} error={f.issueAt("role")} max={80} />
          <TextField label="Location" value={p.location} onChange={(location) => set({ location })} error={f.issueAt("location")} max={80} />
          <TextField label="Email" type="email" value={p.email} onChange={(email) => set({ email })} error={f.issueAt("email")} />
        </div>
      </section>

      <section className="card">
        <div className="card__head">
          <h2>Hero headline</h2>
          <p>Three parts; the middle one is set in bold on the site.</p>
        </div>
        <TextField
          label="Lead"
          value={p.headline.lead}
          onChange={(lead) => set({ headline: { ...p.headline, lead } })}
          error={f.issueAt("headline.lead")}
          max={80}
        />
        <TextField
          label="Emphasis (bold)"
          value={p.headline.emphasis}
          onChange={(emphasis) => set({ headline: { ...p.headline, emphasis } })}
          error={f.issueAt("headline.emphasis")}
          max={120}
        />
        <TextField
          label="Tail"
          value={p.headline.tail}
          onChange={(tail) => set({ headline: { ...p.headline, tail } })}
          error={f.issueAt("headline.tail")}
          max={160}
        />
        <div className="field">
          <span className="field__label">Preview</span>
          <p className="preview" style={{ fontSize: "1.25rem", lineHeight: 1.25, color: "var(--ink)", letterSpacing: "-0.01em" }}>
            {p.headline.lead} <strong>{p.headline.emphasis}</strong> {p.headline.tail}
          </p>
        </div>
      </section>

      <section className="card">
        <div className="card__head">
          <h2>About</h2>
        </div>
        <RichField
          label="Lede"
          value={p.about.lede}
          onChange={(lede) => set({ about: { ...p.about, lede } })}
          error={f.issueAt("about.lede")}
          max={300}
          rich={false}
        />
        <ListField
          label="Notes"
          items={p.about.notes}
          onChange={(notes) => set({ about: { ...p.about, notes } })}
          blank={() => ""}
          addLabel="+ Add note"
          max={8}
          render={(note, update, i) => (
            <RichField label={`Note ${i + 1}`} value={note} onChange={update} error={f.issueAt(`about.notes[${i}]`)} rows={2} max={300} rich={false} />
          )}
        />
      </section>

      <section className="card">
        <div className="card__head">
          <h2>Links</h2>
          <p>Shown in the footer and the contact section. Must be https.</p>
        </div>
        <ListField
          label="Social links"
          items={p.links}
          onChange={(links) => set({ links })}
          blank={() => ({ label: "", href: "https://", icon: "↗" })}
          addLabel="+ Add link"
          max={8}
          render={(link, update, i) => (
            <div className="fields">
              <TextField label="Label" value={link.label} onChange={(label) => update({ ...link, label })} error={f.issueAt(`links[${i}].label`)} />
              <TextField label="URL" value={link.href} onChange={(href) => update({ ...link, href })} error={f.issueAt(`links[${i}].href`)} mono />
            </div>
          )}
        />
      </section>

      <SaveBar dirty={f.dirty} saving={f.saving} onSave={save} onReset={f.reset} />
    </>
  );
}

export function StatsEditor({ initial }: { initial: Stat[] }) {
  const f = useCollection("stats", initial);
  return (
    <section className="card">
      <div className="card__head">
        <h2>Hero stats</h2>
        <p>Set “Count to” for numbers that animate up when scrolled into view.</p>
      </div>
      {f.restorable ? <RestoreBanner at={f.restorable.at} onRestore={f.restore} onDrop={f.dropRestorable} /> : null}
      <IssueList issues={f.issues} shown={f.value.flatMap((_, i) => [`[${i}].value`, `[${i}].label`, `[${i}].count`, `[${i}].dec`])} />
      <ListField
        label="Stats"
        items={f.value}
        onChange={f.setValue}
        blank={(): Stat => ({ value: "", label: "" })}
        addLabel="+ Add stat"
        max={6}
        render={(s, update, i) => (
          <>
            <TextField label="Label" value={s.label} onChange={(label) => update({ ...s, label })} error={f.issueAt(`[${i}].label`)} />
            <div className="fields fields--sm">
              <TextField label="Shown as" value={s.value} onChange={(value) => update({ ...s, value })} error={f.issueAt(`[${i}].value`)} placeholder="1,709" />
              <NumberField label="Count to" value={s.count} onChange={(count) => update({ ...s, count })} error={f.issueAt(`[${i}].count`)} />
              <NumberField label="Decimals" value={s.dec} onChange={(dec) => update({ ...s, dec })} error={f.issueAt(`[${i}].dec`)} />
            </div>
            <Checkbox label="Group thousands (1,709)" checked={Boolean(s.group)} onChange={(group) => update({ ...s, group: group || undefined })} />
          </>
        )}
      />
      <SaveBar dirty={f.dirty} saving={f.saving} onSave={() => f.save()} onReset={f.reset} inline />
    </section>
  );
}
