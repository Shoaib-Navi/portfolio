"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createTrackingLink, deleteTrackingLink } from "@/app/admin/analytics-actions";
import type { LinkStats, TrackingLink } from "@/lib/analytics/types";
import { timeAgo } from "@/lib/format";
import { useToast } from "./Toasts";

export type LinkTarget = { value: string; label: string };

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export function TrackingLinks({
  links,
  siteUrl,
  enabled,
  now,
  targets,
}: {
  links: (TrackingLink & LinkStats)[];
  siteUrl: string;
  enabled: boolean;
  /** Server clock, so "5 min ago" renders the same on server and client */
  now: number;
  targets: LinkTarget[];
}) {
  const [label, setLabel] = useState("");
  const [target, setTarget] = useState(targets[0]?.value ?? "/");
  const [busy, start] = useTransition();
  const [confirming, setConfirming] = useState<string | null>(null);
  const toast = useToast();
  const router = useRouter();
  const urlOf = (code: string) => `${siteUrl}/go/${code}`;
  const targetLabel = (t?: string) => targets.find((x) => x.value === (t ?? "/"))?.label ?? t ?? "Home page";

  const copy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(urlOf(code));
      toast("Link copied");
    } catch {
      toast("Couldn't copy: select the link and copy it manually", "error");
    }
  };

  const create = () =>
    start(async () => {
      const res = await createTrackingLink(label, target);
      if (!res.ok) return toast(res.error, "error");
      setLabel("");
      await copy(res.data.code);
      router.refresh();
    });

  const remove = (code: string) =>
    start(async () => {
      const res = await deleteTrackingLink(code);
      setConfirming(null);
      if (!res.ok) return toast(res.error, "error");
      toast("Link deleted");
      router.refresh();
    });

  return (
    <section className="card">
      <div className="card__head">
        <h2>Tracking links</h2>
        <p>
          One link per application: put it on that résumé, email or form. It can open your home page, a project, or the
          résumé PDF directly, and every visit through it is credited here.
        </p>
      </div>
      <form
        className="fields"
        style={{ alignItems: "end" }}
        onSubmit={(e) => {
          e.preventDefault();
          create();
        }}
      >
        <div className="field">
          <label htmlFor="link-label">New link for</label>
          <input
            id="link-label"
            className="input"
            value={label}
            maxLength={60}
            placeholder="Acme · Backend engineer"
            disabled={!enabled}
            onChange={(e) => setLabel(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="link-target">Opens</label>
          <select id="link-target" className="input" value={target} disabled={!enabled} onChange={(e) => setTarget(e.target.value)}>
            {targets.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <button type="submit" className="btn btn--pri" disabled={!enabled || !label.trim() || busy}>
            {busy ? "Working…" : "Create & copy link"}
          </button>
        </div>
      </form>

      {links.length ? (
        <ul className="rows">
          {links.map((l) => {
            const sources = Object.entries(l.sources).sort((a, b) => b[1] - a[1]);
            return (
              <li key={l.code}>
                <div className="row">
                  <span className={`status ${l.opens ? "status--ok" : ""}`} aria-hidden>
                    {l.opens ? "●" : "○"}
                  </span>
                  <span className="row__main">
                    <b title={l.label}>{l.label}</b>
                    <span className="muted">
                      <span className="code">/go/{l.code}</span> → {targetLabel(l.target)}
                    </span>
                    <span className="muted">
                      {l.opens
                        ? `Opened ${plural(l.opens, "time")} by ${plural(l.uniques, "visitor")} · last ${timeAgo(l.last, now)}`
                        : "Not opened yet"}
                      {sources.length ? ` · from ${sources.map(([s, n]) => `${s} (${n})`).join(", ")}` : ""}
                    </span>
                  </span>
                  <span className="row__end">
                    {l.pages || l.downloads ? (
                      <span className="muted">
                        {[l.pages ? plural(l.pages, "page") : null, l.downloads ? plural(l.downloads, "résumé download") : null].filter(Boolean).join(" · ")}
                      </span>
                    ) : null}
                    <button type="button" className="btn btn--sm" onClick={() => copy(l.code)}>
                      Copy link
                    </button>
                    {confirming === l.code ? (
                      <>
                        <button type="button" className="btn btn--sm btn--danger" disabled={busy} onClick={() => remove(l.code)}>
                          Delete, and its stats
                        </button>
                        <button type="button" className="btn btn--sm btn--ghost" onClick={() => setConfirming(null)}>
                          Keep
                        </button>
                      </>
                    ) : (
                      <button type="button" className="btn btn--sm btn--ghost btn--danger" onClick={() => setConfirming(l.code)}>
                        Delete
                      </button>
                    )}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="empty" style={{ marginTop: 6 }}>
          No tracking links yet.
        </p>
      )}
      <p className="muted" style={{ marginTop: 12 }}>
        Bots and link previews aren’t counted. Some email security scanners open links before a person does; they’re filtered
        when they identify themselves, but not all do.
      </p>
    </section>
  );
}
