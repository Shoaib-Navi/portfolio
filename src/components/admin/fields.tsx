"use client";

import { useId, useRef, type ReactNode } from "react";
import Rich from "@/components/Rich";
import type { Issue } from "@/lib/content/schema";

type Base = { label: string; error?: string; hint?: ReactNode; max?: number };

function Hint({ id, error, hint, length, max }: { id: string; error?: string; hint?: ReactNode; length?: number; max?: number }) {
  if (!error && !hint && !max) return null;
  return (
    <div id={id} className={`hint${error ? " hint--err" : ""}`}>
      <span>{error ?? hint}</span>
      {max ? (
        <span>
          {length ?? 0} / {max}
        </span>
      ) : null}
    </div>
  );
}

export function TextField({
  label,
  value,
  onChange,
  error,
  hint,
  max,
  mono,
  placeholder,
  type = "text",
  disabled,
}: Base & {
  value: string;
  onChange: (v: string) => void;
  mono?: boolean;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type={type}
        className={`input${mono ? " input--mono" : ""}`}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={`${id}-h`}
        onChange={(e) => onChange(e.target.value)}
      />
      <Hint id={`${id}-h`} error={error} hint={hint} length={value.length} max={max} />
    </div>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  error,
  hint,
}: Base & { value: number | undefined; onChange: (v: number | undefined) => void }) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="number"
        step="any"
        className="input"
        value={value ?? ""}
        aria-invalid={error ? true : undefined}
        aria-describedby={`${id}-h`}
        onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
      />
      <Hint id={`${id}-h`} error={error} hint={hint} />
    </div>
  );
}

/** Textarea with a Bold button that wraps the selection in **…** and a live preview. */
export function RichField({
  label,
  value,
  onChange,
  error,
  hint,
  max,
  rows = 3,
  rich = true,
}: Base & { value: string; onChange: (v: string) => void; rows?: number; rich?: boolean }) {
  const id = useId();
  const ref = useRef<HTMLTextAreaElement>(null);

  const bold = () => {
    const el = ref.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e } = el;
    if (s === e) return;
    const selected = value.slice(s, e);
    const unwrap = selected.startsWith("**") && selected.endsWith("**");
    const replaced = unwrap ? selected.slice(2, -2) : `**${selected.replace(/\*\*/g, "")}**`;
    onChange(value.slice(0, s) + replaced + value.slice(e));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(s, s + replaced.length);
    });
  };

  return (
    <div className="field">
      <div className="hint" style={{ alignItems: "center" }}>
        <label htmlFor={id} className="field__label" style={{ color: "var(--ink)" }}>
          {label}
        </label>
        {rich ? (
          <button type="button" className="btn btn--sm" onClick={bold} title="Bold the selected text (Ctrl+B)">
            <b>B</b>
            <span className="sr-only">Bold selection</span>
          </button>
        ) : null}
      </div>
      <textarea
        id={id}
        ref={ref}
        rows={rows}
        className="input"
        value={value}
        aria-invalid={error ? true : undefined}
        aria-describedby={`${id}-h`}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (rich && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
            e.preventDefault();
            bold();
          }
        }}
      />
      {rich && value.includes("**") ? (
        <div className="preview" aria-label="Preview">
          <Rich text={value} />
        </div>
      ) : null}
      <Hint id={`${id}-h`} error={error} hint={hint} length={value.length} max={max} />
    </div>
  );
}

export function Checkbox({
  label,
  checked,
  onChange,
  hint,
}: {
  label: ReactNode;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  return (
    <div className="field">
      <label className="check">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span>
          {label}
          {hint ? (
            <span className="muted" style={{ display: "block", fontWeight: 400 }}>
              {hint}
            </span>
          ) : null}
        </span>
      </label>
    </div>
  );
}

/** Issues that no field on screen displays, so nothing fails silently. */
export function IssueList({ issues, shown = [] }: { issues: Issue[]; shown?: string[] }) {
  const rest = issues.filter((i) => !shown.includes(i.path));
  if (!rest.length) return null;
  return (
    <ul className="errors" role="alert">
      {rest.map((i) => (
        <li key={i.path + i.message}>
          {i.path ? <span className="code">{i.path}</span> : null} {i.message}
        </li>
      ))}
    </ul>
  );
}

export function SaveBar({
  dirty,
  saving,
  onSave,
  onReset,
  label = "Save draft",
  inline,
}: {
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
  onReset: () => void;
  label?: string;
  /** Inside a small card: sits at the end instead of sticking to the viewport. */
  inline?: boolean;
}) {
  return (
    <div className={`adm-savebar${inline ? " adm-savebar--inline" : ""}`} data-dirty={dirty ? "1" : undefined}>
      <span className="muted">{saving ? "Saving…" : dirty ? "Unsaved changes" : "All changes saved to the draft"}</span>
      <div className="adm-actions">
        <button type="button" className="btn btn--ghost" onClick={onReset} disabled={!dirty || saving}>
          Undo changes
        </button>
        <button type="button" className="btn btn--pri" onClick={onSave} disabled={!dirty || saving}>
          {saving ? "Saving…" : label}
        </button>
      </div>
    </div>
  );
}

export function RestoreBanner({ at, onRestore, onDrop }: { at: string; onRestore: () => void; onDrop: () => void }) {
  return (
    <div className="banner banner--info" role="status">
      <span>You have unsaved edits from {new Date(at).toLocaleString()}. Restore them?</span>
      <span className="adm-actions">
        <button type="button" className="btn btn--sm" onClick={onDrop}>
          Discard
        </button>
        <button type="button" className="btn btn--sm btn--pri" onClick={onRestore}>
          Restore
        </button>
      </span>
    </div>
  );
}
