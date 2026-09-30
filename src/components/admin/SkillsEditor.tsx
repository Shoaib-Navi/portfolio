"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { addDeviconLogo, searchLogos, uploadLogo } from "@/app/admin/actions";
import type { DeviconHit } from "@/lib/admin/devicon";
import { adminSrc } from "@/lib/admin/paths";
import type { SkillGroup, Tool } from "@/lib/content/schema";
import { IssueList, RestoreBanner, SaveBar, TextField } from "./fields";
import { Sortable } from "./Sortable";
import { useToast } from "./Toasts";
import { move, removeAt, replaceAt, useCollection } from "./useCollection";

const CDN = "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons";

type LogoChoice =
  | { kind: "keep" }
  | { kind: "none" }
  | { kind: "devicon"; name: string; variant: string }
  | { kind: "upload"; file: File; preview: string };

type Target = { group: number; tool: number } | null;

export function SkillsEditor({ initial }: { initial: SkillGroup[] }) {
  const f = useCollection("skills", initial);
  const groups = f.value;
  const [target, setTarget] = useState<Target>(null);
  const setGroups = (next: SkillGroup[]) => f.setValue(next);
  const updateGroup = (i: number, g: SkillGroup) => setGroups(replaceAt(groups, i, g));

  return (
    <>
      {f.restorable ? <RestoreBanner at={f.restorable.at} onRestore={f.restore} onDrop={f.dropRestorable} /> : null}
      <IssueList issues={f.issues} shown={groups.map((_, i) => `[${i}].label`)} />
      <div className="grid grid--main">
        <div className="stack">
          <Sortable
            items={groups}
            keyOf={(_, i) => String(i)}
            onMove={(a, b) => setGroups(move(groups, a, b))}
            render={(g, gi, controls) => (
              <section className="card" style={{ marginBottom: 14 }}>
                <div className="card__head" style={{ alignItems: "flex-start" }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {controls}
                    <input
                      className="input"
                      style={{ fontWeight: 700, flex: "1 1 8rem", minWidth: 0, maxWidth: 320 }}
                      aria-label="Group name"
                      value={g.label}
                      aria-invalid={f.issueAt(`[${gi}].label`) ? true : undefined}
                      onChange={(e) => updateGroup(gi, { ...g, label: e.target.value })}
                    />
                  </div>
                  <span className="adm-actions">
                    <span className="muted">{g.tools.length} skills</span>
                    <button
                      type="button"
                      className="btn btn--sm btn--ghost btn--danger"
                      disabled={g.tools.length > 0}
                      title={g.tools.length ? "Move or remove its skills first" : "Remove group"}
                      onClick={() => setGroups(removeAt(groups, gi))}
                    >
                      Remove group
                    </button>
                  </span>
                </div>
                <div className="chips">
                  {g.tools.map((t, ti) => (
                    <span key={t.name} className={`chip${t.logo ? "" : " chip--text"}${target?.group === gi && target.tool === ti ? " chip--on" : ""}`}>
                      {t.logo ? <img src={adminSrc(t.logo)} alt="" /> : null}
                      <button type="button" style={{ color: "inherit", padding: 0 }} onClick={() => setTarget({ group: gi, tool: ti })} title="Edit">
                        {t.name}
                      </button>
                      <button type="button" aria-label={`Move ${t.name} left`} disabled={ti === 0} onClick={() => updateGroup(gi, { ...g, tools: move(g.tools, ti, ti - 1) })}>
                        ‹
                      </button>
                      <button
                        type="button"
                        aria-label={`Move ${t.name} right`}
                        disabled={ti === g.tools.length - 1}
                        onClick={() => updateGroup(gi, { ...g, tools: move(g.tools, ti, ti + 1) })}
                      >
                        ›
                      </button>
                      <button
                        type="button"
                        aria-label={`Remove ${t.name}`}
                        onClick={() => {
                          updateGroup(gi, { ...g, tools: removeAt(g.tools, ti) });
                          setTarget(null);
                        }}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {!g.tools.length ? <span className="muted">No skills in this group.</span> : null}
                </div>
              </section>
            )}
          />
          <div>
            <button type="button" className="btn" onClick={() => setGroups([...groups, { label: "New group", tools: [] }])}>
              + Add group
            </button>
          </div>
        </div>

        <SkillPanel
          key={target ? `${target.group}-${target.tool}` : "new"}
          groups={groups}
          target={target}
          onCancel={() => setTarget(null)}
          onApply={(tool, groupIndex) => {
            let next = groups;
            if (target) {
              // Editing: take it out of its old place first (it may be moving groups).
              const old = next[target.group];
              next = replaceAt(next, target.group, { ...old, tools: removeAt(old.tools, target.tool) });
              const g = next[groupIndex];
              const at = groupIndex === target.group ? target.tool : g.tools.length;
              const tools = g.tools.slice();
              tools.splice(at, 0, tool);
              next = replaceAt(next, groupIndex, { ...g, tools });
            } else {
              const g = next[groupIndex];
              next = replaceAt(next, groupIndex, { ...g, tools: [...g.tools, tool] });
            }
            setTarget(null);
            return f.save(next, target ? "Skill updated in the draft" : `${tool.name} added to the draft`);
          }}
        />
      </div>
      <SaveBar dirty={f.dirty} saving={f.saving} onSave={() => f.save()} onReset={f.reset} />
    </>
  );
}

function SkillPanel({
  groups,
  target,
  onApply,
  onCancel,
}: {
  groups: SkillGroup[];
  target: Target;
  onApply: (tool: Tool, group: number) => Promise<boolean>;
  onCancel: () => void;
}) {
  const editing = target ? groups[target.group]?.tools[target.tool] : undefined;
  const [name, setName] = useState(editing?.name ?? "");
  const [group, setGroup] = useState(target?.group ?? 0);
  const [choice, setChoice] = useState<LogoChoice>(editing ? { kind: "keep" } : { kind: "none" });
  const [tab, setTab] = useState<"devicon" | "upload" | "none">("devicon");
  const [query, setQuery] = useState(editing?.name ?? "");
  const [hits, setHits] = useState<DeviconHit[]>([]);
  const [searching, startSearch] = useTransition();
  const [busy, startBusy] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const duplicate =
    name.trim() &&
    groups.some((g, gi) => g.tools.some((t, ti) => t.name.toLowerCase() === name.trim().toLowerCase() && !(target && gi === target.group && ti === target.tool)));

  // Debounced devicon search.
  useEffect(() => {
    const q = query.trim();
    if (tab !== "devicon" || q.length < 2) {
      setHits([]);
      return;
    }
    const t = setTimeout(
      () =>
        startSearch(async () => {
          const res = await searchLogos(q);
          if (res.ok) setHits(res.data);
          else toast(res.error, "error");
        }),
      300,
    );
    return () => clearTimeout(t);
  }, [query, tab, toast]);

  const preview =
    choice.kind === "devicon"
      ? `${CDN}/${choice.name}/${choice.name}-${choice.variant}.svg`
      : choice.kind === "upload"
        ? choice.preview
        : choice.kind === "keep" && editing?.logo
          ? adminSrc(editing.logo)
          : null;

  const apply = () =>
    startBusy(async () => {
      const clean = name.trim();
      if (!clean || duplicate || !groups[group]) return;
      let logo: string | undefined = choice.kind === "keep" ? editing?.logo : undefined;
      if (choice.kind === "devicon") {
        const res = await addDeviconLogo(choice.name, choice.variant);
        if (!res.ok) return toast(res.error, "error");
        logo = res.data;
      } else if (choice.kind === "upload") {
        const form = new FormData();
        form.set("file", choice.file, choice.file.name);
        const res = await uploadLogo(form);
        if (!res.ok) return toast(res.error, "error");
        logo = res.data;
      }
      if (await onApply({ name: clean, ...(logo ? { logo } : {}) }, group)) {
        setName("");
        setQuery("");
        setChoice({ kind: "none" });
      }
    });

  return (
    <section className="card" style={{ position: "sticky", top: 20 }}>
      <div className="card__head">
        <h2>{editing ? `Edit ${editing.name}` : "Add skill"}</h2>
        {editing ? (
          <button type="button" className="btn btn--sm btn--ghost" onClick={onCancel}>
            Cancel
          </button>
        ) : null}
      </div>
      <TextField
        label="Name"
        value={name}
        onChange={(v) => {
          setName(v);
          if (!editing) setQuery(v);
        }}
        error={duplicate ? "Already in your skills" : undefined}
        max={40}
      />
      <div className="field">
        <label htmlFor="skill-group">Group</label>
        <select id="skill-group" className="input" value={group} onChange={(e) => setGroup(Number(e.target.value))}>
          {groups.map((g, i) => (
            <option key={i} value={i}>
              {g.label}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <span className="field__label">Logo</span>
        <div className="chips" role="tablist">
          {(["devicon", "upload", "none"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              className={`chip chip--text${tab === t ? " chip--on" : ""}`}
              onClick={() => {
                setTab(t);
                if (t === "none") setChoice({ kind: "none" });
              }}
            >
              {t === "devicon" ? "Devicon" : t === "upload" ? "Upload" : "No logo"}
            </button>
          ))}
          {editing?.logo ? (
            <button type="button" className={`chip chip--text${choice.kind === "keep" ? " chip--on" : ""}`} onClick={() => setChoice({ kind: "keep" })}>
              Keep current
            </button>
          ) : null}
        </div>

        {tab === "devicon" ? (
          <>
            <input className="input" style={{ marginTop: 8 }} placeholder="Search devicon…" aria-label="Search devicon" value={query} onChange={(e) => setQuery(e.target.value)} />
            <div className="suggest" aria-busy={searching}>
              {hits.flatMap((h) =>
                h.variants
                  .filter((v) => !v.endsWith("-line"))
                  .slice(0, 3)
                  .map((v) => (
                    <button
                      key={`${h.name}-${v}`}
                      type="button"
                      className="chip"
                      aria-pressed={choice.kind === "devicon" && choice.name === h.name && choice.variant === v}
                      onClick={() => setChoice({ kind: "devicon", name: h.name, variant: v })}
                      title={`${h.name}-${v}.svg`}
                    >
                      <img src={`${CDN}/${h.name}/${h.name}-${v}.svg`} alt="" loading="lazy" />
                      {h.name} <span className="muted">{v}</span>
                    </button>
                  )),
              )}
              {query.trim().length >= 2 && !searching && !hits.length ? <span className="muted">No devicon match. Upload one instead.</span> : null}
            </div>
          </>
        ) : null}

        {tab === "upload" ? (
          <>
            <input
              ref={fileInput}
              type="file"
              accept=".svg,image/svg+xml,image/png,image/webp"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setChoice({ kind: "upload", file, preview: URL.createObjectURL(file) });
              }}
            />
            <button type="button" className="drop" style={{ marginTop: 8, width: "100%" }} onClick={() => fileInput.current?.click()}>
              <b>{choice.kind === "upload" ? choice.file.name : "Choose an SVG (preferred), PNG or WebP"}</b>
              <span>Square, max 200 KB. SVGs with scripts or external links are rejected.</span>
            </button>
          </>
        ) : null}
      </div>

      <div className="field">
        <span className="field__label">Preview on the site</span>
        <div className="logo-pads">
          <span className="logo-pad logo-pad--light">
            {preview ? <img src={preview} alt="" /> : null}
            {name || "Skill"}
          </span>
          <span className="logo-pad logo-pad--dark">
            {preview ? <img src={preview} alt="" /> : null}
            {name || "Skill"}
          </span>
        </div>
        <span className="hint">Check the logo is visible on both backgrounds. Dark logos may need a “plain” or light variant.</span>
      </div>

      <button type="button" className="btn btn--pri" style={{ width: "100%" }} disabled={!name.trim() || Boolean(duplicate) || busy} onClick={apply}>
        {busy ? "Saving…" : editing ? "Save skill" : `Add to ${groups[group]?.label ?? "group"}`}
      </button>
    </section>
  );
}
