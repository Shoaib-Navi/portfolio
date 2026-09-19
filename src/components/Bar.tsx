"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import ThemeToggle from "./ThemeToggle";
import { profile } from "@/data/profile";
import { useScrollPast } from "@/lib/useScrollPast";

const NAV = [
  { href: "/about", label: "About" },
  { href: "/skills", label: "Skills" },
  { href: "/experience", label: "Experience" },
  { href: "/work", label: "Work" },
  { href: "/contact", label: "Contact" },
];

export default function Bar({ back }: { back?: { href: string; label: string } }) {
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
        {profile.initials}
      </Link>

      {back ? (
        <Link className="bar__back" href={back.href}>
          <span aria-hidden>←</span>
          <span>{back.label}</span>
        </Link>
      ) : (
        <nav aria-label="Sections">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
      )}

      <ThemeToggle />

      <a className="bar__cta" href={profile.resume} download>
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
                  {NAV.map((item) => (
                    <Link key={item.href} href={item.href} onClick={() => setOpen(false)}>
                      {item.label}
                    </Link>
                  ))}
                </nav>
                <a className="bar__cta" href={profile.resume} download onClick={() => setOpen(false)}>
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
