"use client";

import { useId, useState } from "react";
import { adminSrc } from "@/lib/admin/paths";
import type { Tool } from "@/lib/content/schema";

/** Tag input for a stack list. Suggests names from the skills library so logos stay consistent. */
export function ChipInput({
  label,
  value,
  onChange,
  suggestions,
  hint,
  error,
  max = 20,
}: {
  label: string;
  value: string[];
  onChange: (v: string[]) => void;
  suggestions: Tool[];
  hint?: string;
  error?: string;
  max?: number;
}) {
  const id = useId();
  const [text, setText] = useState("");
  const logoOf = (name: string) => suggestions.find((s) => s.name.toLowerCase() === name.toLowerCase())?.logo;
  const has = (name: string) => value.some((v) => v.toLowerCase() === name.toLowerCase());

  const add = (name: string) => {
    const clean = name.trim().slice(0, 40);
    if (!clean || has(clean) || value.length >= max) return;
    // Use the library's spelling when it matches ("fastapi" → "FastAPI").
    onChange([...value, suggestions.find((s) => s.name.toLowerCase() === clean.toLowerCase())?.name ?? clean]);
    setText("");
  };

  const q = text.trim().toLowerCase();
  const matches = q ? suggestions.filter((s) => s.name.toLowerCase().includes(q) && !has(s.name)).slice(0, 8) : [];

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="chipinput">
        {value.map((name, i) => {
          const logo = logoOf(name);
          return (
            <span key={name} className={`chip${logo ? "" : " chip--text"}`}>
              {logo ? <img src={adminSrc(logo)} alt="" /> : null}
              {name}
              <button type="button" aria-label={`Remove ${name}`} onClick={() => onChange(value.filter((_, j) => j !== i))}>
                ×
              </button>
            </span>
          );
        })}
        <input
          id={id}
          value={text}
          placeholder={value.length ? "Add…" : "Type a technology and press Enter"}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add(matches[0] && matches[0].name.toLowerCase().startsWith(q) ? matches[0].name : text);
            } else if (e.key === "Backspace" && !text && value.length) {
              onChange(value.slice(0, -1));
            }
          }}
        />
      </div>
      {matches.length ? (
        <div className="suggest">
          {matches.map((s) => (
            <button key={s.name} type="button" className={`chip${s.logo ? "" : " chip--text"}`} onClick={() => add(s.name)}>
              {s.logo ? <img src={adminSrc(s.logo)} alt="" /> : null}
              {s.name}
            </button>
          ))}
        </div>
      ) : null}
      {error ? <span className="hint hint--err">{error}</span> : hint ? <span className="hint">{hint}</span> : null}
    </div>
  );
}
