import Link from "next/link";
import { adminSrc } from "@/lib/admin/paths";
import { ago, Deploy, Findings, LoadError, PageHead } from "@/components/admin/ui";
import { errorText, loadAll } from "@/lib/admin/data";
import { healthChecks } from "@/lib/admin/health";
import { getStore, type DeployState } from "@/lib/admin/store";

export default async function Overview() {
  const store = getStore();
  try {
    const data = await loadAll(store);
    const [findings, pending, history] = await Promise.all([healthChecks(store, data), store.pending(), store.history(5)]);
    const deploy: DeployState = history[0] ? await store.deployState(history[0].sha).catch(() => "unknown" as const) : "unknown";
    const tools = data.skills.flatMap((g) => g.tools);
    const live = data.resumes.versions.find((v) => v.id === data.resumes.live);
    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

    return (
      <>
        <PageHead
          crumb={[{ label: "Dashboard" }]}
          title={`${greeting}, ${data.profile.name.split(" ").pop()}`}
          actions={
            <>
              <a href="/" target="_blank" rel="noopener" className="btn btn--ghost">
                ↗ View site
              </a>
              <Link href="/admin/publish" className={`btn${pending.length ? " btn--pri" : ""}`}>
                {pending.length ? `Publish ${pending.length} change${pending.length === 1 ? "" : "s"}` : "Nothing to publish"}
              </Link>
            </>
          }
        />

        <div className="kpis">
          <div className="kpi">
            <b>{data.projects.length}</b>
            <span>Projects</span>
          </div>
          <div className="kpi">
            <b>{tools.length}</b>
            <span>Skills · {tools.filter((t) => t.logo).length} logos</span>
          </div>
          <div className="kpi">
            <b style={{ fontSize: "1.125rem", minHeight: "2.4rem" }}>{live?.label ?? "—"}</b>
            <span>Live résumé</span>
          </div>
          <div className="kpi">
            <b style={{ fontSize: "1.125rem", minHeight: "2.4rem" }}>
              <Deploy state={deploy} />
            </b>
            <span>Last deploy{history[0] ? ` · ${ago(history[0].date)}` : ""}</span>
          </div>
        </div>

        <div className="grid grid--main">
          <section className="card">
            <div className="card__head">
              <h2>Projects</h2>
              <Link href="/admin/projects/new" className="btn btn--sm">
                + New project
              </Link>
            </div>
            <ul className="rows">
              {data.projects.map((p) => (
                <li key={p.slug} className="row">
                  {p.shots[0] ? (
                    <img className="thumb" src={adminSrc(p.shots[0])} alt="" />
                  ) : (
                    <span className="thumb" />
                  )}
                  <span className="row__main">
                    <Link href={`/admin/projects/${p.slug}`} title={p.name}>
                      {p.name}
                    </Link>
                    <span className="muted">{p.tagline}</span>
                  </span>
                  {!p.verified ? <span className="pill pill--warn">Unverified</span> : null}
                  {p.status ? <span className={`pill ${/live/i.test(p.status) ? "pill--ok" : "pill--info"}`}>{p.status.split("·")[0].trim()}</span> : null}
                </li>
              ))}
            </ul>
          </section>

          <section className="card">
            <div className="card__head">
              <h2>Health checks</h2>
            </div>
            <Findings items={findings} />
          </section>
        </div>

        <div className="grid grid--2" style={{ marginTop: 18 }}>
          <section className="card">
            <div className="card__head">
              <h2>Pending changes</h2>
              <p>Saved to the draft, not on the live site yet.</p>
            </div>
            {pending.length ? (
              <div className="chips">
                {pending.map((c) => (
                  <span key={c.path} className="chip chip--text">
                    {c.kind === "added" ? "＋" : c.kind === "deleted" ? "−" : "✎"} {c.path.replace(/^public\//, "/")}
                  </span>
                ))}
              </div>
            ) : (
              <p className="empty">No pending changes.</p>
            )}
          </section>
          <section className="card">
            <div className="card__head">
              <h2>Recent commits</h2>
            </div>
            {history.length ? (
              <ul className="rows">
                {history.map((c) => (
                  <li key={c.sha} className="row">
                    <span className="row__main">
                      <b title={c.message}>{c.message}</b>
                      <span className="muted">
                        <span className="code">{c.sha.slice(0, 7)}</span> · {ago(c.date)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty">No history available.</p>
            )}
          </section>
        </div>
      </>
    );
  } catch (e) {
    return (
      <>
        <PageHead title="Overview" />
        <LoadError message={errorText(e)} />
      </>
    );
  }
}
