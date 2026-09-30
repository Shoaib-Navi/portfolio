"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createTrackingLink, deleteTrackingLink } from "@/app/admin/analytics-actions";
import type { LinkStats, TrackingLink } from "@/lib/analytics/types";
import { timeAgo } from "@/lib/format";
import { useToast } from "./Toasts";

export function TrackingLinks({
  links,
  siteUrl,
  enabled,
  now,
}: {
  links: (TrackingLink & LinkStats)[];
  siteUrl: string;
  enabled: boolean;
  /** Server clock, so "5 min ago" renders the same on server and client */
  now: number;
}) {
  const [label, setLabel] = useState("");
  const [busy, start] = useTransition();
  const [confirming, setConfirming] = useState<string | null>(null);
  const toast = useToast();
  const router = useRouter();
  const urlOf = (code: string) => `${siteUrl}/?ref=${code}`;

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
      const res = await createTrackingLink(label);
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
          Make one link per application and use it on that résumé, email or form. Visits through it are credited here, so you
          can tell when that company opened your portfolio.
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
          <button type="submit" className="btn btn--pri" disabled={!enabled || !label.trim() || busy}>
            {busy ? "Working…" : "Create & copy link"}
          </button>
        </div>
      </form>

      {links.length ? (
        <ul className="rows">
          {links.map((l) => (
            <li key={l.code}>
              <div className="row">
                <span className={`status ${l.opens ? "status--ok" : ""}`} aria-hidden>
                  {l.opens ? "●" : "○"}
                </span>
                <span className="row__main">
                  <b title={l.label}>{l.label}</b>
                  <span className="muted">
                    <span className="code">?ref={l.code}</span> · {l.opens ? `opened ${l.opens}× · last ${timeAgo(l.last, now)}` : "not opened yet"}
                  </span>
                </span>
                <span className="row__end">
                  {l.opens ? (
                    <span className="muted">
                      {l.pages} page{l.pages === 1 ? "" : "s"}
                      {l.downloads ? ` · ${l.downloads} résumé download${l.downloads === 1 ? "" : "s"}` : ""}
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
          ))}
        </ul>
      ) : (
        <p className="empty" style={{ marginTop: 6 }}>
          No tracking links yet.
        </p>
      )}
    </section>
  );
}
