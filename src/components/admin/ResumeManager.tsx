"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { deleteResumeVersion, setLiveResume, uploadResume } from "@/app/admin/actions";
import { adminSrc } from "@/lib/admin/paths";
import type { Resumes } from "@/lib/content/schema";
import { kb } from "./image";
import { useToast } from "./Toasts";

export function ResumeManager({ resumes }: { resumes: Resumes }) {
  const [label, setLabel] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, start] = useTransition();
  const input = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const router = useRouter();

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, ok: string) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) return toast(res.error ?? "Failed", "error");
      toast(ok);
      router.refresh();
    });

  const upload = () => {
    if (!file) return;
    const form = new FormData();
    form.set("file", file, file.name);
    form.set("label", label || file.name.replace(/\.pdf$/i, ""));
    run(async () => {
      const res = await uploadResume(form);
      if (res.ok) {
        setFile(null);
        setLabel("");
        if (input.current) input.current.value = "";
        if (res.data.checks.phone) toast("Heads up: this PDF contains a phone number", "error");
      }
      return res;
    }, "Version uploaded. Make it live when ready.");
  };

  return (
    <div className="stack">
      <section className="card">
        <div className="card__head">
          <h2>Upload a new version</h2>
          <p>PDF, max 2 MB. Uploading doesn’t replace the live file; choose “Make live” afterwards.</p>
        </div>
        <div className="fields">
          <div className="field">
            <label htmlFor="resume-label">Label</label>
            <input id="resume-label" className="input" value={label} maxLength={60} placeholder="Backend · no phone" onChange={(e) => setLabel(e.target.value)} />
          </div>
          <div className="field">
            <span className="field__label">File</span>
            <input ref={input} type="file" accept="application/pdf" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <button type="button" className="btn" style={{ justifyContent: "flex-start", overflow: "hidden" }} onClick={() => input.current?.click()}>
              {file ? `${file.name} · ${kb(file.size)}` : "Choose PDF…"}
            </button>
          </div>
        </div>
        <button type="button" className="btn btn--pri" disabled={!file || busy} onClick={upload}>
          {busy ? "Working…" : "↑ Upload & check"}
        </button>
      </section>

      <section className="card">
        <div className="card__head">
          <h2>Versions</h2>
          <p>The live version is served at /resume.pdf, so the download link never changes.</p>
        </div>
        <ul className="rows">
          {resumes.versions.map((v) => {
            const live = v.id === resumes.live;
            return (
              <li key={v.id} className="row">
                {live ? <span className="pill pill--ok">Live</span> : <span className="pill">Draft</span>}
                <span className="row__main">
                  <b title={v.label}>{v.label}</b>
                  <span className="muted">
                    {new Date(v.uploadedAt).toLocaleDateString()} · {v.checks.pages} page{v.checks.pages === 1 ? "" : "s"} · {kb(v.checks.bytes)}
                  </span>
                </span>
                <span className="row__end">
                  {v.checks.phone ? <span className="pill pill--bad">Phone number</span> : <span className="pill pill--ok">No phone</span>}
                  {!v.checks.textLayer ? <span className="pill pill--bad">No text layer</span> : null}
                  {v.checks.pages > 1 ? <span className="pill pill--warn">{v.checks.pages} pages</span> : null}
                  <a className="btn btn--sm" href={adminSrc(v.file)} target="_blank" rel="noopener">
                    Open
                  </a>
                  {!live ? (
                    <>
                      <button type="button" className="btn btn--sm btn--pri" disabled={busy} onClick={() => run(() => setLiveResume(v.id), `${v.label} is now the live résumé (in the draft)`)}>
                        Make live
                      </button>
                      <button type="button" className="btn btn--sm btn--ghost btn--danger" disabled={busy} onClick={() => run(() => deleteResumeVersion(v.id), "Version deleted")}>
                        Delete
                      </button>
                    </>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
