"use client";

import Bar from "@/components/Bar";
import DocFoot from "@/components/DocFoot";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="site">
      <Bar back={{ href: "/", label: "Home" }} />
      <div className="doc">
        <main>
          <p className="doc__meta">Error</p>
          <h1>Something broke.</h1>
          <p className="doc__lede">That is on the site, not on you. Try again, or head back home.</p>
          <p>
            <button type="button" className="cta" onClick={reset}>
              <span className="cta__fill" aria-hidden />
              <span className="cta__text">Try again</span>
              <span className="cta__icon" aria-hidden>
                ↻
              </span>
            </button>
          </p>
        </main>
        <DocFoot back={{ href: "/", label: "Home" }} />
      </div>
    </div>
  );
}
