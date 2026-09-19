import { profile } from "@/data/profile";

export default function Footer() {
  return (
    <footer className="foot">
      <div className="wrap">
        <span>
          {profile.name} · {profile.location}
        </span>
        <span>Thanks for scrolling all the way down :)</span>
      </div>
    </footer>
  );
}
