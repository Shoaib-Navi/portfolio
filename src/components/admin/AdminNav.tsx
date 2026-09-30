"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";
import { logoutAction } from "@/app/admin/actions";

type Item = { href: string; label: string; count?: number };

export default function AdminNav({
  initials,
  user,
  mode,
  pending,
  counts,
}: {
  initials: string;
  user: string;
  mode: "github" | "local";
  pending: number;
  counts: { projects: number; experience: number; skills: number };
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const groups: { title?: string; items: Item[] }[] = [
    { items: [{ href: "/admin", label: "Overview" }] },
    {
      title: "Content",
      items: [
        { href: "/admin/profile", label: "Profile & hero" },
        { href: "/admin/projects", label: "Projects", count: counts.projects },
        { href: "/admin/experience", label: "Experience", count: counts.experience },
        { href: "/admin/skills", label: "Skills", count: counts.skills },
        { href: "/admin/engineering", label: "Engineering" },
        { href: "/admin/education", label: "Education & awards" },
      ],
    },
    {
      title: "Files",
      items: [
        { href: "/admin/resume", label: "Résumé" },
        { href: "/admin/media", label: "Media library" },
      ],
    },
    {
      title: "Site",
      items: [
        { href: "/admin/analytics", label: "Analytics" },
        { href: "/admin/publish", label: "Publish", count: pending || undefined },
      ],
    },
  ];

  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  return (
    <>
      <div className="adm-mobilebar">
        <Link href="/admin" className="adm-brand">
          <b>{initials}</b> Admin
        </Link>
        <button type="button" className="btn btn--sm" aria-expanded={open} aria-controls="adm-side" onClick={() => setOpen(true)}>
          ☰ Menu
        </button>
      </div>
      {open ? <div className="adm-scrim" onClick={() => setOpen(false)} aria-hidden /> : null}
      <aside id="adm-side" className="adm-side" data-open={open ? "1" : undefined} aria-label="Admin navigation">
        <Link href="/admin" className="adm-brand">
          <b>{initials}</b> Admin
        </Link>
        <nav className="adm-nav">
          {groups.map((g, gi) => (
            <div key={gi}>
              {g.title ? <div className="adm-sep">{g.title}</div> : null}
              {g.items.map((item) => (
                <Link key={item.href} href={item.href} aria-current={isActive(item.href) ? "page" : undefined}>
                  {item.label}
                  {item.count !== undefined ? <small>{item.count}</small> : null}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="adm-foot">
          <div className="adm-foot__row">
            <ThemeToggle />
            <a href="/" target="_blank" rel="noopener" className="btn btn--sm btn--ghost">
              ↗ View site
            </a>
          </div>
          <div className="adm-foot__row">
            <span>
              {user} · {mode === "github" ? "GitHub" : "Local files"}
            </span>
            <form action={logoutAction}>
              <button type="submit" className="linkbtn muted">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </aside>
    </>
  );
}
