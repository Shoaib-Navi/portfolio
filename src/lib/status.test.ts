import { afterEach, describe, expect, it, vi } from "vitest";
import { checkProjects, statusTargets } from "./status";

afterEach(() => vi.unstubAllGlobals());

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe("project status", () => {
  it("only checks projects with a public live or repo link", () => {
    const slugs = statusTargets().map((t) => t.slug);
    expect(slugs).toContain("hirestream");
    // CarePulse's repository is private and it has no live link.
    expect(slugs).not.toContain("carepulse");
  });

  it("reports real results and never invents one", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("hire-stream")) return new Response("ok", { status: 200 });
        if (url.includes("terraloom.vercel.app")) return new Response("down", { status: 503 });
        if (url.endsWith("/repos/Shoaib-Navi/HireStream")) return json({ pushed_at: "2026-09-28T22:11:55Z", archived: false });
        if (url.endsWith("/repos/Shoaib-Navi/TerraLoom")) return json({ message: "Not Found" }, 404);
        throw new Error(`unexpected ${url}`);
      }),
    );
    const report = await checkProjects();
    expect(report.projects.hirestream.live).toMatchObject({ ok: true, status: 200 });
    expect(report.projects.hirestream.repo).toEqual({ url: "https://github.com/Shoaib-Navi/HireStream", pushedAt: "2026-09-28T22:11:55Z", archived: false });
    expect(report.projects.terraloom.live).toMatchObject({ ok: false, status: 503 });
    // A repo that can't be read is omitted, not shown as stale or broken.
    expect(report.projects.terraloom.repo).toBeUndefined();
  });

  it("describes timeouts and connection failures without a status code", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("hire-stream")) throw Object.assign(new Error("timeout"), { name: "TimeoutError" });
        if (url.includes("terraloom")) throw new TypeError("fetch failed");
        return json({ private: true, pushed_at: "2026-01-01T00:00:00Z" });
      }),
    );
    const report = await checkProjects();
    expect(report.projects.hirestream.live).toEqual({ url: "https://hire-stream-delta.vercel.app", ok: false, error: "No response within 8 s" });
    expect(report.projects.terraloom.live).toMatchObject({ ok: false, error: "Couldn't connect" });
    // Private repositories report nothing.
    expect(report.projects.hirestream.repo).toBeUndefined();
  });
});
