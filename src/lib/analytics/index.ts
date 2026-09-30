import { createHash, createHmac } from "node:crypto";
import { DISPLAY_TZ } from "@/lib/format";
import { FileAnalytics } from "./file";
import { RedisAnalytics } from "./redis";
import { emptySummary, type AnalyticsStore } from "./types";

export * from "./types";

/** Upstash Redis, under either the Upstash or the Vercel KV variable names. */
function redisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  return url && token ? { url, token } : null;
}

/** Recording is a no-op on a deployment without storage; the admin page explains the setup. */
class OffAnalytics implements AnalyticsStore {
  readonly mode = "off" as const;
  async record() {}
  async summary(days: string[]) {
    return emptySummary(days);
  }
  async recent() {
    return [];
  }
  async links() {
    return [];
  }
  async hasLink() {
    return false;
  }
  async saveLink(): Promise<void> {
    throw new Error("Analytics storage is not configured");
  }
  async deleteLink(): Promise<void> {
    throw new Error("Analytics storage is not configured");
  }
}

export function getAnalytics(): AnalyticsStore {
  const redis = redisConfig();
  if (redis) return new RedisAnalytics(redis.url, redis.token);
  // Serverless filesystems are read-only; only local dev gets the file store.
  return process.env.VERCEL ? new OffAnalytics() : new FileAnalytics();
}

const TZ = () => process.env.ANALYTICS_TZ || DISPLAY_TZ;

/** YYYY-MM-DD in the analytics time zone. */
export function dayOf(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ(), year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

/** The last `n` days, oldest first, ending today. */
export function lastDays(n: number, now = new Date()): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(dayOf(new Date(now.getTime() - i * 86400000)));
  // DST-free zones make this exact; dedupe guards zones where two dates collapse.
  return [...new Set(out)];
}

/**
 * Anonymous visitor id: a hash of IP + user agent with a salt that changes every day, so
 * the same person gets a different id tomorrow and the id can't be reversed. The IP and
 * user agent themselves are never stored.
 */
export function visitorHash(ip: string, userAgent: string, day: string): string {
  const secret = process.env.ANALYTICS_SALT || process.env.SESSION_SECRET || "local-dev-salt";
  const daySalt = createHmac("sha256", secret).update(day).digest("hex");
  return createHash("sha256").update(`${daySalt}|${ip}|${userAgent}`).digest("hex").slice(0, 16);
}

const BOT = /bot|crawl|spider|slurp|preview|headless|lighthouse|pagespeed|vercel|curl|wget|python|axios|go-http|java\/|facebookexternalhit|embedly|whatsapp|telegram|discord|slack|skype|linkedinbot|pinterest|quora|scrapy|monitor|uptime/i;

export const isBot = (userAgent: string) => !userAgent || BOT.test(userAgent);

export function deviceOf(userAgent: string): "desktop" | "mobile" | "tablet" {
  if (/iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobile))/i.test(userAgent)) return "tablet";
  if (/Mobi|iPhone|iPod|Android/i.test(userAgent)) return "mobile";
  return "desktop";
}

const SOURCE_NAMES: [RegExp, string][] = [
  // Most specific first: mail.google.com must not match the Google rule.
  [/(^|\.)mail\.google\.com$|(^|\.)outlook\.(live|office)\.com$/, "Email"],
  [/(^|\.)linkedin\.com$|^lnkd\.in$/, "LinkedIn"],
  [/(^|\.)github\.com$/, "GitHub"],
  [/(^|\.)google\.[a-z.]+$/, "Google"],
  [/(^|\.)bing\.com$/, "Bing"],
  [/(^|\.)duckduckgo\.com$/, "DuckDuckGo"],
  [/^t\.co$|(^|\.)x\.com$|(^|\.)twitter\.com$/, "X / Twitter"],
  [/(^|\.)leetcode\.com$/, "LeetCode"],
  [/(^|\.)naukri\.com$/, "Naukri"],
  [/(^|\.)wellfound\.com$|(^|\.)angel\.co$/, "Wellfound"],
  [/(^|\.)indeed\.[a-z.]+$/, "Indeed"],
  [/(^|\.)instahyre\.com$/, "Instahyre"],
];

/** "https://www.linkedin.com/feed/" → "LinkedIn"; own site or none → "Direct". */
export function sourceOf(referrer: string | undefined, ownHost: string): string {
  if (!referrer) return "Direct";
  let host: string;
  try {
    host = new URL(referrer).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "Direct";
  }
  if (!host || host === ownHost.replace(/^www\./, "").split(":")[0]) return "Direct";
  return SOURCE_NAMES.find(([re]) => re.test(host))?.[1] ?? host.slice(0, 60);
}
