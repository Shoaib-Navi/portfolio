import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { assertWritable, StoreError, type Change, type Pending, type RepoPath, type Store } from "./types";

// Local development store. Drafts live in .admin-draft/ (gitignored) mirroring repo paths;
// deletions are listed in .admin-draft/.deleted.json. Publishing copies them into the repo,
// where you review and commit them with git as usual.

const run = promisify(execFile);
const ROOT = process.cwd();
const DRAFT = path.join(ROOT, ".admin-draft");
const DELETED = path.join(DRAFT, ".deleted.json");

const abs = (base: string, p: RepoPath) => path.join(base, ...p.split("/"));

async function readOrNull(file: string): Promise<Uint8Array | null> {
  try {
    return new Uint8Array(await fs.readFile(file));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw e;
  }
}

async function deletedSet(): Promise<Set<RepoPath>> {
  const raw = await readOrNull(DELETED);
  return new Set(raw ? (JSON.parse(Buffer.from(raw).toString()) as RepoPath[]) : []);
}

async function draftFiles(dir = DRAFT, prefix = ""): Promise<RepoPath[]> {
  let entries: import("node:fs").Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const out: RepoPath[] = [];
  for (const e of entries) {
    const rel = prefix ? `${prefix}/${e.name}` : e.name;
    if (e.isDirectory()) out.push(...(await draftFiles(path.join(dir, e.name), rel)));
    else if (rel !== ".deleted.json") out.push(rel);
  }
  return out;
}

const same = (a: Uint8Array | null, b: Uint8Array | null) =>
  a !== null && b !== null && Buffer.from(a).equals(Buffer.from(b));

export class LocalStore implements Store {
  readonly mode = "local" as const;

  private guard() {
    // Vercel's filesystem is read-only; saving there needs the GitHub store.
    if (process.env.VERCEL) throw new StoreError("Saving needs GITHUB_TOKEN and GITHUB_REPO on this deployment.");
  }

  async read(p: RepoPath) {
    if ((await deletedSet()).has(p)) return null;
    return (await readOrNull(abs(DRAFT, p))) ?? readOrNull(abs(ROOT, p));
  }

  async list(dir: RepoPath) {
    const names = new Set<string>();
    const deleted = await deletedSet();
    for (const base of [ROOT, DRAFT]) {
      try {
        for (const e of await fs.readdir(abs(base, dir), { withFileTypes: true })) if (e.isFile()) names.add(e.name);
      } catch {
        /* folder may not exist in the draft */
      }
    }
    return [...names].filter((n) => !deleted.has(`${dir}/${n}`)).sort();
  }

  async stage(changes: Change[]) {
    this.guard();
    changes.forEach((c) => assertWritable(c.path));
    const deleted = await deletedSet();
    for (const c of changes) {
      const live = await readOrNull(abs(ROOT, c.path));
      const draftFile = abs(DRAFT, c.path);
      if (c.content === null) {
        await fs.rm(draftFile, { force: true });
        if (live) deleted.add(c.path);
      } else {
        deleted.delete(c.path);
        // Writing back the live bytes simply cancels the draft for that file.
        if (same(live, c.content)) await fs.rm(draftFile, { force: true });
        else {
          await fs.mkdir(path.dirname(draftFile), { recursive: true });
          await fs.writeFile(draftFile, c.content);
        }
      }
    }
    await fs.mkdir(DRAFT, { recursive: true });
    await fs.writeFile(DELETED, JSON.stringify([...deleted], null, 2));
  }

  async pending(): Promise<Pending[]> {
    const out: Pending[] = [];
    for (const p of await draftFiles()) {
      out.push({ path: p, kind: (await readOrNull(abs(ROOT, p))) ? "modified" : "added" });
    }
    for (const p of await deletedSet()) out.push({ path: p, kind: "deleted" });
    return out.sort((a, b) => a.path.localeCompare(b.path));
  }

  async publish() {
    this.guard();
    const changes = await this.pending();
    if (!changes.length) throw new StoreError("Nothing to publish");
    for (const c of changes) {
      assertWritable(c.path);
      const target = abs(ROOT, c.path);
      if (c.kind === "deleted") await fs.rm(target, { force: true });
      else {
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.copyFile(abs(DRAFT, c.path), target);
      }
    }
    await this.discard();
    return { sha: null };
  }

  async discard() {
    await fs.rm(DRAFT, { recursive: true, force: true });
  }

  async history(limit = 8) {
    try {
      const { stdout } = await run("git", ["log", `-${limit}`, "--format=%H%x1f%s%x1f%cI%x1f%an"], { cwd: ROOT });
      return stdout
        .trim()
        .split("\n")
        .filter(Boolean)
        .map((line) => {
          const [sha, message, date, author] = line.split("\x1f");
          return { sha, message, date, author };
        });
    } catch {
      return [];
    }
  }

  async deployState() {
    return "unknown" as const;
  }

  async rollback(): Promise<{ sha: string | null; skipped: RepoPath[] }> {
    throw new StoreError("Rollback runs against GitHub. Locally, use git revert.");
  }
}
