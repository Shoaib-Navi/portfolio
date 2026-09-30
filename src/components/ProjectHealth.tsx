"use client";

import { useEffect, useState } from "react";
import { timeAgo } from "@/lib/format";
import type { ProjectStatus, StatusReport } from "@/lib/status";

type State = { kind: "loading" } | { kind: "error" } | { kind: "ready"; status: ProjectStatus; checkedAt: string; now: number };

/**
 * Live status for a project's public links, fetched after the page loads (the page itself
 * stays static). Renders only what was actually checked.
 */
export default function ProjectHealth({ slug }: { slug: string }) {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/status")
      .then((r) => (r.ok ? (r.json() as Promise<StatusReport>) : Promise.reject()))
      .then((report) => {
        if (!cancelled) setState({ kind: "ready", status: report.projects[slug] ?? {}, checkedAt: report.checkedAt, now: Date.now() });
      })
      .catch(() => !cancelled && setState({ kind: "error" }));
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return (
    <div className="health" aria-live="polite">
      <h2>Status</h2>
      {state.kind === "loading" ? (
        <p className="health__row health__row--muted">
          <span className="health__dot" aria-hidden /> Checking…
        </p>
      ) : state.kind === "error" ? (
        <p className="health__row health__row--muted">Status is unavailable right now.</p>
      ) : (
        <>
          {state.status.live ? (
            <p className={`health__row ${state.status.live.ok ? "health__row--ok" : "health__row--down"}`}>
              <span className="health__dot" aria-hidden />
              <span>
                <b>Live demo {state.status.live.ok ? "is up" : "isn’t responding"}</b>
                <span>
                  {state.status.live.ok
                    ? `HTTP ${state.status.live.status} in ${state.status.live.ms} ms`
                    : state.status.live.status
                      ? `HTTP ${state.status.live.status}`
                      : state.status.live.error}
                </span>
              </span>
            </p>
          ) : null}
          {state.status.repo ? (
            <p className="health__row">
              <span className="health__dot health__dot--plain" aria-hidden />
              <span>
                <b>Last commit {timeAgo(state.status.repo.pushedAt, state.now)}</b>
                <span>{state.status.repo.archived ? "Repository archived" : "Public repository"}</span>
              </span>
            </p>
          ) : null}
          {!state.status.live && !state.status.repo ? <p className="health__row health__row--muted">Nothing to check for this project.</p> : null}
          <p className="health__when">Checked {timeAgo(state.checkedAt, state.now)}</p>
        </>
      )}
    </div>
  );
}
