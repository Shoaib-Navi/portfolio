"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

// Cookieless page-view and click reporting to /api/t. Sends nothing on /admin, and
// nothing for visitors who ask not to be tracked (Do Not Track / Global Privacy Control).
// A ?ref= code from a tracking link is remembered for the visit (sessionStorage) so the
// pages viewed and a résumé download afterwards are credited to that link.

const REF_KEY = "portfolio.ref";

function optedOut() {
  const n = navigator as Navigator & { globalPrivacyControl?: boolean };
  return n.globalPrivacyControl === true || n.doNotTrack === "1";
}

function send(data: Record<string, unknown>) {
  const body = JSON.stringify(data);
  // sendBeacon survives navigation (e.g. clicking an outbound link); fetch is the fallback.
  if (!(navigator.sendBeacon && navigator.sendBeacon("/api/t", body))) {
    fetch("/api/t", { method: "POST", body, keepalive: true }).catch(() => {});
  }
}

function currentRef(): { ref?: string; land: boolean } {
  let land = false;
  let ref: string | undefined;
  try {
    const fromUrl = new URLSearchParams(location.search).get("ref");
    if (fromUrl) {
      ref = fromUrl.toLowerCase().slice(0, 40);
      land = sessionStorage.getItem(REF_KEY) !== ref;
      sessionStorage.setItem(REF_KEY, ref);
    } else ref = sessionStorage.getItem(REF_KEY) ?? undefined;
  } catch {
    /* storage blocked: attribution only for the landing page */
  }
  return { ref, land };
}

let lastPath = "";
let firstHit = true;

export default function AnalyticsTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname.startsWith("/admin") || optedOut()) return;
    // React may run effects twice in development; one view per path change.
    if (pathname === lastPath) return;
    lastPath = pathname;
    const { ref, land } = currentRef();
    // The external referrer only means something for the first page of the visit.
    send({ k: "pv", p: pathname, r: firstHit ? document.referrer : undefined, ref, land });
    firstHit = false;
  }, [pathname]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (location.pathname.startsWith("/admin") || optedOut()) return;
      const a = (e.target as Element | null)?.closest?.("a[href]");
      if (!(a instanceof HTMLAnchorElement)) return;
      let url: URL;
      try {
        url = new URL(a.href, location.href);
      } catch {
        return;
      }
      const { ref } = currentRef();
      if (url.host === location.host && url.pathname === "/resume.pdf") send({ k: "dl", p: location.pathname, ref });
      else if (url.host !== location.host && /^https?:$/.test(url.protocol)) send({ k: "out", p: location.pathname, to: url.href, ref });
    };
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  return null;
}
