import { promises as fs } from "node:fs";
import path from "node:path";
import {
  emptySummary,
  RECENT_MAX,
  type AnalyticsStore,
  type Counts,
  type Hit,
  type LinkStats,
  type RecentHit,
  type Summary,
  type TrackingLink,
} from "./types";

// Local development store: one JSON file in .analytics/ (gitignored). Same behaviour as
// the Redis store, so the admin page can be tried without an account.

type Day = { pv: Counts; uv: string[]; src: Counts; geo: Counts; dev: Counts; ev: Counts; out: Counts };
type Data = { days: Record<string, Day>; links: Record<string, TrackingLink>; stats: Record<string, LinkStats>; recent: RecentHit[] };

const FILE = path.join(process.cwd(), ".analytics", "data.json");
const inc = (c: Counts, k: string) => (c[k] = (c[k] ?? 0) + 1);
const blankDay = (): Day => ({ pv: {}, uv: [], src: {}, geo: {}, dev: {}, ev: {}, out: {} });

let queue: Promise<unknown> = Promise.resolve();

async function load(): Promise<Data> {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8")) as Data;
  } catch {
    return { days: {}, links: {}, stats: {}, recent: [] };
  }
}

/** Serialises read-modify-write so concurrent hits don't overwrite each other. */
function update(fn: (d: Data) => void) {
  const next = queue.then(async () => {
    const data = await load();
    fn(data);
    await fs.mkdir(path.dirname(FILE), { recursive: true });
    await fs.writeFile(FILE, JSON.stringify(data));
  });
  queue = next.catch(() => {});
  return next;
}

export class FileAnalytics implements AnalyticsStore {
  readonly mode = "file" as const;

  async record(hit: Hit) {
    await update((data) => {
      const day = (data.days[hit.day] ??= blankDay());
      if (hit.kind === "pageview") {
        inc(day.pv, hit.path);
        if (!day.uv.includes(hit.visitor)) day.uv.push(hit.visitor);
        inc(day.src, hit.source ?? "Direct");
        inc(day.geo, hit.country);
        inc(day.dev, hit.device);
      } else if (hit.kind === "download") inc(day.ev, "download");
      else if (hit.target) inc(day.out, hit.target);

      if (hit.ref) {
        const st = (data.stats[hit.ref] ??= { opens: 0, pages: 0, downloads: 0 });
        if (hit.kind === "download") st.downloads++;
        if (hit.kind === "pageview") {
          if (hit.landing) st.opens++;
          st.pages++;
        }
        st.first ??= hit.at;
        st.last = hit.at;
      }
      const { kind, at, path: p, source, country, device, ref, target } = hit;
      data.recent = [{ kind, at, path: p, source, country, device, ref, target }, ...data.recent].slice(0, RECENT_MAX);
    });
  }

  async summary(days: string[]): Promise<Summary> {
    const data = await load();
    const s = emptySummary(days);
    days.forEach((d, i) => {
      const day = data.days[d];
      if (!day) return;
      const pageviews = Object.values(day.pv).reduce((a, b) => a + b, 0);
      s.daily[i] = { day: d, visitors: day.uv.length, pageviews };
      s.visitors += day.uv.length;
      s.pageviews += pageviews;
      s.downloads += day.ev.download ?? 0;
      for (const [key, into] of [
        ["pv", s.pages],
        ["src", s.sources],
        ["geo", s.countries],
        ["dev", s.devices],
        ["out", s.outbound],
      ] as const)
        for (const [k, v] of Object.entries(day[key])) into[k] = (into[k] ?? 0) + v;
    });
    return s;
  }

  async recent(limit: number) {
    return (await load()).recent.slice(0, limit);
  }

  async links() {
    const data = await load();
    return Object.values(data.links)
      .map((l) => ({ ...l, ...(data.stats[l.code] ?? { opens: 0, pages: 0, downloads: 0 }) }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async hasLink(code: string) {
    return code in (await load()).links;
  }

  async saveLink(link: TrackingLink) {
    await update((d) => {
      d.links[link.code] = link;
    });
  }

  async deleteLink(code: string) {
    await update((d) => {
      delete d.links[code];
      delete d.stats[code];
    });
  }
}
