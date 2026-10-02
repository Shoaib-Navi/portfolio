import { projects } from "@/data/profile";

// Real, checkable project signals only: whether a live demo answers, and when a public
// repository was last pushed. Nothing is inferred or simulated; a check that can't run
// reports that it couldn't, and projects without public links report nothing.

export type LiveCheck = { url: string; ok: boolean; status?: number; ms?: number; error?: string };
export type RepoCheck = { url: string; pushedAt: string; archived: boolean };
export type ProjectStatus = { live?: LiveCheck; repo?: RepoCheck };
export type StatusReport = { checkedAt: string; projects: Record<string, ProjectStatus> };

const TIMEOUT_MS = 8000;

async function checkLive(url: string): Promise<LiveCheck> {
  const started = Date.now();
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "User-Agent": "portfolio-status-check (+https://mohd-shoaib.vercel.app)" },
    });
    // Only the status matters; don't download the page.
    await res.body?.cancel().catch(() => {});
    return { url, ok: res.ok, status: res.status, ms: Date.now() - started };
  } catch (e) {
    const timedOut = e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
    return { url, ok: false, error: timedOut ? `No response within ${TIMEOUT_MS / 1000} s` : "Couldn't connect" };
  }
}

async function checkRepo(url: string): Promise<RepoCheck | undefined> {
  const m = /^https:\/\/github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/.exec(url);
  if (!m) return undefined;
  const token = process.env.GITHUB_TOKEN;
  try {
    const res = await fetch(`https://api.github.com/repos/${m[1]}/${m[2]}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    // Private, renamed or rate-limited: show nothing rather than a guess.
    if (!res.ok) return undefined;
    const repo = (await res.json()) as { pushed_at?: string; archived?: boolean; private?: boolean };
    if (repo.private || !repo.pushed_at) return undefined;
    return { url, pushedAt: repo.pushed_at, archived: Boolean(repo.archived) };
  } catch {
    return undefined;
  }
}

/** Live and repo links are recognised by their labels in the project content. */
export function statusTargets() {
  return projects
    .map((p) => ({
      slug: p.slug,
      live: p.links.find((l) => /live|demo/i.test(l.label))?.href,
      repo: p.links.find((l) => /repo|code|github/i.test(l.label) && l.href.startsWith("https://github.com/"))?.href,
    }))
    .filter((t) => t.live || t.repo);
}

export async function checkProjects(): Promise<StatusReport> {
  const entries = await Promise.all(
    statusTargets().map(async (t) => {
      const [live, repo] = await Promise.all([t.live ? checkLive(t.live) : undefined, t.repo ? checkRepo(t.repo) : undefined]);
      const status: ProjectStatus = { ...(live ? { live } : {}), ...(repo ? { repo } : {}) };
      return [t.slug, status] as const;
    }),
  );
  return { checkedAt: new Date().toISOString(), projects: Object.fromEntries(entries) };
}
