import BarClient, { type NavItem } from "./BarClient";
import { notes, profile } from "@/data/profile";

// Server half of the bar: reads content here so the client bundle gets only these few
// strings, not every content file.
const nav: NavItem[] = [
  { href: "/about", label: "About" },
  { href: "/skills", label: "Skills" },
  { href: "/experience", label: "Experience" },
  { href: "/work", label: "Work" },
  ...(notes.length ? [{ href: "/notes", label: "Notes" }] : []),
  { href: "/contact", label: "Contact" },
];

export default function Bar({ back }: { back?: { href: string; label: string } }) {
  return <BarClient back={back} initials={profile.initials} resume={profile.resume} nav={nav} />;
}
