import { describe, expect, it } from "vitest";
import awards from "../../../content/awards.json";
import education from "../../../content/education.json";
import experience from "../../../content/experience.json";
import profile from "../../../content/profile.json";
import projects from "../../../content/projects.json";
import resumes from "../../../content/resumes.json";
import skills from "../../../content/skills.json";
import stats from "../../../content/stats.json";
import { COLLECTIONS, parseOrThrow, validate, type CollectionName, type Project } from "./schema";

const real: Record<CollectionName, unknown> = { awards, education, experience, profile, projects, resumes, skills, stats };

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

const project = (over: Partial<Project> = {}): Project => ({
  slug: "demo",
  name: "Demo",
  tagline: "A demo",
  lede: "Lede",
  stack: ["TS"],
  points: [{ label: "Backend", text: "Did things" }],
  links: [{ label: "Code", href: "https://github.com/x/y" }],
  shots: [],
  verified: true,
  ...over,
});

const issuesOf = (name: CollectionName, input: unknown) => {
  const r = validate(name, input);
  if (r.ok) throw new Error("expected validation to fail");
  return r.issues;
};

describe("validate: real content", () => {
  it("covers all 8 collections", () => {
    expect(COLLECTIONS.sort()).toEqual(Object.keys(real).sort());
  });

  it.each(COLLECTIONS)("content/%s.json passes", (name) => {
    const r = validate(name, real[name]);
    expect(r.ok ? [] : r.issues).toEqual([]);
  });
});

describe("validate: rejections", () => {
  it("rejects a bad slug", () => {
    const issues = issuesOf("projects", [project({ slug: "Bad Slug" })]);
    expect(issues).toContainEqual({ path: "[0].slug", message: "Lowercase letters, numbers and single dashes" });
  });

  it("rejects a non-https link", () => {
    const issues = issuesOf("projects", [project({ links: [{ label: "Code", href: "http://x.com" }] })]);
    expect(issues).toContainEqual({ path: "[0].links[0].href", message: "Must start with https://" });
  });

  it("rejects duplicate project slugs (case-insensitive)", () => {
    const issues = issuesOf("projects", [project(), project({ name: "Other" })]);
    expect(issues[0].path).toBe("[1]");
    expect(issues[0].message).toMatch(/Duplicate slug/);
  });

  it("rejects the reserved slug new", () => {
    expect(issuesOf("projects", [project({ slug: "new" })])).toContainEqual({ path: "[0].slug", message: "“new” is reserved" });
  });

  it("rejects resumes whose live version is missing", () => {
    const r = clone(resumes);
    r.live = "nope";
    expect(issuesOf("resumes", r)).toContainEqual({ path: "live", message: "Live version does not exist" });
  });

  it("rejects duplicate skill names across groups", () => {
    const groups = [
      { label: "Languages", tools: [{ name: "Python" }] },
      { label: "Backend", tools: [{ name: "FastAPI" }, { name: "python" }] },
    ];
    const issues = issuesOf("skills", groups);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toEqual({ path: "tools[2]", message: "Duplicate skill “python”" });
  });

  it("reports nested and dotted issue paths", () => {
    const bad = project({ points: [{ label: "A", text: "ok" }, { label: "B", text: "   " }] });
    expect(issuesOf("projects", [bad])).toContainEqual({ path: "[0].points[1].text", message: "Required" });

    const p = clone(profile) as Record<string, unknown> & { headline: { lead: unknown } };
    p.headline.lead = 5;
    expect(issuesOf("profile", p)).toContainEqual({ path: "headline.lead", message: "Must be text" });
  });

  it("uses an empty path for a root-level type error", () => {
    expect(issuesOf("projects", {})).toEqual([{ path: "", message: "Must be a list" }]);
  });
});

describe("validate: normalisation", () => {
  it("drops empty optional fields and trims strings", () => {
    const r = validate("projects", [{ ...project({ name: "  Demo  " }), status: "", note: null }]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value[0].name).toBe("Demo");
    expect("status" in r.value[0]).toBe(false);
    expect("note" in r.value[0]).toBe(false);
  });

  it("drops unknown keys", () => {
    const r = validate("education", [{ title: "B.Tech", org: "Uni", detail: "2023", extra: 1 }]);
    expect(r.ok && r.value[0]).toEqual({ title: "B.Tech", org: "Uni", detail: "2023" });
  });
});

describe("parseOrThrow", () => {
  it("returns the value when valid", () => {
    expect(parseOrThrow("stats", stats)).toHaveLength(stats.length);
  });

  it("throws with the file name and issue lines", () => {
    expect(() => parseOrThrow("projects", [project({ slug: "new" })])).toThrow(
      /content\/projects\.json is invalid:\n {2}\[0\]\.slug: “new” is reserved/,
    );
    expect(() => parseOrThrow("projects", {})).toThrow(/\(root\): Must be a list/);
  });
});
