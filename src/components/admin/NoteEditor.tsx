"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { saveCollection } from "@/app/admin/actions";
import type { Note } from "@/lib/content/schema";
import { Markdown, readingMinutes } from "@/lib/markdown";
import { Checkbox, IssueList, RestoreBanner, RichField, SaveBar, TextField } from "./fields";
import { useToast } from "./Toasts";
import { replaceAt, useCollection } from "./useCollection";

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

/** Edits one note inside the full notes list (a new note is appended by the page). */
export function NoteEditor({
  notes,
  slug,
  projects,
  liveSlugs,
}: {
  notes: Note[];
  slug: string | null;
  projects: { slug: string; name: string }[];
  liveSlugs: string[];
}) {
  const isNew = slug === null;
  const index = isNew ? notes.length - 1 : notes.findIndex((n) => n.slug === slug);
  const f = useCollection("notes", notes);
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [confirm, setConfirm] = useState("");
  const [deleting, startDelete] = useTransition();
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const toast = useToast();

  const n = f.value[index];
  if (!n) return <p className="empty">This note no longer exists in the draft.</p>;
  const set = (patch: Partial<Note>) => f.setValue(replaceAt(f.value, index, { ...n, ...patch }));
  const err = (k: string) => f.issueAt(`[${index}].${k}`);
  const slugLocked = !isNew && liveSlugs.includes(slug);

  const save = async () => {
    if (await f.save(undefined, isNew ? "Note added to the draft" : "Draft saved")) {
      if (isNew || n.slug !== slug) router.replace(`/admin/notes/${n.slug}`);
    }
  };

  const remove = () =>
    startDelete(async () => {
      const res = await saveCollection("notes", f.value.filter((_, i) => i !== index));
      if (!res.ok) return toast(res.error, "error");
      toast("Note removed from the draft");
      try {
        localStorage.removeItem("admin.unsaved.notes");
      } catch {}
      router.push("/admin/notes");
      router.refresh();
    });

  return (
    <>
      <header className="adm-top">
        <div>
          <div className="adm-crumb">
            <Link href="/admin/notes">Notes</Link> / {isNew ? "New" : n.title || slug}
          </div>
          <h1>{isNew ? "New note" : "Edit note"}</h1>
        </div>
        <div className="adm-actions">
          <div className="chips" role="tablist" aria-label="View">
            {(["edit", "preview"] as const).map((t) => (
              <button key={t} type="button" role="tab" aria-selected={tab === t} className={`chip chip--text${tab === t ? " chip--on" : ""}`} onClick={() => setTab(t)}>
                {t === "edit" ? "Edit" : "Preview"}
              </button>
            ))}
          </div>
          {!isNew ? (
            <button type="button" className="btn btn--danger" onClick={() => dialog.current?.showModal()}>
              Delete
            </button>
          ) : null}
        </div>
      </header>

      {f.restorable ? <RestoreBanner at={f.restorable.at} onRestore={f.restore} onDrop={f.dropRestorable} /> : null}
      <IssueList
        issues={f.issues.filter((i) => i.path.startsWith(`[${index}]`) || !i.path.startsWith("["))}
        shown={["slug", "title", "summary", "date", "body"].map((k) => `[${index}].${k}`)}
      />

      {tab === "preview" ? (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="site">
            <div className="doc" style={{ paddingTop: 32 }}>
              <p className="doc__meta">{readingMinutes(n.body)} min read</p>
              <h1 className="note__title">{n.title || "Untitled"}</h1>
              <p className="doc__lede">{n.summary}</p>
              <div style={{ marginTop: 32 }}>
                <Markdown source={n.body} />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid--main">
          <section className="card">
            <TextField
              label="Title"
              value={n.title}
              error={err("title")}
              max={100}
              onChange={(title) => set({ title, ...(isNew && (n.slug === "" || n.slug === slugify(n.title)) ? { slug: slugify(title) } : {}) })}
            />
            <RichField label="Summary" value={n.summary} onChange={(summary) => set({ summary })} error={err("summary")} max={280} rows={2} rich={false} />
            <RichField
              label="Body"
              hint="Markdown: ## and ### headings, - or 1. lists, **bold**, *italic*, `code`, ``` code blocks, > quotes, [links](https://…)."
              value={n.body}
              onChange={(body) => set({ body })}
              error={err("body")}
              max={30000}
              rows={22}
            />
          </section>
          <div className="stack">
            <section className="card">
              <TextField
                label="Slug"
                value={n.slug}
                mono
                disabled={slugLocked}
                error={err("slug")}
                hint={slugLocked ? `/notes/${n.slug} · locked: the page is live and may be linked` : `/notes/${n.slug || "…"}`}
                onChange={(v) => set({ slug: slugify(v) })}
              />
              <TextField label="Date" type="date" value={n.date} onChange={(date) => set({ date })} error={err("date")} />
              <TextField
                label="Tags"
                value={n.tags.join(", ")}
                hint="Comma-separated, up to 6"
                onChange={(v) =>
                  set({
                    tags: v
                      .split(",")
                      .map((t) => t.trim())
                      .filter(Boolean)
                      .slice(0, 6),
                  })
                }
              />
              <div className="field">
                <label htmlFor="note-project">From project</label>
                <select id="note-project" className="input" value={n.project ?? ""} onChange={(e) => set({ project: e.target.value || undefined })}>
                  <option value="">None</option>
                  {projects.map((p) => (
                    <option key={p.slug} value={p.slug}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </section>
            <section className="card">
              <Checkbox
                label="Verified and ready to publish"
                hint="Until ticked it's a draft: visible here and in npm run dev, never on the live site."
                checked={n.verified}
                onChange={(verified) => set({ verified })}
              />
            </section>
          </div>
        </div>
      )}

      <SaveBar dirty={f.dirty} saving={f.saving} onSave={save} onReset={f.reset} label={isNew ? "Add note" : "Save draft"} />

      <dialog ref={dialog} aria-labelledby="del-note" onClose={() => setConfirm("")}>
        <h2 id="del-note" style={{ fontSize: "1.125rem", marginBottom: 8 }}>
          Delete “{n.title}”?
        </h2>
        <p className="muted" style={{ marginBottom: 12 }}>
          Removed from the draft; the live site changes only when you publish. Type <span className="code">{slug}</span> to confirm.
        </p>
        <input className="input input--mono" value={confirm} onChange={(e) => setConfirm(e.target.value)} aria-label="Type the slug to confirm" />
        <div className="adm-actions" style={{ justifyContent: "flex-end", marginTop: 16 }}>
          <button type="button" className="btn btn--ghost" onClick={() => dialog.current?.close()}>
            Cancel
          </button>
          <button type="button" className="btn btn--danger" disabled={confirm !== slug || deleting} onClick={remove}>
            {deleting ? "Deleting…" : "Delete note"}
          </button>
        </div>
      </dialog>
    </>
  );
}
