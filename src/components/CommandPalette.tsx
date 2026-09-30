"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { getThemeSnapshot, setTheme } from "@/lib/theme";

export type PaletteItem = {
  id: string;
  group: string;
  label: string;
  hint?: string;
  /** page: in-site navigation · external: new tab · download: file · copy: copies `href` · theme: toggles */
  kind: "page" | "external" | "download" | "copy" | "theme";
  href?: string;
  keywords?: string;
};

export const OPEN_PALETTE = "portfolio:open-palette";

const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");

/** Every query word must appear somewhere in the label, hint, group or keywords. */
function matches(item: PaletteItem, query: string) {
  const hay = norm(`${item.label} ${item.hint ?? ""} ${item.group} ${item.keywords ?? ""}`);
  return norm(query)
    .split(/\s+/)
    .filter(Boolean)
    .every((w) => hay.includes(w));
}

/**
 * Ctrl/Cmd + K quick navigation. A native <dialog> gives focus trapping, Escape and focus
 * return; the input and list follow the ARIA combobox pattern.
 */
export default function CommandPalette({ items }: { items: PaletteItem[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [copied, setCopied] = useState<string | null>(null);
  const [mac, setMac] = useState(false);
  const router = useRouter();
  const listId = useId();

  const results = useMemo(() => items.filter((i) => matches(i, query)), [items, query]);

  const show = useCallback(() => {
    setQuery("");
    setActive(0);
    setCopied(null);
    setOpen(true);
  }, []);
  const hide = useCallback(() => setOpen(false), []);

  useEffect(() => {
    setMac(/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent));
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
        setQuery("");
        setActive(0);
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_PALETTE, show);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_PALETTE, show);
    };
  }, [show]);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      requestAnimationFrame(() => input.current?.focus());
    } else if (!open && d.open) d.close();
  }, [open]);

  useEffect(() => setActive(0), [query]);

  useEffect(() => {
    list.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const run = async (item: PaletteItem | undefined) => {
    if (!item) return;
    if (item.kind === "copy" && item.href) {
      try {
        await navigator.clipboard.writeText(item.href);
        setCopied(item.id);
      } catch {
        setCopied(null);
      }
      return;
    }
    hide();
    if (item.kind === "theme") setTheme(getThemeSnapshot() === "dark" ? "light" : "dark");
    else if (item.kind === "external" && item.href) window.open(item.href, "_blank", "noopener,noreferrer");
    else if (item.kind === "download" && item.href) {
      // A real link click, so the download is counted like the bar's résumé button.
      const a = document.createElement("a");
      a.href = item.href;
      a.download = "";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } else if (item.href) {
      if (item.href.startsWith("mailto:")) window.location.href = item.href;
      else router.push(item.href);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (results.length ? (a + 1) % results.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (results.length ? (a - 1 + results.length) % results.length : 0));
    } else if (e.key === "Home") {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActive(Math.max(0, results.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      run(results[active]);
    }
  };

  let lastGroup = "";
  return (
    <dialog
      ref={dialog}
      className="palette"
      aria-label="Search the site"
      onClose={hide}
      onClick={(e) => {
        // A click on the backdrop (the dialog element itself) closes it.
        if (e.target === e.currentTarget) hide();
      }}
    >
      <div className="palette__box">
        <div className="palette__search">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-4-4" strokeLinecap="round" />
          </svg>
          <input
            ref={input}
            className="palette__input"
            placeholder="Jump to a project, note, section…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={results[active] ? `${listId}-${results[active].id}` : undefined}
            aria-autocomplete="list"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="palette__esc">Esc</kbd>
        </div>

        {results.length ? (
          <ul ref={list} id={listId} role="listbox" className="palette__list" aria-label="Results">
            {results.map((item, i) => {
              const header = item.group !== lastGroup ? item.group : null;
              lastGroup = item.group;
              return (
                <li key={item.id} role="presentation">
                  {header ? (
                    <p className="palette__group" aria-hidden>
                      {header}
                    </p>
                  ) : null}
                  <div
                    id={`${listId}-${item.id}`}
                    role="option"
                    aria-selected={i === active}
                    data-index={i}
                    className="palette__item"
                    onMouseMove={() => setActive(i)}
                    onClick={() => run(item)}
                  >
                    <span className="palette__label">{item.label}</span>
                    {copied === item.id ? <span className="palette__hint">Copied</span> : item.hint ? <span className="palette__hint">{item.hint}</span> : null}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="palette__empty" role="status">
            Nothing matches “{query}”.
          </p>
        )}

        <p className="palette__foot" aria-hidden>
          <span>
            <kbd>↑</kbd> <kbd>↓</kbd> move
          </span>
          <span>
            <kbd>Enter</kbd> open
          </span>
          <span>
            <kbd>{mac ? "⌘" : "Ctrl"}</kbd> <kbd>K</kbd> toggle
          </span>
        </p>
      </div>
    </dialog>
  );
}
