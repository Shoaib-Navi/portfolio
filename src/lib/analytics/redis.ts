import {
  emptySummary,
  RECENT_MAX,
  RETENTION_DAYS,
  type AnalyticsStore,
  type Counts,
  type Hit,
  type LinkStats,
  type RecentHit,
  type Summary,
  type TrackingLink,
} from "./types";

// Upstash Redis over its REST API (plain fetch, no client package). Key layout:
//   a:pv:<day>   hash  path -> pageviews        a:uv:<day>  HyperLogLog of visitor hashes
//   a:src:<day>  hash  source -> pageviews      a:geo:<day> hash country -> pageviews
//   a:dev:<day>  hash  device -> pageviews      a:ev:<day>  hash "download" -> count
//   a:out:<day>  hash  host -> clicks           a:recent    list of the last hits (JSON)
//   a:links      hash  code -> link JSON        a:link:<code> hash of that link's stats

type Cmd = (string | number)[];

const DAY_KEYS = ["pv", "src", "geo", "dev", "ev", "out"] as const;

const toCounts = (flat: unknown): Counts => {
  // HGETALL over REST returns [field, value, field, value, …]
  const out: Counts = {};
  if (Array.isArray(flat)) for (let i = 0; i + 1 < flat.length; i += 2) out[String(flat[i])] = Number(flat[i + 1]) || 0;
  return out;
};

const add = (into: Counts, from: Counts) => {
  for (const [k, v] of Object.entries(from)) into[k] = (into[k] ?? 0) + v;
};

export class RedisAnalytics implements AnalyticsStore {
  readonly mode = "redis" as const;

  constructor(
    private readonly url: string,
    private readonly token: string,
  ) {}

  private async pipeline(cmds: Cmd[]): Promise<unknown[]> {
    if (!cmds.length) return [];
    const res = await fetch(`${this.url.replace(/\/$/, "")}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(cmds),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Analytics storage error ${res.status}`);
    const out = (await res.json()) as { result?: unknown; error?: string }[];
    const failed = out.find((r) => r.error);
    if (failed) throw new Error(`Analytics storage error: ${failed.error}`);
    return out.map((r) => r.result);
  }

  async record(hit: Hit) {
    const ttl = RETENTION_DAYS * 86400;
    const d = hit.day;
    const cmds: Cmd[] = [];
    const touch = (key: string) => cmds.push(["EXPIRE", key, ttl]);

    if (hit.kind === "pageview") {
      cmds.push(["HINCRBY", `a:pv:${d}`, hit.path, 1], ["PFADD", `a:uv:${d}`, hit.visitor]);
      cmds.push(["HINCRBY", `a:src:${d}`, hit.source ?? "Direct", 1]);
      cmds.push(["HINCRBY", `a:geo:${d}`, hit.country, 1], ["HINCRBY", `a:dev:${d}`, hit.device, 1]);
      ["pv", "uv", "src", "geo", "dev"].forEach((k) => touch(`a:${k}:${d}`));
    } else if (hit.kind === "download") {
      cmds.push(["HINCRBY", `a:ev:${d}`, "download", 1]);
      touch(`a:ev:${d}`);
    } else if (hit.target) {
      cmds.push(["HINCRBY", `a:out:${d}`, hit.target, 1]);
      touch(`a:out:${d}`);
    }

    if (hit.ref) {
      const key = `a:link:${hit.ref}`;
      const field = hit.kind === "download" ? "downloads" : hit.kind === "pageview" ? (hit.landing ? "opens" : "pages") : null;
      if (field) cmds.push(["HINCRBY", key, field, 1]);
      // A landing also counts as a page viewed.
      if (hit.landing) cmds.push(["HINCRBY", key, "pages", 1]);
      cmds.push(["HSETNX", key, "first", hit.at], ["HSET", key, "last", hit.at]);
    }

    const recent: RecentHit = {
      kind: hit.kind,
      at: hit.at,
      path: hit.path,
      source: hit.source,
      country: hit.country,
      device: hit.device,
      ref: hit.ref,
      target: hit.target,
    };
    cmds.push(["LPUSH", "a:recent", JSON.stringify(recent)], ["LTRIM", "a:recent", 0, RECENT_MAX - 1]);
    await this.pipeline(cmds);
  }

  async summary(days: string[]): Promise<Summary> {
    const s = emptySummary(days);
    const cmds: Cmd[] = [];
    for (const d of days) {
      for (const k of DAY_KEYS) cmds.push(["HGETALL", `a:${k}:${d}`]);
      cmds.push(["PFCOUNT", `a:uv:${d}`]);
    }
    // The visitor hash rotates daily, so a range's visitor total is the sum of daily uniques.
    const results = await this.pipeline(cmds);
    const per = DAY_KEYS.length + 1;
    days.forEach((d, i) => {
      const [pv, src, geo, dev, ev, out, uv] = results.slice(i * per, i * per + per);
      const pages = toCounts(pv);
      const pageviews = Object.values(pages).reduce((a, b) => a + b, 0);
      const visitors = Number(uv) || 0;
      s.daily[i] = { day: d, visitors, pageviews };
      s.visitors += visitors;
      s.pageviews += pageviews;
      s.downloads += toCounts(ev).download ?? 0;
      add(s.pages, pages);
      add(s.sources, toCounts(src));
      add(s.countries, toCounts(geo));
      add(s.devices, toCounts(dev));
      add(s.outbound, toCounts(out));
    });
    return s;
  }

  async recent(limit: number) {
    const [list] = await this.pipeline([["LRANGE", "a:recent", 0, limit - 1]]);
    return (Array.isArray(list) ? list : []).flatMap((raw) => {
      try {
        return [JSON.parse(String(raw)) as RecentHit];
      } catch {
        return [];
      }
    });
  }

  async links() {
    const [all] = await this.pipeline([["HGETALL", "a:links"]]);
    const flat = Array.isArray(all) ? all : [];
    const links: TrackingLink[] = [];
    for (let i = 0; i + 1 < flat.length; i += 2) {
      try {
        links.push(JSON.parse(String(flat[i + 1])) as TrackingLink);
      } catch {
        /* skip a corrupt entry */
      }
    }
    const stats = await this.pipeline(links.map((l) => ["HGETALL", `a:link:${l.code}`]));
    return links
      .map((l, i) => {
        const raw = stats[i];
        const map: Record<string, string> = {};
        if (Array.isArray(raw)) for (let j = 0; j + 1 < raw.length; j += 2) map[String(raw[j])] = String(raw[j + 1]);
        const st: LinkStats = {
          opens: Number(map.opens) || 0,
          pages: Number(map.pages) || 0,
          downloads: Number(map.downloads) || 0,
          first: map.first,
          last: map.last,
        };
        return { ...l, ...st };
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async hasLink(code: string) {
    const [n] = await this.pipeline([["HEXISTS", "a:links", code]]);
    return Number(n) === 1;
  }

  async saveLink(link: TrackingLink) {
    await this.pipeline([["HSET", "a:links", link.code, JSON.stringify(link)]]);
  }

  async deleteLink(code: string) {
    await this.pipeline([
      ["HDEL", "a:links", code],
      ["DEL", `a:link:${code}`],
    ]);
  }
}
