import Link from "next/link";
import type { ReactNode } from "react";
import type { Finding } from "@/lib/admin/resume";
import type { DeployState } from "@/lib/admin/store/types";

export function PageHead({
  crumb,
  title,
  children,
  actions,
}: {
  crumb?: { href?: string; label: string }[];
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="adm-top">
      <div>
        {crumb?.length ? (
          <div className="adm-crumb">
            {crumb.map((c, i) => (
              <span key={c.label}>
                {i > 0 ? " / " : ""}
                {c.href ? <Link href={c.href}>{c.label}</Link> : c.label}
              </span>
            ))}
          </div>
        ) : null}
        <h1>{title}</h1>
        {children ? <p>{children}</p> : null}
      </div>
      {actions ? <div className="adm-actions">{actions}</div> : null}
    </header>
  );
}

const ICON = { error: "✕", warn: "!", ok: "✓" } as const;

export function Findings({ items }: { items: Finding[] }) {
  return (
    <ul className="rows">
      {items.map((f) => (
        <li key={f.text} className="row">
          <span className={`status status--${f.level}`} aria-label={f.level}>
            {ICON[f.level]}
          </span>
          <span className="row__main" style={{ whiteSpace: "normal" }}>
            {f.text}
          </span>
          {f.href && f.level !== "ok" ? (
            <Link href={f.href} className="btn btn--sm">
              Fix
            </Link>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

const DEPLOY_LABEL: Record<DeployState, string> = { success: "Live", pending: "Deploying", failure: "Failed", unknown: "Unknown" };

export function Deploy({ state }: { state: DeployState }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span className={`dot dot--${state}`} aria-hidden />
      {DEPLOY_LABEL[state]}
    </span>
  );
}

export function LoadError({ message }: { message: string }) {
  return (
    <div className="card">
      <h2 style={{ fontSize: "1.0625rem", marginBottom: 6 }}>This page couldn’t load</h2>
      <p className="muted">{message}</p>
    </div>
  );
}

export const ago = (iso: string, now = Date.now()) => {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86400)} d ago`;
};
