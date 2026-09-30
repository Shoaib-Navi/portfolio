import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dayOf, deviceOf, isBot, lastDays, sourceOf, visitorHash } from "./index";
import { RedisAnalytics } from "./redis";
import type { Hit } from "./types";

describe("sourceOf", () => {
  it("names well-known referrers and falls back to the host", () => {
    expect(sourceOf("https://www.linkedin.com/feed/", "me.dev")).toBe("LinkedIn");
    expect(sourceOf("https://lnkd.in/abc", "me.dev")).toBe("LinkedIn");
    expect(sourceOf("https://github.com/Shoaib-Navi", "me.dev")).toBe("GitHub");
    expect(sourceOf("https://www.google.co.in/", "me.dev")).toBe("Google");
    expect(sourceOf("https://mail.google.com/mail/u/0", "me.dev")).toBe("Email");
    expect(sourceOf("https://blog.example.org/post", "me.dev")).toBe("blog.example.org");
  });

  it("treats no referrer, bad URLs and our own host as Direct", () => {
    expect(sourceOf(undefined, "me.dev")).toBe("Direct");
    expect(sourceOf("not a url", "me.dev")).toBe("Direct");
    expect(sourceOf("https://www.me.dev/work", "me.dev")).toBe("Direct");
    expect(sourceOf("http://localhost:3000/about", "localhost:3000")).toBe("Direct");
  });
});

describe("isBot / deviceOf", () => {
  it("drops crawlers, link previews and empty agents", () => {
    for (const ua of ["", "Googlebot/2.1", "LinkedInBot/1.0", "Slackbot-LinkExpanding", "WhatsApp/2.23", "curl/8.4", "HeadlessChrome"])
      expect(isBot(ua)).toBe(true);
    expect(isBot("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128 Safari/537.36")).toBe(false);
  });

  it("classifies devices", () => {
    expect(deviceOf("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148")).toBe("mobile");
    expect(deviceOf("Mozilla/5.0 (Linux; Android 14; Pixel 8) Mobile Safari")).toBe("mobile");
    expect(deviceOf("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)")).toBe("tablet");
    expect(deviceOf("Mozilla/5.0 (Linux; Android 13; SM-X700) Safari")).toBe("tablet");
    expect(deviceOf("Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)")).toBe("desktop");
  });
});

describe("visitorHash", () => {
  it("is stable within a day, rotates across days, and never contains the IP", () => {
    const a = visitorHash("203.0.113.9", "UA", "2026-10-01");
    expect(visitorHash("203.0.113.9", "UA", "2026-10-01")).toBe(a);
    expect(visitorHash("203.0.113.9", "UA", "2026-10-02")).not.toBe(a);
    expect(visitorHash("203.0.113.10", "UA", "2026-10-01")).not.toBe(a);
    expect(a).toMatch(/^[0-9a-f]{16}$/);
    expect(a).not.toContain("203");
  });
});

describe("days", () => {
  it("buckets by the analytics time zone and lists the range oldest first", () => {
    process.env.ANALYTICS_TZ = "Asia/Kolkata";
    // 20:00 UTC on 30 Sep is 01:30 on 1 Oct in India.
    expect(dayOf(new Date("2026-09-30T20:00:00Z"))).toBe("2026-10-01");
    const days = lastDays(7, new Date("2026-10-01T06:00:00Z"));
    expect(days).toHaveLength(7);
    expect(days[0]).toBe("2026-09-25");
    expect(days[6]).toBe("2026-10-01");
  });
});

/* ---------------------------- Redis store ---------------------------- */

// Minimal Upstash REST pipeline emulator: hashes, HyperLogLog (as sets), lists.
function fakeUpstash() {
  const hashes = new Map<string, Map<string, string>>();
  const sets = new Map<string, Set<string>>();
  const lists = new Map<string, string[]>();
  const h = (k: string) => hashes.get(k) ?? hashes.set(k, new Map()).get(k)!;
  const run = (cmd: (string | number)[]): unknown => {
    const [op, key, ...a] = cmd.map(String);
    switch (op) {
      case "HINCRBY": {
        const m = h(key);
        const v = Number(m.get(a[0]) ?? 0) + Number(a[1]);
        m.set(a[0], String(v));
        return v;
      }
      case "HSET":
        h(key).set(a[0], a[1]);
        return 1;
      case "HSETNX":
        if (h(key).has(a[0])) return 0;
        h(key).set(a[0], a[1]);
        return 1;
      case "HGETALL":
        return [...(hashes.get(key) ?? new Map())].flat();
      case "HEXISTS":
        return hashes.get(key)?.has(a[0]) ? 1 : 0;
      case "HDEL":
        return hashes.get(key)?.delete(a[0]) ? 1 : 0;
      case "DEL":
        hashes.delete(key);
        return 1;
      case "PFADD":
        (sets.get(key) ?? sets.set(key, new Set()).get(key)!).add(a[0]);
        return 1;
      case "PFCOUNT":
        return sets.get(key)?.size ?? 0;
      case "LPUSH":
        (lists.get(key) ?? lists.set(key, []).get(key)!).unshift(a[0]);
        return 1;
      case "LTRIM":
        lists.set(key, (lists.get(key) ?? []).slice(Number(a[0]), Number(a[1]) + 1));
        return "OK";
      case "LRANGE":
        return (lists.get(key) ?? []).slice(Number(a[0]), Number(a[1]) + 1);
      case "EXPIRE":
        return 1;
      default:
        throw new Error(`fake upstash: ${op} not implemented`);
    }
  };
  const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
    expect(url).toBe("https://redis.example/pipeline");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer tok");
    const cmds = JSON.parse(String(init.body)) as (string | number)[][];
    return new Response(JSON.stringify(cmds.map((c) => ({ result: run(c) }))), { status: 200 });
  });
  return { fetchMock, hashes };
}

const hit = (over: Partial<Hit>): Hit => ({
  kind: "pageview",
  day: "2026-10-01",
  at: "2026-10-01T10:00:00.000Z",
  path: "/",
  source: "Direct",
  country: "IN",
  device: "desktop",
  visitor: "v1",
  ...over,
});

describe("RedisAnalytics", () => {
  let fake: ReturnType<typeof fakeUpstash>;
  beforeEach(() => {
    fake = fakeUpstash();
    vi.stubGlobal("fetch", fake.fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("aggregates page views, unique visitors, sources, downloads and outbound clicks", async () => {
    const store = new RedisAnalytics("https://redis.example/", "tok");
    await store.record(hit({ visitor: "v1", source: "LinkedIn" }));
    await store.record(hit({ visitor: "v1", path: "/work/carepulse" }));
    await store.record(hit({ visitor: "v2", country: "US", device: "mobile", day: "2026-10-02" }));
    await store.record(hit({ kind: "download", path: "/about" }));
    await store.record(hit({ kind: "outbound", target: "github.com" }));

    const s = await store.summary(["2026-10-01", "2026-10-02"]);
    expect(s.pageviews).toBe(3);
    expect(s.visitors).toBe(2);
    expect(s.daily).toEqual([
      { day: "2026-10-01", visitors: 1, pageviews: 2 },
      { day: "2026-10-02", visitors: 1, pageviews: 1 },
    ]);
    expect(s.pages).toEqual({ "/": 2, "/work/carepulse": 1 });
    expect(s.sources).toEqual({ LinkedIn: 1, Direct: 2 });
    expect(s.countries).toEqual({ IN: 2, US: 1 });
    expect(s.devices).toEqual({ desktop: 2, mobile: 1 });
    expect(s.downloads).toBe(1);
    expect(s.outbound).toEqual({ "github.com": 1 });

    const recent = await store.recent(10);
    expect(recent).toHaveLength(5);
    expect(recent[0]).toMatchObject({ kind: "outbound", target: "github.com" });
    // The feed never carries the visitor hash.
    expect(JSON.stringify(recent)).not.toContain("v1");
  });

  it("credits a tracking link: one open per landing, pages and downloads after it", async () => {
    const store = new RedisAnalytics("https://redis.example", "tok");
    await store.saveLink({ code: "acme", label: "Acme · Backend", createdAt: "2026-10-01T09:00:00.000Z" });
    expect(await store.hasLink("acme")).toBe(true);
    expect(await store.hasLink("other")).toBe(false);

    await store.record(hit({ ref: "acme", landing: true, at: "2026-10-01T10:00:00.000Z" }));
    await store.record(hit({ ref: "acme", path: "/work", at: "2026-10-01T10:01:00.000Z" }));
    await store.record(hit({ ref: "acme", kind: "download", at: "2026-10-01T10:02:00.000Z" }));

    const [link] = await store.links();
    expect(link).toMatchObject({
      code: "acme",
      label: "Acme · Backend",
      opens: 1,
      pages: 2,
      downloads: 1,
      first: "2026-10-01T10:00:00.000Z",
      last: "2026-10-01T10:02:00.000Z",
    });

    await store.deleteLink("acme");
    expect(await store.links()).toEqual([]);
    expect(fake.hashes.has("a:link:acme")).toBe(false);
  });

  it("surfaces storage errors", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 401 })));
    await expect(new RedisAnalytics("https://redis.example", "tok").recent(5)).rejects.toThrow("401");
  });
});
