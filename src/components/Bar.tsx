import BarClient, { type NavItem } from "./BarClient";
import CommandPalette, { type PaletteItem } from "./CommandPalette";
import { notes, profile, projects } from "@/data/profile";

// Server half of the bar: reads content here so the client bundle gets only these few
// strings (nav links and palette entries), not every content file.
const nav: NavItem[] = [
  { href: "/about", label: "About" },
  { href: "/skills", label: "Skills" },
  { href: "/experience", label: "Experience" },
  { href: "/work", label: "Work" },
  ...(notes.length ? [{ href: "/notes", label: "Notes" }] : []),
  { href: "/contact", label: "Contact" },
];

const palette: PaletteItem[] = [
  ...projects.flatMap((p): PaletteItem[] => [
    { id: `p-${p.slug}`, group: "Projects", label: p.name, hint: p.tagline, kind: "page", href: `/work/${p.slug}`, keywords: p.stack.join(" ") },
    ...(p.caseStudy
      ? [{ id: `cs-${p.slug}`, group: "Projects", label: `${p.name} case study`, hint: "Architecture, decisions, trade-offs", kind: "page" as const, href: `/work/${p.slug}#case-study` }]
      : []),
  ]),
  ...notes.map((n): PaletteItem => ({ id: `n-${n.slug}`, group: "Notes", label: n.title, hint: n.tags.join(" · "), kind: "page", href: `/notes/${n.slug}`, keywords: n.summary })),
  { id: "s-about", group: "Sections", label: "About", kind: "page", href: "/about" },
  { id: "s-skills", group: "Sections", label: "Skills", hint: "Toolbox", kind: "page", href: "/skills", keywords: "toolbox stack technologies" },
  { id: "s-experience", group: "Sections", label: "Experience", kind: "page", href: "/experience", keywords: "internship work history" },
  { id: "s-work", group: "Sections", label: "All work", kind: "page", href: "/work", keywords: "projects" },
  ...(notes.length ? [{ id: "s-notes", group: "Sections", label: "All notes", kind: "page" as const, href: "/notes", keywords: "articles blog writing" }] : []),
  { id: "s-contact", group: "Sections", label: "Contact", kind: "page", href: "/contact" },
  { id: "a-resume", group: "Actions", label: "Download résumé", hint: "PDF", kind: "download", href: profile.resume, keywords: "cv resume pdf" },
  { id: "a-email", group: "Actions", label: "Email me", hint: profile.email, kind: "page", href: `mailto:${profile.email}`, keywords: "contact mail" },
  { id: "a-copy", group: "Actions", label: "Copy email address", hint: profile.email, kind: "copy", href: profile.email, keywords: "contact mail clipboard" },
  { id: "a-theme", group: "Actions", label: "Switch light / dark theme", kind: "theme", keywords: "dark mode light mode appearance" },
  ...profile.links.map((l): PaletteItem => ({ id: `l-${l.label.toLowerCase()}`, group: "Profiles", label: l.label, hint: l.href.replace(/^https:\/\/(www\.)?/, ""), kind: "external", href: l.href })),
];

export default function Bar({ back }: { back?: { href: string; label: string } }) {
  return (
    <>
      <BarClient back={back} initials={profile.initials} resume={profile.resume} nav={nav} />
      <CommandPalette items={palette} />
    </>
  );
}
