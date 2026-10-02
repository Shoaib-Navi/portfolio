/** A repo-relative path, always with forward slashes, e.g. "content/projects.json". */
export type RepoPath = string;

export type Change = { path: RepoPath; content: Uint8Array | null };
export type Pending = { path: RepoPath; kind: "added" | "modified" | "deleted" };
export type Commit = { sha: string; message: string; date: string; author: string };
export type DeployState = "success" | "pending" | "failure" | "unknown";

export interface Store {
  readonly mode: "github" | "local";
  /** The admin's view: pending draft edits layered over the live branch. */
  read(path: RepoPath): Promise<Uint8Array | null>;
  /** The file as it is on the live branch, ignoring the draft. */
  readLive(path: RepoPath): Promise<Uint8Array | null>;
  /** File names (not paths) directly inside a folder, in the draft view. */
  list(dir: RepoPath): Promise<string[]>;
  /** Record edits in the draft. Nothing reaches the live site until publish(). */
  stage(changes: Change[], message: string): Promise<void>;
  pending(): Promise<Pending[]>;
  /** One commit on the live branch containing every pending change. */
  publish(message: string): Promise<{ sha: string | null }>;
  discard(): Promise<void>;
  history(limit?: number): Promise<Commit[]>;
  deployState(sha: string): Promise<DeployState>;
  /** New commit that restores the files a previous commit changed. */
  rollback(sha: string): Promise<{ sha: string | null; skipped: RepoPath[] }>;
}

export class StoreError extends Error {}

// Only content and the public folders the admin manages are writable. Everything else in the
// repo (code, config) is off limits, whatever a request asks for.
const WRITABLE = [
  /^content\/[a-z]+\.json$/,
  /^public\/(?:logos|shots|pfp|resumes)\/[a-z0-9][a-z0-9._-]*\.(?:svg|webp|png|jpg|jpeg|pdf)$/,
  /^public\/resume\.pdf$/,
];

export function assertWritable(path: RepoPath) {
  if (path.includes("..") || !WRITABLE.some((re) => re.test(path))) {
    throw new StoreError(`Refusing to write ${path}`);
  }
}

/** Paths a rollback may touch: the same set the admin can write. */
export const isContentPath = (path: RepoPath) => WRITABLE.some((re) => re.test(path));
