"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { hasFinePointer, prefersReducedMotion } from "@/lib/motion";

/**
 * Page behaviour that needs the DOM:
 * reveal-on-scroll, count-up stats, the hero light, and the flash on jumping to a role.
 */
export default function SiteFX() {
  // Re-runs per route: a client navigation swaps in fresh nodes to observe.
  const pathname = usePathname();

  useEffect(() => {
    const reduced = prefersReducedMotion();
    const cleanups: Array<() => void> = [];

    // Reveal on scroll.
    const revealables = Array.from(document.querySelectorAll<HTMLElement>(".reveal"));
    if (reduced) {
      revealables.forEach((el) => el.classList.add("is-in"));
    } else if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("is-in");
            io.unobserve(entry.target);
          });
        },
        { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
      );
      revealables.forEach((el) => io.observe(el));
      cleanups.push(() => io.disconnect());
    } else {
      revealables.forEach((el) => el.classList.add("is-in"));
    }

    // Count-up numbers.
    const counters = Array.from(document.querySelectorAll<HTMLElement>("[data-count]"));
    const runCount = (el: HTMLElement) => {
      const to = parseFloat(el.dataset.count ?? "0");
      const dec = parseInt(el.dataset.dec ?? "0", 10);
      const group = el.dataset.group === "1";
      const format = (v: number) => {
        const s = v.toFixed(dec);
        return group ? Number(s).toLocaleString("en-US", { minimumFractionDigits: dec }) : s;
      };
      if (reduced) {
        el.textContent = format(to);
        return;
      }
      const start = performance.now();
      const dur = 1100;
      let raf = 0;
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / dur);
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent = format(to * eased);
        if (t < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
      cleanups.push(() => cancelAnimationFrame(raf));
    };

    if (counters.length) {
      if (reduced || !("IntersectionObserver" in window)) {
        counters.forEach(runCount);
      } else {
        const io = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (!entry.isIntersecting) return;
              runCount(entry.target as HTMLElement);
              io.unobserve(entry.target);
            });
          },
          { threshold: 0.4 },
        );
        counters.forEach((el) => io.observe(el));
        cleanups.push(() => io.disconnect());
      }
    }

    // Hero light follows the pointer. Geometry is read once per frame, not per event.
    const hero = document.querySelector<HTMLElement>("[data-hero]");
    const light = document.querySelector<HTMLElement>("[data-hero-light]");
    if (hero && light && !reduced && hasFinePointer()) {
      let queued = 0;
      let lastX = 0;
      let lastY = 0;
      const paint = () => {
        queued = 0;
        const r = hero.getBoundingClientRect();
        if (lastY > r.bottom || lastY < r.top) {
          light.dataset.on = "0";
          return;
        }
        light.dataset.on = "1";
        light.style.setProperty("--sx", `${lastX - r.left}px`);
        light.style.setProperty("--sy", `${lastY - r.top}px`);
      };
      const onMove = (e: PointerEvent) => {
        if (e.pointerType === "touch") return;
        lastX = e.clientX;
        lastY = e.clientY;
        if (!queued) queued = requestAnimationFrame(paint);
      };
      const onLeave = () => {
        light.dataset.on = "0";
      };
      window.addEventListener("pointermove", onMove, { passive: true });
      window.addEventListener("pointerleave", onLeave, { passive: true });
      cleanups.push(() => {
        if (queued) cancelAnimationFrame(queued);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerleave", onLeave);
      });
    }

    return () => cleanups.forEach((fn) => fn());
  }, [pathname]);

  return null;
}
