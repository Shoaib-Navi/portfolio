import Link from "next/link";
import { profile } from "@/data/profile";

export default function DocFoot({ back }: { back: { href: string; label: string } }) {
  return (
    <footer className="doc__foot">
      <Link className="doc__footlink" href={back.href}>
        <span aria-hidden>←</span> {back.label}
      </Link>
      <a href={`mailto:${profile.email}`}>{profile.email}</a>
    </footer>
  );
}
