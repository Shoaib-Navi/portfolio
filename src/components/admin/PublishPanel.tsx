"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { deployStatusAction, discardAction, publishAction, rollbackAction } from "@/app/admin/actions";
import type { DiffLine } from "@/lib/admin/diff";
import type { Commit, DeployState, Pending } from "@/lib/admin/store/types";
import { useToast } from "./Toasts";

export type Review = Pending & { diff?: DiffLine[]; image?: { before: string | null; after: string | null } };

const DEPLOY: Record<DeployState, string> = { success: "Live", pending: "Deploying…", failure: "Deploy failed", unknown: "Status unknown" };

export function PublishPanel({
  reviews,
  history,
  mode,
  suggested,
}: {
  reviews: Review[];
  history: (Commit & { state: DeployState })[];
  mode: "github" | "local";
  suggested: string;
}) {
  const [message, setMessage] = useState(suggested);
  const [busy, start] = useTransition();
  const [published, setPublished] = useState<{ sha: string; state: DeployState } | null>(null);
  const [confirm, setConfirm] = useState<{ kind: "discard" } | { kind: "rollback"; commit: Commit } | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const toast = useToast();
  const router = useRouter();

  useEffect(() => setMessage(suggested), [suggested]);
  useEffect(() => {
    if (confirm) dialog.current?.showModal();
    else dialog.current?.close();
  }, [confirm]);

  // Follow the deployment Vercel starts for the new commit (up to ~5 minutes).
  useEffect(() => {
    if (!published || published.state === "success" || published.state === "failure") return;
    let tries = 0;
    const t = setInterval(async () => {
      tries++;
      const res = await deployStatusAction(published.sha);
      if (res.ok && res.data !== published.state) setPublished({ ...published, state: res.data });
      if (tries > 60) clearInterval(t);
    }, 5000);
    return () => clearInterval(t);
  }, [published]);

  const publish = () =>
    start(async () => {
      const res = await publishAction(message);
      if (!res.ok) return toast(res.error, "error");
      toast(mode === "github" ? "Published: Vercel is deploying the commit" : "Published to the working tree: review and commit with git");
      if (res.data.sha) setPublished({ sha: res.data.sha, state: "pending" });
      router.refresh();
    });

  const confirmed = () =>
    start(async () => {
      if (!confirm) return;
      if (confirm.kind === "discard") {
        const res = await discardAction();
        if (!res.ok) toast(res.error, "error");
        else toast("Draft discarded");
      } else {
        const res = await rollbackAction(confirm.commit.sha);
        if (!res.ok) toast(res.error, "error");
        else {
          toast(`Rolled back ${confirm.commit.sha.slice(0, 7)}${res.data.skipped.length ? ` (code files skipped: ${res.data.skipped.length})` : ""}`);
          if (res.data.sha) setPublished({ sha: res.data.sha, state: "pending" });
        }
      }
      setConfirm(null);
      router.refresh();
    });

  return (
    <>
      {published ? (
        <div className={`banner${published.state === "failure" ? " banner--bad" : published.state === "success" ? "" : " banner--info"}`} role="status">
          <span>
            <span className={`dot dot--${published.state}`} /> Commit <span className="code">{published.sha.slice(0, 7)}</span> · {DEPLOY[published.state]}
          </span>
          <a className="btn btn--sm" href="/" target="_blank" rel="noopener">
            ↗ View site
          </a>
        </div>
      ) : null}

      <div className="grid grid--main">
        <section className="card">
          <div className="card__head">
            <h2>Pending changes</h2>
            <p>{reviews.length ? "Everything below goes out in a single commit." : "Nothing to publish. Saved edits appear here."}</p>
          </div>
          {reviews.map((r) => (
            <div key={r.path} style={{ marginBottom: 18 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                <span className={`pill ${r.kind === "added" ? "pill--ok" : r.kind === "deleted" ? "pill--bad" : "pill--warn"}`}>{r.kind}</span>
                <span className="code">{r.path}</span>
              </div>
              {r.diff ? (
                <pre className="diff">
                  {r.diff.map((l, i) => (
                    <span key={i} className={l.kind === "add" ? "diff__add" : l.kind === "del" ? "diff__del" : "diff__ctx"}>
                      {l.kind === "add" ? "+ " : l.kind === "del" ? "- " : l.kind === "gap" ? "" : "  "}
                      {l.text}
                    </span>
                  ))}
                </pre>
              ) : r.image ? (
                <div className="chips">
                  {r.image.before ? <img className="thumb" style={{ width: 120, height: 80, objectFit: "contain" }} src={r.image.before} alt="Before" /> : null}
                  {r.image.before && r.image.after ? <span aria-hidden>→</span> : null}
                  {r.image.after ? <img className="thumb" style={{ width: 120, height: 80, objectFit: "contain" }} src={r.image.after} alt="After" /> : null}
                </div>
              ) : (
                <p className="muted">Binary file</p>
              )}
            </div>
          ))}
        </section>

        <div className="stack">
          <section className="card">
            <div className="card__head">
              <h2>Publish</h2>
              <p>
                {mode === "github"
                  ? "Commits to GitHub; Vercel deploys it automatically (about a minute)."
                  : "Local mode: writes the files into your working tree. Review with git diff and commit yourself."}
              </p>
            </div>
            <div className="field">
              <label htmlFor="commit-msg">Commit message</label>
              <input id="commit-msg" className="input" value={message} maxLength={200} onChange={(e) => setMessage(e.target.value)} />
            </div>
            <div className="adm-actions">
              <button type="button" className="btn btn--pri" disabled={!reviews.length || busy} onClick={publish}>
                {busy ? "Working…" : `Publish ${reviews.length} change${reviews.length === 1 ? "" : "s"} →`}
              </button>
              <button type="button" className="btn btn--ghost btn--danger" disabled={!reviews.length || busy} onClick={() => setConfirm({ kind: "discard" })}>
                Discard draft
              </button>
            </div>
          </section>

          <section className="card">
            <div className="card__head">
              <h2>Recent deploys</h2>
              {mode === "local" ? <p>Rollback works against GitHub; locally use git revert.</p> : null}
            </div>
            <ul className="rows">
              {history.map((c) => (
                <li key={c.sha} className="row">
                  <span className={`dot dot--${c.state}`} title={DEPLOY[c.state]} />
                  <span className="row__main">
                    <b title={c.message}>{c.message}</b>
                    <span className="muted">
                      <span className="code">{c.sha.slice(0, 7)}</span> · {new Date(c.date).toLocaleString()}
                    </span>
                  </span>
                  {mode === "github" ? (
                    <button type="button" className="btn btn--sm" disabled={busy} onClick={() => setConfirm({ kind: "rollback", commit: c })}>
                      Rollback
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      <dialog ref={dialog} onClose={() => setConfirm(null)} aria-labelledby="confirm-title">
        <h2 id="confirm-title" style={{ fontSize: "1.125rem", marginBottom: 8 }}>
          {confirm?.kind === "discard" ? "Discard the whole draft?" : "Roll back this commit?"}
        </h2>
        <p className="muted" style={{ marginBottom: 16 }}>
          {confirm?.kind === "discard"
            ? "Every saved but unpublished change is thrown away, including uploaded files. The live site is not affected."
            : confirm?.kind === "rollback"
              ? `A new commit restores the content files that “${confirm.commit.message}” changed. Code files are never touched. It goes live immediately.`
              : null}
        </p>
        <div className="adm-actions" style={{ justifyContent: "flex-end" }}>
          <button type="button" className="btn btn--ghost" onClick={() => setConfirm(null)}>
            Cancel
          </button>
          <button type="button" className="btn btn--danger" disabled={busy} onClick={confirmed}>
            {busy ? "Working…" : confirm?.kind === "discard" ? "Discard draft" : "Roll back"}
          </button>
        </div>
      </dialog>
    </>
  );
}
