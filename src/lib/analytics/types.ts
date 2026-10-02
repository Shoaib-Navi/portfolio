// First-party, cookieless analytics. What is stored: counts per day (pages, sources,
// countries, devices, downloads, outbound clicks), a daily-rotating visitor hash for
// unique counts, and the last 100 hits for the activity feed. No IP address, no cookie,
// no user agent string is kept.

/** "open" is a tracking link followed through /go/<code>, recorded by the server. */
export type HitKind = "pageview" | "download" | "outbound" | "open";

export type Hit = {
  kind: HitKind;
  /** YYYY-MM-DD in the analytics time zone */
  day: string;
  /** ISO timestamp */
  at: string;
  path: string;
  /** Referring site ("LinkedIn", "github.com") or "Direct"; pageviews only */
  source?: string;
  country: string;
  device: "desktop" | "mobile" | "tablet";
  /** Daily-rotating hash; can't be linked across days or back to a person */
  visitor: string;
  /** Tracking-link code the visit arrived with */
  ref?: string;
  /** True on the first pageview of a visit that arrived through ?ref= */
  landing?: boolean;
  /** Outbound clicks: destination (host + path, or "email"). Opens: where the link points. */
  target?: string;
};

export type Counts = Record<string, number>;

export type DayPoint = { day: string; visitors: number; pageviews: number };

export type Summary = {
  daily: DayPoint[];
  visitors: number;
  pageviews: number;
  downloads: number;
  pages: Counts;
  sources: Counts;
  countries: Counts;
  devices: Counts;
  outbound: Counts;
};

export type TrackingLink = {
  code: string;
  label: string;
  createdAt: string;
  /** Where /go/<code> sends people: a site path or "/resume.pdf". Older links have none (home). */
  target?: string;
};

export type LinkStats = {
  opens: number;
  /** Distinct visitors (per day, like the site totals) who opened the link */
  uniques: number;
  pages: number;
  downloads: number;
  /** Where the opens came from, e.g. { LinkedIn: 2, Email: 1 } */
  sources: Counts;
  first?: string;
  last?: string;
};

export type RecentHit = Pick<Hit, "kind" | "at" | "path" | "source" | "country" | "device" | "ref" | "target">;

export interface AnalyticsStore {
  readonly mode: "redis" | "file" | "off";
  record(hit: Hit): Promise<void>;
  summary(days: string[]): Promise<Summary>;
  recent(limit: number): Promise<RecentHit[]>;
  links(): Promise<(TrackingLink & LinkStats)[]>;
  hasLink(code: string): Promise<boolean>;
  getLink(code: string): Promise<TrackingLink | null>;
  saveLink(link: TrackingLink): Promise<void>;
  deleteLink(code: string): Promise<void>;
}

export const emptySummary = (days: string[]): Summary => ({
  daily: days.map((day) => ({ day, visitors: 0, pageviews: 0 })),
  visitors: 0,
  pageviews: 0,
  downloads: 0,
  pages: {},
  sources: {},
  countries: {},
  devices: {},
  outbound: {},
});

export const RECENT_MAX = 100;
/** Day buckets are kept a little over a year. */
export const RETENTION_DAYS = 400;
