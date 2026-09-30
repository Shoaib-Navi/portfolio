"use client";

import type { ReactNode } from "react";
import { Sortable } from "./Sortable";
import { move, removeAt, replaceAt } from "./useCollection";

/**
 * An ordered list of sub-items (notes, highlights, links, points): reorder, add, remove.
 * `render` draws the fields for one item; `blank` is what "Add" appends.
 */
export function ListField<T>({
  label,
  items,
  onChange,
  render,
  blank,
  addLabel = "+ Add",
  max,
  hint,
  error,
}: {
  label: string;
  items: T[];
  onChange: (items: T[]) => void;
  render: (item: T, update: (item: T) => void, i: number) => ReactNode;
  blank: () => T;
  addLabel?: string;
  max?: number;
  hint?: string;
  error?: string;
}) {
  return (
    <div className="field">
      <span className="field__label">{label}</span>
      {hint ? <span className="hint">{hint}</span> : null}
      {items.length ? (
        <Sortable
          items={items}
          keyOf={(_, i) => String(i)}
          onMove={(from, to) => onChange(move(items, from, to))}
          render={(item, i, controls) => (
            <div className="subrow">
              {controls}
              <div style={{ minWidth: 0 }}>{render(item, (next) => onChange(replaceAt(items, i, next)), i)}</div>
              <button
                type="button"
                className="btn btn--icon btn--ghost btn--danger"
                aria-label={`Remove item ${i + 1}`}
                onClick={() => onChange(removeAt(items, i))}
              >
                ✕
              </button>
            </div>
          )}
        />
      ) : (
        <p className="empty" style={{ padding: 12 }}>
          Nothing here yet.
        </p>
      )}
      {error ? <span className="hint hint--err">{error}</span> : null}
      <div>
        <button type="button" className="btn btn--sm" disabled={max !== undefined && items.length >= max} onClick={() => onChange([...items, blank()])}>
          {addLabel}
        </button>
      </div>
    </div>
  );
}
