"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { deleteAsset, saveCollection } from "@/app/admin/actions";
import ProjectArticle from "@/components/ProjectArticle";
import { adminSrc } from "@/lib/admin/paths";
import type { Project, Tool } from "@/lib/content/schema";
import { ChipInput } from "./ChipInput";
import { Checkbox, IssueList, RestoreBanner, RichField, SaveBar, TextField } from "./fields";
import { ListField } from "./ListField";
import { ShotsField } from "./ShotsField";
import { useToast } from "./Toasts";
import { replaceAt, useCollection } from "./useCollection";

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

export function ProjectEditor({
  projects,
  slug,
  liveSlugs,
  tools,
}: {
  /** Draft list; for a new project the caller appends a blank entry. */
  projects: Project[];
  /** null for a new project */
  slug: string | null;
  liveSlugs: string[];
  tools: Tool[];
}) {
  const isNew = slug === null;
  const index = isNew ? projects.length - 1 : projects.findIndex((p) => p.slug === slug);
  const f = useCollection("projects", projects);
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [deleting, startDelete] = useTransition();
  const dialog = useRef<HTMLDialogElement>(null);
  const [confirm, setConfirm] = useState("");
  const router = useRouter();
  const toast = useToast();

  const p = f.value[index];
  if (!p) return <p className="empty">This project no longer exists in the draft.</p>;

  const set = (patch: Partial<Project>) => f.setValue(replaceAt(f.value, index, { ...p, ...patch }));
  const err = (field: string) => f.issueAt(`[${index}].${field}`);
  const slugLocked = !isNew && liveSlugs.includes(slug);
  const shown = ["slug", "name", "tagline", "lede", "status", "note"].map((k) => `[${index}].${k}`);

  const save = async () => {
    if (await f.save(undefined, isNew ? "Project added to the draft" : "Draft saved")) {
      if (isNew || p.slug !== slug) router.replace(`/admin/projects/${p.slug}`);
    }
  };

  const remove = () =>
    startDelete(async () => {
      const rest = f.value.filter((_, i) => i !== index);
      const res = await saveCollection("projects", rest);
      if (!res.ok) return toast(res.error, "error");
      // Screenshots only this project used go too; shared ones are refused by the server.
      for (const shot of p.shots) await deleteAsset(shot);
      toast(`${p.name} removed from the draft`);
      try {
        localStorage.removeItem("admin.unsaved.projects");
      } catch {}
      router.push("/admin/projects");
      router.refresh();
    });

  return (
    <>
      <header className="adm-top">
        <div>
          <div className="adm-crumb">
            <Link href="/admin/projects">Projects</Link> / {isNew ? "New" : p.name || slug}
          </div>
          <h1>{isNew ? "New project" : "Edit project"}</h1>
        </div>
        <div className="adm-actions">
          <div className="chips" role="tablist" aria-label="View">
            <button type="button" role="tab" aria-selected={tab === "edit"} className={`chip chip--text${tab === "edit" ? " chip--on" : ""}`} onClick={() => setTab("edit")}>
              Edit
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "preview"}
              className={`chip chip--text${tab === "preview" ? " chip--on" : ""}`}
              onClick={() => setTab("preview")}
            >
              Preview
            </button>
          </div>
          {!isNew ? (
            <button type="button" className="btn btn--danger" onClick={() => dialog.current?.showModal()}>
              Delete
            </button>
          ) : null}
        </div>
      </header>

      {f.restorable ? <RestoreBanner at={f.restorable.at} onRestore={f.restore} onDrop={f.dropRestorable} /> : null}
      <IssueList issues={f.issues.filter((i) => i.path.startsWith(`[${index}]`) || !i.path.startsWith("["))} shown={shown} />

      {tab === "preview" ? (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="site">
            <div className="doc" style={{ paddingTop: 32 }}>
              <main>
                <ProjectArticle project={p} src={adminSrc} />
              </main>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid--main">
          <div className="stack">
            <section className="card">
              <div className="fields">
                <TextField
                  label="Name"
                  value={p.name}
                  error={err("name")}
                  max={60}
                  onChange={(name) => set({ name, ...(isNew && (p.slug === "" || p.slug === slugify(p.name)) ? { slug: slugify(name) } : {}) })}
                />
                <TextField
                  label="Slug"
                  value={p.slug}
                  mono
                  disabled={slugLocked}
                  error={err("slug")}
                  hint={slugLocked ? `/work/${p.slug} · locked: the page is live and may be linked` : `/work/${p.slug || "…"}`}
                  onChange={(v) => set({ slug: slugify(v) })}
                />
              </div>
              <TextField label="Tagline" value={p.tagline} onChange={(tagline) => set({ tagline })} error={err("tagline")} max={100} />
              <RichField label="Lede" value={p.lede} onChange={(lede) => set({ lede })} error={err("lede")} max={400} rich={false} />
              <div className="fields">
                <TextField
                  label="Status"
                  value={p.status ?? ""}
                  onChange={(status) => set({ status: status || undefined })}
                  error={err("status")}
                  hint="e.g. Live, Ongoing · Team of 2"
                />
                <TextField
                  label="Note (optional)"
                  value={p.note ?? ""}
                  onChange={(note) => set({ note: note || undefined })}
                  error={err("note")}
                  hint="Shown under the links, e.g. “The repository is private.”"
                />
              </div>
              <ChipInput
                label="Stack"
                value={p.stack}
                onChange={(stack) => set({ stack })}
                suggestions={tools}
                error={err("stack")}
                hint="Suggestions come from your skills, so the logos match."
              />
            </section>

            <section className="card">
              <ListField
                label="Points"
                hint="Each point is a label and a sentence. Select text and press B (or Ctrl+B) to bold it."
                items={p.points}
                onChange={(points) => set({ points })}
                blank={() => ({ label: "", text: "" })}
                addLabel="+ Add point"
                max={10}
                error={err("points")}
                render={(pt, update, i) => (
                  <>
                    <TextField label="Label" value={pt.label} onChange={(label) => update({ ...pt, label })} error={err(`points[${i}].label`)} max={40} />
                    <RichField label="Text" value={pt.text} onChange={(text) => update({ ...pt, text })} error={err(`points[${i}].text`)} max={500} />
                  </>
                )}
              />
            </section>
          </div>

          <div className="stack">
            <section className="card">
              <ShotsField slug={p.slug} shots={p.shots} onChange={(shots) => set({ shots })} />
            </section>
            <section className="card">
              <ListField
                label="Links"
                hint="Live demo, repository… https only."
                items={p.links}
                onChange={(links) => set({ links })}
                blank={() => ({ label: "Live", href: "https://" })}
                addLabel="+ Add link"
                max={4}
                render={(l, update, i) => (
                  <>
                    <TextField label="Label" value={l.label} onChange={(label) => update({ ...l, label })} error={err(`links[${i}].label`)} max={20} />
                    <TextField label="URL" value={l.href} onChange={(href) => update({ ...l, href })} error={err(`links[${i}].href`)} mono />
                  </>
                )}
              />
            </section>
            <section className="card">
              <Checkbox
                label="Verified: every claim here is true and I can explain it"
                hint="Unverified projects stay in the draft and never appear on the site."
                checked={p.verified}
                onChange={(verified) => set({ verified })}
              />
            </section>
          </div>
        </div>
      )}

      <SaveBar dirty={f.dirty} saving={f.saving} onSave={save} onReset={f.reset} label={isNew ? "Add project" : "Save draft"} />

      <dialog ref={dialog} aria-labelledby="del-title" onClose={() => setConfirm("")}>
        <h2 id="del-title" style={{ fontSize: "1.125rem", marginBottom: 8 }}>
          Delete {p.name}?
        </h2>
        <p className="muted" style={{ marginBottom: 12 }}>
          The project and its screenshots are removed from the draft. Nothing changes on the live site until you publish. Type{" "}
          <span className="code">{slug}</span> to confirm.
        </p>
        <input className="input input--mono" value={confirm} onChange={(e) => setConfirm(e.target.value)} aria-label="Type the slug to confirm" />
        <div className="adm-actions" style={{ justifyContent: "flex-end", marginTop: 16 }}>
          <button type="button" className="btn btn--ghost" onClick={() => dialog.current?.close()}>
            Cancel
          </button>
          <button type="button" className="btn btn--danger" disabled={confirm !== slug || deleting} onClick={remove}>
            {deleting ? "Deleting…" : "Delete project"}
          </button>
        </div>
      </dialog>
    </>
  );
}
