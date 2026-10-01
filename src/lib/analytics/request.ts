import { notes, projects } from "@/data/profile";
import { readSessionToken, SESSION_COOKIE } from "@/lib/admin/session";
import { dayOf, deviceOf, isBot, visitorHash } from "./index";
import type { Hit } from "./types";

/** Public paths analytics accepts; anything else (404s, probes) is ignored. */
export function knownPaths(): Set<string> {
  return new Set([
    "/",
    "/about",
    "/skills",
    "/experience",
    "/contact",
    "/work",
    "/notes",
    ...projects.map((p) => `/work/${p.slug}`),
    ...notes.map((n) => `/notes/${n.slug}`),
  ]);
}

/** Destinations a tracking link may point at. */
export const isLinkTarget = (path: string | undefined): path is string =>
  path === "/resume.pdf" || (path !== undefined && knownPaths().has(path));

/**
 * Everything about a request that analytics needs, computed once: whether to count it at
 * all (bots and the signed-in owner are skipped) and the anonymous fields of a hit.
 */
export function requestContext(headers: Headers) {
  const ua = headers.get("user-agent") ?? "";
  const cookie = headers.get("cookie") ?? "";
  const session = new RegExp(`(?:^|;\s*)${SESSION_COOKIE}=([^;]+)`).exec(cookie)?.[1];
  const owner = Boolean(session && readSessionToken(decodeURIComponent(session)));
  const now = new Date();
  const day = dayOf(now);
  const ip = headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "local";
  const base: Pick<Hit, "day" | "at" | "country" | "device" | "visitor"> = {
    day,
    at: now.toISOString(),
    country: (headers.get("x-vercel-ip-country") || "").toUpperCase().slice(0, 2) || "Unknown",
    device: deviceOf(ua),
    visitor: visitorHash(ip, ua, day),
  };
  return { skip: isBot(ua) || owner, host: headers.get("host") ?? "", base };
}
