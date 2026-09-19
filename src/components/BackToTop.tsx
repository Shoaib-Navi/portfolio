"use client";

import { prefersReducedMotion } from "@/lib/motion";
import { useScrollPast } from "@/lib/useScrollPast";

export default function BackToTop() {
  const show = useScrollPast(700);

  return (
    <button
      type="button"
      className="totop"
      data-show={show ? "1" : "0"}
      aria-label="Back to top"
      onClick={() => window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "instant" : "smooth" })}
    >
      <span aria-hidden>↑</span>
    </button>
  );
}
