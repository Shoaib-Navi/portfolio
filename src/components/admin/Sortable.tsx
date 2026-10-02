"use client";

import { useState, type ReactNode } from "react";

/**
 * A vertical list you can reorder by dragging the ⋮⋮ handle or with the ↑ ↓ buttons
 * (the buttons are the keyboard and touch path; native drag-and-drop is mouse only).
 */
export function Sortable<T>({
  items,
  keyOf,
  onMove,
  render,
}: {
  items: T[];
  keyOf: (item: T, i: number) => string;
  onMove: (from: number, to: number) => void;
  render: (item: T, i: number, controls: ReactNode) => ReactNode;
}) {
  const [drag, setDrag] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);

  return (
    <ul className="rows">
      {items.map((item, i) => {
        const controls = (
          <span className="order">
            <span
              className="handle"
              draggable
              aria-hidden
              title="Drag to reorder"
              onDragStart={(e) => {
                setDrag(i);
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", String(i));
              }}
              onDragEnd={() => {
                setDrag(null);
                setOver(null);
              }}
            >
              ⋮⋮
            </span>
            <button type="button" className="btn btn--icon btn--ghost" aria-label="Move up" disabled={i === 0} onClick={() => onMove(i, i - 1)}>
              ↑
            </button>
            <button
              type="button"
              className="btn btn--icon btn--ghost"
              aria-label="Move down"
              disabled={i === items.length - 1}
              onClick={() => onMove(i, i + 1)}
            >
              ↓
            </button>
          </span>
        );
        return (
          <li
            key={keyOf(item, i)}
            data-dragging={drag === i ? "1" : undefined}
            data-over={over === i && drag !== i ? "1" : undefined}
            onDragOver={(e) => {
              if (drag === null) return;
              e.preventDefault();
              setOver(i);
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (drag !== null && drag !== i) onMove(drag, i);
              setDrag(null);
              setOver(null);
            }}
          >
            {render(item, i, controls)}
          </li>
        );
      })}
    </ul>
  );
}
