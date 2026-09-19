"use client";

import { useCallback, useRef, useState } from "react";
import { prefersReducedMotion } from "@/lib/motion";

export default function Shots({ images, alt }: { images: string[]; alt: string }) {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const many = images.length > 1;

  const onScroll = useCallback(() => {
    const el = track.current;
    if (el) setIndex(Math.round(el.scrollLeft / el.clientWidth));
  }, []);

  const goTo = useCallback(
    (next: number) => {
      const el = track.current;
      if (!el) return;
      const clamped = Math.max(0, Math.min(next, images.length - 1));
      el.scrollTo({ left: clamped * el.clientWidth, behavior: prefersReducedMotion() ? "auto" : "smooth" });
    },
    [images.length],
  );

  return (
    <div className="shots">
      <div className="shots__track" ref={track} onScroll={onScroll}>
        {images.map((src, i) => (
          <div className="shots__slide" key={src}>
            <img
              src={src}
              alt={many ? `${alt} — ${i + 1} of ${images.length}` : alt}
              loading={i === 0 ? "eager" : "lazy"}
              decoding="async"
            />
          </div>
        ))}
      </div>
      {many && (
        <div className="shots__bar">
          <button type="button" onClick={() => goTo(index - 1)} disabled={index === 0} aria-label="Previous screenshot">
            <span aria-hidden>←</span>
          </button>
          <div className="shots__dots">
            {images.map((src, i) => (
              <button
                key={src}
                type="button"
                className="shots__dot"
                aria-label={`Screenshot ${i + 1}`}
                aria-current={i === index}
                onClick={() => goTo(i)}
              />
            ))}
          </div>
          <span className="shots__count">
            {index + 1} / {images.length}
          </span>
          <button
            type="button"
            onClick={() => goTo(index + 1)}
            disabled={index === images.length - 1}
            aria-label="Next screenshot"
          >
            <span aria-hidden>→</span>
          </button>
        </div>
      )}
    </div>
  );
}
