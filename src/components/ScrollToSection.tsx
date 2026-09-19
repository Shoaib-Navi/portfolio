"use client";

import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "@/lib/motion";
import type { SectionId } from "@/lib/sections";

/** Opens the page at a section: instant on first load, smooth when navigating between routes. */
export default function ScrollToSection({ section }: { section?: SectionId }) {
  const firstRender = useRef(true);

  useEffect(() => {
    const instant = firstRender.current;
    firstRender.current = false;
    if (!section) {
      if (instant) window.scrollTo({ top: 0, behavior: "instant" });
      return;
    }
    const target = document.getElementById(section);
    if (!target) return;
    target.scrollIntoView({ behavior: instant || prefersReducedMotion() ? "instant" : "smooth", block: "start" });
  }, [section]);

  return null;
}
