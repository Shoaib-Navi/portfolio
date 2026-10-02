import { adminEnv } from "../env";
import {
  assertWritable,
  isContentPath,
  StoreError,
  type Change,
  type Commit,
  type DeployState,
  type Pending,
  type RepoPath,
  type Store,
} from "./types";

// GitHub-backed store (production). Every save is a commit on the `admin-draft` branch, so a
// draft survives closed tabs and other devices. Publishing takes the files the draft changed
// and lays them over the *current* live branch in one new commit, so code pushed to main in
// the meantime is never reverted. Vercel deploys that commit like any other push.

const API = "https://api.github.com";
const DRAFT_BRANCH = "admin-draft";

type GitRef = { object: { sha: string } };
type GitCommit = { sha: string; tree: { sha: string } };
type TreeEntry = { path: string; mode: "100644"; type: "blob"; sha: string | null };
type CompareFile = { filename: string; status: string; sha: string; previous_filename?: string };

export class GitHubStore implements Store {
  readonly mode = "github" as const;
  private readonly repo = adminEnv.githubRepo();
  private readonly branch = adminEnv.githubBranch();

  private async api<T>(route: string, init: RequestInit & { raw?: boolean } = {}): Promise<T> {
    const res = await fetch(`${API}/repos/${this.repo}${route}`, {
      ...init,
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${adminEnv.githubToken()}`,
        Accept: init.raw ? "application/vnd.github.raw+json" : "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
      },
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      const err = new StoreError(`GitHub ${init.method ?? "GET"} ${route} failed: ${res.status} ${detail.slice(0, 200)}`);
      (err as StoreError & { status?: number }).status = res.status;
      throw err;
    }
    if (init.raw) return new Uint8Array(await res.arrayBuffer()) as T;
    return (res.status === 204 ? null : await res.json()) as T;
  }

  private async refSha(branch: string): Promise<string | null> {
    try {
      const ref = await this.api<GitRef>(`/git/ref/heads/${encodeURIComponent(branch)}`);
      return ref.object.sha;
    } catch (e) {
      if ((e as { status?: number }).status === 404) return null;
      throw e;
    }
  }

  private async draftRef() {
    return this.refSha(DRAFT_BRANCH);
  }

  private async viewRef() {
    return (await this.draftRef()) ?? this.branch;
  }

  async read(path: RepoPath) {
    return this.readAt(path, await this.viewRef());
  }

  async readLive(path: RepoPath) {
    return this.readAt(path, this.branch);
  }

  private async readAt(path: RepoPath, ref: string) {
    try {
      return await this.api<Uint8Array>(`/contents/${encodePath(path)}?ref=${encodeURIComponent(ref)}`, { raw: true });
    } catch (e) {
      if ((e as { status?: number }).status === 404) return null;
      throw e;
    }
  }

  async list(dir: RepoPath) {
    try {
      const entries = await this.api<{ name: string; type: string }[]>(
        `/contents/${encodePath(dir)}?ref=${await this.viewRef()}`,
      );
      return entries.filter((e) => e.type === "file").map((e) => e.name).sort();
    } catch (e) {
      if ((e as { status?: number }).status === 404) return [];
      throw e;
    }
  }

  private async commitTree(parent: string, entries: TreeEntry[], message: string) {
    const base = await this.api<GitCommit>(`/git/commits/${parent}`);
    const tree = await this.api<{ sha: string }>(`/git/trees`, {
      method: "POST",
      body: JSON.stringify({ base_tree: base.tree.sha, tree: entries }),
    });
    const commit = await this.api<{ sha: string }>(`/git/commits`, {
      method: "POST",
      body: JSON.stringify({ message, tree: tree.sha, parents: [parent] }),
    });
    return commit.sha;
  }

  private async blob(content: Uint8Array) {
    const res = await this.api<{ sha: string }>(`/git/blobs`, {
      method: "POST",
      body: JSON.stringify({ content: Buffer.from(content).toString("base64"), encoding: "base64" }),
    });
    return res.sha;
  }

  async stage(changes: Change[], message: string) {
    changes.forEach((c) => assertWritable(c.path));
    let head = await this.draftRef();
    if (!head) {
      const live = await this.refSha(this.branch);
      if (!live) throw new StoreError(`Branch ${this.branch} not found in ${this.repo}`);
      await this.api(`/git/refs`, {
        method: "POST",
        body: JSON.stringify({ ref: `refs/heads/${DRAFT_BRANCH}`, sha: live }),
      });
      head = live;
    }
    const entries: TreeEntry[] = [];
    for (const c of changes) {
      // Deleting a file that does not exist in the draft makes GitHub reject the whole tree.
      if (c.content === null && (await this.read(c.path)) === null) continue;
      entries.push({ path: c.path, mode: "100644", type: "blob", sha: c.content ? await this.blob(c.content) : null });
    }
    if (!entries.length) return;
    const sha = await this.commitTree(head, entries, `draft: ${message}`);
    await this.api(`/git/refs/heads/${DRAFT_BRANCH}`, { method: "PATCH", body: JSON.stringify({ sha, force: false }) });
  }

  private async draftFiles(): Promise<CompareFile[]> {
    if (!(await this.draftRef())) return [];
    // Three-dot compare: only what the draft changed since it branched off.
    const res = await this.api<{ files?: CompareFile[] }>(`/compare/${this.branch}...${DRAFT_BRANCH}`);
    return (res.files ?? []).filter((f) => isContentPath(f.filename));
  }

  async pending(): Promise<Pending[]> {
    return (await this.draftFiles())
      .map((f) => ({
        path: f.filename,
        kind: f.status === "removed" ? ("deleted" as const) : f.status === "added" ? ("added" as const) : ("modified" as const),
      }))
      .sort((a, b) => a.path.localeCompare(b.path));
  }

  async publish(message: string) {
    const files = await this.draftFiles();
    if (!files.length) throw new StoreError("Nothing to publish");
    const live = await this.refSha(this.branch);
    if (!live) throw new StoreError(`Branch ${this.branch} not found`);
    const entries: TreeEntry[] = files.flatMap((f) => {
      const entry: TreeEntry = { path: f.filename, mode: "100644", type: "blob", sha: f.status === "removed" ? null : f.sha };
      // A rename shows up once; the old path must be removed explicitly.
      return f.status === "renamed" && f.previous_filename
        ? [entry, { path: f.previous_filename, mode: "100644", type: "blob", sha: null }]
        : [entry];
    });
    const sha = await this.commitTree(live, await this.dropMissingDeletes(entries, live), message);
    // force:false makes GitHub refuse if main moved between our read and this write.
    await this.api(`/git/refs/heads/${this.branch}`, { method: "PATCH", body: JSON.stringify({ sha, force: false }) });
    await this.discard();
    return { sha };
  }

  async discard() {
    try {
      await this.api(`/git/refs/heads/${DRAFT_BRANCH}`, { method: "DELETE" });
    } catch (e) {
      if ((e as { status?: number }).status !== 404 && (e as { status?: number }).status !== 422) throw e;
    }
  }

  private async blobSha(path: RepoPath, ref: string): Promise<string | null> {
    try {
      return (await this.api<{ sha: string }>(`/contents/${encodePath(path)}?ref=${encodeURIComponent(ref)}`)).sha;
    } catch (e) {
      if ((e as { status?: number }).status === 404) return null;
      throw e;
    }
  }

  /** GitHub rejects a whole tree if it deletes a path that isn't there, e.g. one main removed since. */
  private async dropMissingDeletes(entries: TreeEntry[], ref: string) {
    const keep: TreeEntry[] = [];
    for (const e of entries) if (e.sha !== null || (await this.blobSha(e.path, ref)) !== null) keep.push(e);
    if (!keep.length) throw new StoreError("Nothing left to change: those files are already gone");
    return keep;
  }

  async history(limit = 8): Promise<Commit[]> {
    const list = await this.api<{ sha: string; commit: { message: string; author: { name: string; date: string } } }[]>(
      `/commits?sha=${this.branch}&per_page=${limit}`,
    );
    return list.map((c) => ({
      sha: c.sha,
      message: c.commit.message.split("\n")[0],
      date: c.commit.author.date,
      author: c.commit.author.name,
    }));
  }

  async deployState(sha: string): Promise<DeployState> {
    // Vercel's GitHub integration reports each deployment as a commit status.
    const res = await this.api<{ state: string; total_count: number }>(`/commits/${sha}/status`);
    if (!res.total_count) return "unknown";
    return res.state === "success" ? "success" : res.state === "pending" ? "pending" : "failure";
  }

  async rollback(sha: string) {
    const commit = await this.api<{ parents: { sha: string }[]; files?: { filename: string; status: string }[]; commit: { message: string } }>(
      `/commits/${sha}`,
    );
    const parent = commit.parents[0]?.sha;
    if (!parent) throw new StoreError("That commit has no parent to restore from");
    const files = commit.files ?? [];
    const skipped = files.map((f) => f.filename).filter((p) => !isContentPath(p));
    const entries: TreeEntry[] = [];
    for (const f of files.filter((f) => isContentPath(f.filename))) {
      entries.push({ path: f.filename, mode: "100644", type: "blob", sha: await this.blobSha(f.filename, parent) });
    }
    if (!entries.length) throw new StoreError("That commit changed no content files");
    const live = await this.refSha(this.branch);
    if (!live) throw new StoreError(`Branch ${this.branch} not found`);
    const title = commit.commit.message.split("\n")[0];
    const newSha = await this.commitTree(live, await this.dropMissingDeletes(entries, live), `Revert content: ${title}\n\nRestores content changed in ${sha.slice(0, 7)}.`);
    await this.api(`/git/refs/heads/${this.branch}`, { method: "PATCH", body: JSON.stringify({ sha: newSha, force: false }) });
    return { sha: newSha, skipped };
  }
}

const encodePath = (p: string) => p.split("/").map(encodeURIComponent).join("/");
