"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import ThemeToggle from "./ThemeToggle";
import { OPEN_PALETTE } from "./CommandPalette";
import { useScrollPast } from "@/lib/useScrollPast";

export type NavItem = { href: string; label: string };

/** Client half of the bar (drawer state, scroll border). Content comes in as props from Bar. */
export default function BarClient({
  back,
  initials,
  resume,
  nav,
}: {
  back?: { href: string; label: string };
  initials: string;
  resume: string;
  nav: NavItem[];
}) {
  const [open, setOpen] = useState(false);
  // The drawer is portalled into the .site root, not <body>, so it keeps the site's styles.
  const [root, setRoot] = useState<HTMLElement | null>(null);
  const bar = useRef<HTMLElement>(null);
  const burger = useRef<HTMLButtonElement>(null);
  const stuck = useScrollPast(8);

  useEffect(() => setRoot(bar.current?.closest<HTMLElement>(".site") ?? null), []);

  useEffect(() => {
    if (!open) {
      document.documentElement.removeAttribute("data-drawer");
      return;
    }
    document.documentElement.setAttribute("data-drawer", "1");
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        burger.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.documentElement.removeAttribute("data-drawer");
    };
  }, [open]);

  return (
    <header ref={bar} className="bar" data-stuck={stuck ? "1" : "0"}>
      <Link className="mark" href="/" aria-label="Home">
        {initials}
      </Link>

      {back ? (
        <Link className="bar__back" href={back.href}>
          <span aria-hidden>←</span>
          <span>{back.label}</span>
        </Link>
      ) : (
        <nav aria-label="Sections">
          {nav.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
      )}

      <button
        type="button"
        className="themepick search-btn"
        aria-label="Search the site (Ctrl K)"
        title="Search (Ctrl K / ⌘K)"
        onClick={() => window.dispatchEvent(new Event(OPEN_PALETTE))}
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-4-4" strokeLinecap="round" />
        </svg>
      </button>

      <ThemeToggle />

      <a className="bar__cta" href={resume} download>
        <span>Résumé</span>
        <span className="long"> PDF ↓</span>
      </a>

      {!back && (
        <button
          ref={burger}
          type="button"
          className="burger"
          aria-expanded={open}
          aria-controls="site-drawer"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          <span aria-hidden />
          <span aria-hidden />
          <span aria-hidden />
        </button>
      )}

      {root && !back
        ? createPortal(
            <div className="drawer__root" data-open={open ? "1" : "0"}>
              <button
                type="button"
                className="drawer__scrim"
                tabIndex={-1}
                aria-hidden
                onClick={() => setOpen(false)}
              />
              <div id="site-drawer" className="drawer" hidden={!open}>
                <nav className="drawer__links" aria-label="Sections">
                  {nav.map((item) => (
                    <Link key={item.href} href={item.href} onClick={() => setOpen(false)}>
                      {item.label}
                    </Link>
                  ))}
                </nav>
                <a className="bar__cta" href={resume} download onClick={() => setOpen(false)}>
                  Résumé PDF ↓
                </a>
              </div>
            </div>,
            root,
          )
        : null}
    </header>
  );
}
