import type { Metadata } from "next";
import Link from "next/link";
import { TrackingLinks, type LinkTarget } from "@/components/admin/TrackingLinks";
import { ago, LoadError, PageHead } from "@/components/admin/ui";
import { VisitorsChart } from "@/components/admin/VisitorsChart";
import { awards, notes, profile, projects } from "@/data/profile";
import { errorText } from "@/lib/admin/data";
import { getAnalytics, lastDays, type Counts, type RecentHit } from "@/lib/analytics";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = { title: "Analytics" };

const RANGES = [7, 30, 90] as const;

const PAGE_NAMES: Record<string, string> = {
  "/": "Home",
  "/about": "About",
  "/skills": "Skills",
  "/experience": "Experience",
  "/engineering": "Engineering",
  "/contact": "Contact",
  "/work": "All work",
  "/notes": "All notes",
  "/resume.pdf": "Résumé PDF",
  ...Object.fromEntries(projects.map((p) => [`/work/${p.slug}`, `${p.name} write-up`])),
  ...Object.fromEntries(notes.map((n) => [`/notes/${n.slug}`, n.title])),
};

// Outbound clicks are stored as host + path; name the ones that are links from the content.
const hostPath = (href: string) => {
  try {
    const u = new URL(href);
    return `${u.hostname.replace(/^www\./, "")}${u.pathname.replace(/\/$/, "")}`;
  } catch {
    return href;
  }
};
const LINK_NAMES = new Map<string, string>([
  ["email", "Email (mailto link)"],
  ...profile.links.map((l): [string, string] => [hostPath(l.href), `${l.label} profile`]),
  ...projects.flatMap((p) => p.links.map((l): [string, string] => [hostPath(l.href), `${p.name} · ${l.label}`])),
  ...awards.flatMap((a) => (a.href ? [[hostPath(a.href), a.title] as [string, string]] : [])),
]);
const linkName = (k: string) => LINK_NAMES.get(k) ?? k;

/** Where a tracking link can point, for the create form. */
const LINK_TARGETS: LinkTarget[] = [
  { value: "/", label: "Home page" },
  ...projects.map((p) => ({ value: `/work/${p.slug}`, label: `${p.name} write-up` })),
  ...notes.filter((n) => n.verified).map((n) => ({ value: `/notes/${n.slug}`, label: `Note: ${n.title}` })),
  { value: "/resume.pdf", label: "Résumé PDF (direct download)" },
];

const pick = (c: Counts, test: (k: string) => boolean) => Object.fromEntries(Object.entries(c).filter(([k]) => test(k)));
const isProject = (k: string) => /^\/work\/./.test(k);
const isNote = (k: string) => /^\/notes\/./.test(k);

/** "↑ 24%" against the previous period of the same length; nothing when there's no baseline. */
function Delta({ now, before, range }: { now: number; before: number; range: number }) {
  if (!before && !now) return null;
  const up = now >= before;
  const text = before ? `${up ? "↑" : "↓"} ${Math.abs(Math.round(((now - before) / before) * 100))}%` : "New";
  return (
    <small className={`delta ${now === before ? "" : up ? "delta--up" : "delta--down"}`} title={`Previous ${range} days: ${before}`}>
      {text} <span>vs previous {range} days</span>
    </small>
  );
}

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });
const countryName = (code: string) => {
  if (!/^[A-Z]{2}$/.test(code)) return "Unknown";
  try {
    return regionNames.of(code) ?? code;
  } catch {
    return code;
  }
};

const sorted = (c: Counts) => Object.entries(c).sort((a, b) => b[1] - a[1]);

function TopList({ title, data, name = (k) => k, empty }: { title: string; data: Counts; name?: (k: string) => string; empty: string }) {
  const rows = sorted(data).slice(0, 8);
  const max = rows[0]?.[1] ?? 0;
  return (
    <section className="card">
      <div className="card__head">
        <h2>{title}</h2>
      </div>
      {rows.length ? (
        <ul className="toplist">
          {rows.map(([k, v]) => (
            <li key={k}>
              <span className="toplist__label" title={name(k)}>
                {name(k)}
              </span>
              <span className="toplist__value">{v.toLocaleString("en-IN")}</span>
              <span className="toplist__track" aria-hidden>
                <span className="toplist__fill" style={{ width: `${max ? Math.max(3, (v / max) * 100) : 0}%` }} />
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="empty">{empty}</p>
      )}
    </section>
  );
}

function activityText(h: RecentHit, linkLabels: Map<string, string>) {
  const page = PAGE_NAMES[h.path] ?? h.path;
  const what =
    h.kind === "open"
      ? `Opened a tracking link to ${PAGE_NAMES[h.target ?? "/"] ?? h.target}`
      : h.kind === "download"
        ? `Downloaded the résumé (from ${page})`
        : h.kind === "outbound"
          ? `Clicked ${linkName(h.target ?? "")} (from ${page})`
          : `Viewed ${page}`;
  const via = h.ref ? linkLabels.get(h.ref) ?? h.ref : h.source && h.source !== "Direct" ? h.source : null;
  return { what, via };
}

type Props = { searchParams: Promise<{ range?: string }> };

export default async function AnalyticsPage({ searchParams }: Props) {
  const { range: rangeParam } = await searchParams;
  const range = RANGES.find((r) => String(r) === rangeParam) ?? 30;
  const store = getAnalytics();

  let data;
  try {
    const both = lastDays(range * 2);
    const [summary, previous, recent, links] = await Promise.all([
      store.summary(both.slice(range)),
      store.summary(both.slice(0, range)),
      store.recent(25),
      store.links(),
    ]);
    data = { summary, previous, recent, links };
  } catch (e) {
    return (
      <>
        <PageHead title="Analytics" />
        <LoadError message={errorText(e)} />
      </>
    );
  }
  const { summary: s, previous: prev, recent, links } = data;
  const topSource = sorted(s.sources).find(([k]) => k !== "Direct")?.[0] ?? (s.pageviews ? "Direct" : "—");
  const labels = new Map(links.map((l) => [l.code, l.label]));

  return (
    <>
      <PageHead
        crumb={[{ label: "Site" }]}
        title="Analytics"
        actions={
          <div className="range" role="group" aria-label="Date range">
            {RANGES.map((r) => (
              <Link key={r} href={`/admin/analytics?range=${r}`} className={`chip chip--text${r === range ? " chip--on" : ""}`} aria-current={r === range ? "true" : undefined}>
                {r} days
              </Link>
            ))}
          </div>
        }
      >
        Who visits your portfolio, anonymously: no cookies, no IP addresses stored. Your own visits aren’t counted while you’re
        signed in here.
      </PageHead>

      {store.mode === "off" ? (
        <div className="banner banner--info" role="status" style={{ display: "block" }}>
          <p>
            <b>Analytics storage isn’t connected on this deployment, so visits aren’t being recorded yet.</b>
          </p>
          <ol style={{ margin: "8px 0 0", paddingLeft: 20 }}>
            <li>
              In the Vercel dashboard open this project → <b>Storage</b> → <b>Create Database</b> → <b>Upstash for Redis</b> (free
              plan) and connect it to the project.
            </li>
            <li>
              That adds <span className="code">KV_REST_API_URL</span> and <span className="code">KV_REST_API_TOKEN</span>{" "}
              automatically. Redeploy, and visits start appearing here.
            </li>
          </ol>
        </div>
      ) : store.mode === "file" ? (
        <div className="banner banner--info" role="status">
          <span>
            Local mode: data is kept in <span className="code">.analytics/</span> on this computer. To see your own test visits,
            open the site in a private window (you’re skipped while signed in).
          </span>
        </div>
      ) : null}

      <div className="kpis">
        <div className="kpi">
          <b>{s.visitors.toLocaleString("en-IN")}</b>
          <span>Unique visitors</span>
          <Delta now={s.visitors} before={prev.visitors} range={range} />
        </div>
        <div className="kpi">
          <b>{s.pageviews.toLocaleString("en-IN")}</b>
          <span>Page views</span>
          <Delta now={s.pageviews} before={prev.pageviews} range={range} />
        </div>
        <div className="kpi">
          <b>{s.downloads.toLocaleString("en-IN")}</b>
          <span>Résumé downloads</span>
          <Delta now={s.downloads} before={prev.downloads} range={range} />
        </div>
        <div className="kpi">
          <b style={{ fontSize: "1.125rem", minHeight: "2.4rem" }}>{topSource}</b>
          <span>Top source</span>
        </div>
      </div>

      <section className="card">
        <div className="card__head">
          <h2>Daily visitors</h2>
          <p>Unique visitors per day, last {range} days. Hover a day for details.</p>
        </div>
        <VisitorsChart daily={s.daily} />
      </section>

      <div className="grid grid--3" style={{ marginTop: 18 }}>
        <TopList title="Most viewed projects" data={pick(s.pages, isProject)} name={(k) => PAGE_NAMES[k]?.replace(/ write-up$/, "") ?? k} empty="No project views yet." />
        <TopList title="Where visitors come from" data={s.sources} empty="No visits yet." />
        <TopList title="Important link clicks" data={s.outbound} name={linkName} empty="No clicks yet on GitHub, LinkedIn, live demos or email." />
        <TopList title="Pages" data={pick(s.pages, (k) => !isProject(k) && !isNote(k))} name={(k) => PAGE_NAMES[k] ?? k} empty="No page views yet." />
        {notes.length ? <TopList title="Most read notes" data={pick(s.pages, isNote)} name={(k) => PAGE_NAMES[k] ?? k} empty="No notes read yet." /> : null}
        <TopList title="Countries" data={s.countries} name={countryName} empty="No visits yet." />
        <TopList title="Devices" data={s.devices} name={(k) => k[0].toUpperCase() + k.slice(1)} empty="No visits yet." />
      </div>

      <div className="grid grid--main" style={{ marginTop: 18 }}>
        <TrackingLinks links={links} siteUrl={SITE_URL} enabled={store.mode !== "off"} now={Date.now()} targets={LINK_TARGETS} />
        <section className="card">
          <div className="card__head">
            <h2>Recent activity</h2>
            <p>The latest visits and clicks, newest first.</p>
          </div>
          {recent.length ? (
            <ul className="rows">
              {recent.map((h, i) => {
                const { what, via } = activityText(h, labels);
                return (
                  <li key={`${h.at}-${i}`} className="row">
                    <span className="row__main" style={{ flexBasis: "100%" }}>
                      <b style={{ whiteSpace: "normal" }}>{what}</b>
                      <span className="muted">
                        {ago(h.at)} · {countryName(h.country)} · {h.device}
                        {via ? ` · via ${via}` : ""}
                      </span>
                    </span>
                    {h.ref ? <span className="pill pill--ok">Tracking link</span> : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="empty">Nothing yet.</p>
          )}
        </section>
      </div>
    </>
  );
}
