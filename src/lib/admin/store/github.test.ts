import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GitHubStore } from "./github";
import { StoreError } from "./types";

/* ------------------------------ fake GitHub ------------------------------ */

// Just enough of the REST API for GitHubStore: trees are flat Map<path, blobSha> snapshots.

type Tree = Map<string, string>;
type FakeCommit = { sha: string; tree: string; parents: string[]; message: string };

const enc = (s: string) => new TextEncoder().encode(s);
const dec = (b: Uint8Array | null) => (b ? new TextDecoder().decode(b) : null);

class FakeGitHub {
  blobs = new Map<string, Uint8Array>();
  trees = new Map<string, Tree>();
  commits = new Map<string, FakeCommit>();
  refs = new Map<string, string>();
  statuses = new Map<string, { state: string; total_count: number }>();
  requests: string[] = [];
  /** Runs before each request is handled; lets a test move main mid-operation. */
  onRequest?: (method: string, route: string) => void;
  private n = 0;

  constructor(files: Record<string, string>) {
    this.refs.set("main", this.commit(this.newTree(new Map(), files), [], "initial"));
  }

  private id(prefix: string) {
    return `${prefix}${(++this.n).toString().padStart(6, "0")}`;
  }

  putBlob(bytes: Uint8Array) {
    const sha = createHash("sha1").update(bytes).digest("hex");
    this.blobs.set(sha, bytes);
    return sha;
  }

  private newTree(base: Tree, files: Record<string, string | null>) {
    const tree = new Map(base);
    for (const [path, text] of Object.entries(files)) {
      if (text === null) tree.delete(path);
      else tree.set(path, this.putBlob(enc(text)));
    }
    const sha = this.id("tree");
    this.trees.set(sha, tree);
    return sha;
  }

  private commit(tree: string, parents: string[], message: string) {
    const sha = this.id("c");
    this.commits.set(sha, { sha, tree, parents, message });
    return sha;
  }

  /** A direct push to a branch, e.g. a code change landing on main. */
  push(branch: string, files: Record<string, string | null>, message = "push") {
    const head = this.refs.get(branch)!;
    const sha = this.commit(this.newTree(this.treeOf(head), files), [head], message);
    this.refs.set(branch, sha);
    return sha;
  }

  treeOf(commitSha: string) {
    return this.trees.get(this.commits.get(commitSha)!.tree)!;
  }

  /** File contents at a branch or commit. */
  file(ref: string, path: string) {
    const sha = this.treeOf(this.resolve(ref)!).get(path);
    return sha ? dec(this.blobs.get(sha)!) : null;
  }

  resolve(ref: string) {
    return this.refs.get(ref) ?? (this.commits.has(ref) ? ref : null);
  }

  private ancestors(sha: string) {
    const seen: string[] = [];
    const queue = [sha];
    while (queue.length) {
      const s = queue.shift()!;
      if (seen.includes(s)) continue;
      seen.push(s);
      queue.push(...this.commits.get(s)!.parents);
    }
    return seen;
  }

  private diff(before: Tree, after: Tree) {
    const files: { filename: string; status: string; sha: string }[] = [];
    for (const [path, sha] of after) {
      if (!before.has(path)) files.push({ filename: path, status: "added", sha });
      else if (before.get(path) !== sha) files.push({ filename: path, status: "modified", sha });
    }
    for (const [path, sha] of before) if (!after.has(path)) files.push({ filename: path, status: "removed", sha });
    return files;
  }

  fetch = async (input: string | URL | Request, init: RequestInit = {}): Promise<Response> => {
    const url = new URL(String(input));
    const method = init.method ?? "GET";
    const prefix = "/repos/o/r";
    expect(url.origin).toBe("https://api.github.com");
    expect(url.pathname.startsWith(prefix)).toBe(true);
    const route = decodeURIComponent(url.pathname.slice(prefix.length));
    const accept = (init.headers as Record<string, string>)["Accept"] ?? "";
    const body = init.body ? JSON.parse(String(init.body)) : {};
    this.requests.push(`${method} ${route}`);
    this.onRequest?.(method, route);

    const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status });
    const fail = (status: number) => new Response(JSON.stringify({ message: "fail" }), { status });
    let m: RegExpMatchArray | null;

    if (method === "GET" && (m = route.match(/^\/git\/ref\/heads\/(.+)$/))) {
      const sha = this.refs.get(m[1]);
      return sha ? json({ object: { sha } }) : fail(404);
    }
    if (method === "POST" && route === "/git/refs") {
      const name = body.ref.replace("refs/heads/", "");
      if (this.refs.has(name)) return fail(422);
      this.refs.set(name, body.sha);
      return json({ object: { sha: body.sha } }, 201);
    }
    if ((m = route.match(/^\/git\/refs\/heads\/(.+)$/))) {
      const current = this.refs.get(m[1]);
      if (!current) return fail(422);
      if (method === "DELETE") {
        this.refs.delete(m[1]);
        return new Response(null, { status: 204 });
      }
      if (method === "PATCH") {
        // force:false only allows fast-forwards.
        if (!body.force && !this.ancestors(body.sha).includes(current)) return fail(422);
        this.refs.set(m[1], body.sha);
        return json({ object: { sha: body.sha } });
      }
    }
    if (method === "GET" && (m = route.match(/^\/git\/commits\/(\w+)$/))) {
      const c = this.commits.get(m[1]);
      return c ? json({ sha: c.sha, tree: { sha: c.tree } }) : fail(404);
    }
    if (method === "POST" && route === "/git/commits") {
      if (!this.trees.has(body.tree)) return fail(422);
      return json({ sha: this.commit(body.tree, body.parents, body.message) }, 201);
    }
    if (method === "POST" && route === "/git/trees") {
      const tree = new Map(this.trees.get(body.base_tree));
      for (const e of body.tree as { path: string; sha: string | null }[]) {
        if (e.sha === null) {
          // Real GitHub rejects the whole tree when deleting a path that isn't there.
          if (!tree.delete(e.path)) return fail(422);
        } else {
          if (!this.blobs.has(e.sha)) return fail(422);
          tree.set(e.path, e.sha);
        }
      }
      const sha = this.id("tree");
      this.trees.set(sha, tree);
      return json({ sha }, 201);
    }
    if (method === "POST" && route === "/git/blobs") {
      expect(body.encoding).toBe("base64");
      return json({ sha: this.putBlob(new Uint8Array(Buffer.from(body.content, "base64"))) }, 201);
    }
    if (method === "GET" && (m = route.match(/^\/contents\/(.+)$/))) {
      const ref = this.resolve(url.searchParams.get("ref") ?? "main");
      if (!ref) return fail(404);
      const tree = this.treeOf(ref);
      const sha = tree.get(m[1]);
      if (sha) {
        if (accept.includes("raw")) return new Response(this.blobs.get(sha)!.slice(), { status: 200 });
        return json({ sha, type: "file", name: m[1].split("/").pop() });
      }
      const dir = `${m[1]}/`;
      const children = new Map<string, string>();
      for (const path of tree.keys()) {
        if (!path.startsWith(dir)) continue;
        const [name, ...rest] = path.slice(dir.length).split("/");
        children.set(name, rest.length ? "dir" : "file");
      }
      return children.size ? json([...children].map(([name, type]) => ({ name, type }))) : fail(404);
    }
    if (method === "GET" && (m = route.match(/^\/compare\/(.+)\.\.\.(.+)$/))) {
      const base = this.resolve(m[1]);
      const head = this.resolve(m[2]);
      if (!base || !head) return fail(404);
      const baseAncestors = this.ancestors(base);
      const mergeBase = this.ancestors(head).find((s) => baseAncestors.includes(s))!;
      return json({ files: this.diff(this.treeOf(mergeBase), this.treeOf(head)) });
    }
    if (method === "GET" && route === "/commits") {
      const out = [];
      let sha: string | undefined = this.resolve(url.searchParams.get("sha")!)!;
      const limit = Number(url.searchParams.get("per_page") ?? 30);
      while (sha && out.length < limit) {
        const c: FakeCommit = this.commits.get(sha)!;
        out.push({ sha, commit: { message: c.message, author: { name: "Bot", date: "2026-01-01T00:00:00Z" } } });
        sha = c.parents[0];
      }
      return json(out);
    }
    if (method === "GET" && (m = route.match(/^\/commits\/(\w+)\/status$/))) {
      return json(this.statuses.get(m[1]) ?? { state: "pending", total_count: 0 });
    }
    if (method === "GET" && (m = route.match(/^\/commits\/(\w+)$/))) {
      const c = this.commits.get(m[1]);
      if (!c) return fail(404);
      const before = c.parents[0] ? this.treeOf(c.parents[0]) : new Map<string, string>();
      return json({ sha: c.sha, parents: c.parents.map((sha) => ({ sha })), files: this.diff(before, this.treeOf(c.sha)), commit: { message: c.message } });
    }
    throw new Error(`Fake GitHub: unhandled ${method} ${route}`);
  };
}

/* --------------------------------- tests --------------------------------- */

const LIVE = {
  "content/profile.json": '{"name":"live"}\n',
  "content/projects.json": "[]\n",
  "public/logos/a.svg": "<svg>a</svg>",
  "public/logos/b.svg": "<svg>b</svg>",
  "src/app/page.tsx": "export default 1;\n",
};

let gh: FakeGitHub;
let store: GitHubStore;

beforeEach(() => {
  process.env.GITHUB_TOKEN = "test-token";
  process.env.GITHUB_REPO = "o/r";
  delete process.env.GITHUB_BRANCH;
  gh = new FakeGitHub(LIVE);
  vi.stubGlobal("fetch", vi.fn(gh.fetch));
  store = new GitHubStore();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const draftHead = () => gh.refs.get("admin-draft");

describe("GitHubStore read", () => {
  it("reads live content when there is no draft", async () => {
    expect(dec(await store.read("content/profile.json"))).toBe(LIVE["content/profile.json"]);
    expect(await store.read("content/missing.json")).toBeNull();
    expect(draftHead()).toBeUndefined();
  });

  it("reads the draft after stage while readLive still sees live", async () => {
    await store.stage([{ path: "content/profile.json", content: enc('{"name":"draft"}\n') }], "edit profile");
    expect(dec(await store.read("content/profile.json"))).toBe('{"name":"draft"}\n');
    expect(dec(await store.readLive("content/profile.json"))).toBe(LIVE["content/profile.json"]);
  });

  it("lists files in a folder from the draft view", async () => {
    await store.stage([{ path: "public/logos/c.svg", content: enc("<svg>c</svg>") }], "add logo");
    expect(await store.list("public/logos")).toEqual(["a.svg", "b.svg", "c.svg"]);
    expect(await store.list("public/nope")).toEqual([]);
  });
});

describe("GitHubStore stage", () => {
  it("branches admin-draft off main, then commits on top", async () => {
    const main = gh.refs.get("main")!;
    await store.stage([{ path: "content/projects.json", content: enc("[1]\n") }], "one");
    const first = draftHead()!;
    expect(gh.commits.get(first)).toMatchObject({ parents: [main], message: "draft: one" });

    await store.stage([{ path: "content/projects.json", content: enc("[1,2]\n") }], "two");
    const second = draftHead()!;
    expect(gh.commits.get(second)!.parents).toEqual([first]);
    expect(gh.file("admin-draft", "content/projects.json")).toBe("[1,2]\n");
    expect(gh.refs.get("main")).toBe(main);
    expect(gh.requests.filter((r) => r === "POST /git/refs")).toHaveLength(1);
  });

  it("skips deleting a file that does not exist", async () => {
    await store.stage([{ path: "public/logos/missing.svg", content: null }], "noop");
    expect(draftHead()).toBe(gh.refs.get("main"));

    await store.stage(
      [
        { path: "public/logos/missing.svg", content: null },
        { path: "public/logos/a.svg", content: null },
      ],
      "delete a",
    );
    expect(gh.file("admin-draft", "public/logos/a.svg")).toBeNull();
    expect(gh.file("admin-draft", "public/logos/b.svg")).toBe("<svg>b</svg>");
  });

  it.each(["src/app/page.tsx", "content/../x", "content/../src/app/page.tsx", "public/other/x.svg", ".env.local"])(
    "refuses %s",
    async (path) => {
      await expect(store.stage([{ path, content: enc("x") }], "bad")).rejects.toBeInstanceOf(StoreError);
      expect(gh.requests).toEqual([]);
    },
  );
});

describe("GitHubStore pending", () => {
  it("is empty without a draft", async () => {
    expect(await store.pending()).toEqual([]);
  });

  it("lists added, modified and deleted content paths", async () => {
    await store.stage(
      [
        { path: "public/logos/new.svg", content: enc("<svg>new</svg>") },
        { path: "content/projects.json", content: enc("[1]\n") },
        { path: "public/logos/a.svg", content: null },
      ],
      "mixed",
    );
    expect(await store.pending()).toEqual([
      { path: "content/projects.json", kind: "modified" },
      { path: "public/logos/a.svg", kind: "deleted" },
      { path: "public/logos/new.svg", kind: "added" },
    ]);
  });

  it("ignores changes that landed on main after the draft branched", async () => {
    await store.stage([{ path: "content/projects.json", content: enc("[1]\n") }], "edit");
    gh.push("main", { "src/x.ts": "export {};\n", "content/profile.json": '{"name":"hotfix"}\n' });
    expect(await store.pending()).toEqual([{ path: "content/projects.json", kind: "modified" }]);
  });
});

describe("GitHubStore publish", () => {
  it("lays draft changes over a main that moved, without reverting code", async () => {
    await store.stage(
      [
        { path: "content/projects.json", content: enc('[{"slug":"x"}]\n') },
        { path: "public/logos/a.svg", content: null },
        { path: "public/logos/c.svg", content: enc("<svg>c</svg>") },
      ],
      "content edit",
    );
    const moved = gh.push("main", { "src/x.ts": "export const x = 1;\n", "src/app/page.tsx": "export default 2;\n" }, "code");

    const { sha } = await store.publish("Publish content");

    expect(gh.refs.get("main")).toBe(sha);
    expect(gh.commits.get(sha)).toMatchObject({ parents: [moved], message: "Publish content" });
    expect(gh.file("main", "src/x.ts")).toBe("export const x = 1;\n");
    expect(gh.file("main", "src/app/page.tsx")).toBe("export default 2;\n");
    expect(gh.file("main", "content/projects.json")).toBe('[{"slug":"x"}]\n');
    expect(gh.file("main", "content/profile.json")).toBe(LIVE["content/profile.json"]);
    expect(gh.file("main", "public/logos/a.svg")).toBeNull();
    expect(gh.file("main", "public/logos/c.svg")).toBe("<svg>c</svg>");
    expect(draftHead()).toBeUndefined();
    expect(await store.pending()).toEqual([]);
  });

  it("throws when there is nothing to publish", async () => {
    await expect(store.publish("x")).rejects.toThrow(StoreError);
    await store.stage([{ path: "public/logos/missing.svg", content: null }], "noop");
    await expect(store.publish("x")).rejects.toThrow("Nothing to publish");
  });

  it("refuses to overwrite main if it moves mid-publish and keeps the draft", async () => {
    await store.stage([{ path: "content/projects.json", content: enc("[1]\n") }], "edit");
    const draft = draftHead();
    gh.onRequest = (method, route) => {
      if (method === "PATCH" && route === "/git/refs/heads/main") {
        gh.onRequest = undefined;
        gh.push("main", { "src/race.ts": "1\n" }, "race");
      }
    };
    await expect(store.publish("x")).rejects.toThrow(/PATCH \/git\/refs\/heads\/main failed: 422/);
    expect(gh.file("main", "src/race.ts")).toBe("1\n");
    expect(gh.file("main", "content/projects.json")).toBe("[]\n");
    expect(draftHead()).toBe(draft);
  });

  it("discard deletes the draft and tolerates a missing one", async () => {
    await store.stage([{ path: "content/projects.json", content: enc("[1]\n") }], "edit");
    await store.discard();
    expect(draftHead()).toBeUndefined();
    await expect(store.discard()).resolves.toBeUndefined();
  });
});

describe("GitHubStore rollback", () => {
  it("restores content from the parent, deletes added files and skips code", async () => {
    const target = gh.push(
      "main",
      {
        "content/projects.json": '["bad"]\n',
        "public/logos/b.svg": null,
        "public/logos/new.svg": "<svg>new</svg>",
        "src/y.ts": "export const y = 1;\n",
      },
      "Bad publish\n\nbody",
    );
    const later = gh.push("main", { "src/z.ts": "z\n" }, "later code");

    const { sha, skipped } = await store.rollback(target);

    expect(skipped).toEqual(["src/y.ts"]);
    expect(gh.refs.get("main")).toBe(sha);
    expect(gh.commits.get(sha!)!.parents).toEqual([later]);
    expect(gh.commits.get(sha!)!.message).toMatch(/^Revert content: Bad publish\n\nRestores content changed in c00000/);
    expect(gh.file("main", "content/projects.json")).toBe("[]\n");
    expect(gh.file("main", "public/logos/b.svg")).toBe("<svg>b</svg>");
    expect(gh.file("main", "public/logos/new.svg")).toBeNull();
    expect(gh.file("main", "src/y.ts")).toBe("export const y = 1;\n");
    expect(gh.file("main", "src/z.ts")).toBe("z\n");
  });

  it("throws when the commit changed no content", async () => {
    const code = gh.push("main", { "src/y.ts": "1\n" });
    await expect(store.rollback(code)).rejects.toThrow("That commit changed no content files");
  });
});

describe("GitHubStore history and deployState", () => {
  it("returns first-line messages newest first", async () => {
    gh.push("main", { "src/y.ts": "1\n" }, "Second\n\nlong body");
    const list = await store.history(5);
    expect(list.map((c) => c.message)).toEqual(["Second", "initial"]);
    expect(list[0]).toMatchObject({ author: "Bot", date: "2026-01-01T00:00:00Z" });
  });

  it.each([
    [{ state: "pending", total_count: 0 }, "unknown"],
    [{ state: "success", total_count: 1 }, "success"],
    [{ state: "pending", total_count: 1 }, "pending"],
    [{ state: "failure", total_count: 2 }, "failure"],
    [{ state: "error", total_count: 1 }, "failure"],
  ])("maps %o to %s", async (status, expected) => {
    gh.statuses.set("abc", status);
    expect(await store.deployState("abc")).toBe(expected);
  });

  it("surfaces API errors as StoreError with the status", async () => {
    await expect(store.rollback("doesnotexist")).rejects.toMatchObject({ status: 404 });
    await expect(store.rollback("doesnotexist")).rejects.toBeInstanceOf(StoreError);
  });
});
