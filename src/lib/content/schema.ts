// Content types and validators. Shared by the site build, the admin forms and the admin
// server actions, so a bad edit is rejected in the form, again on the server, and finally
// fails `next build` instead of reaching the live site. No runtime dependencies on purpose.

export type Issue = { path: string; message: string };
type V<T> = (input: unknown, path: string, issues: Issue[]) => T;

/* ----------------------------- primitives ----------------------------- */

type StrOpts = { min?: number; max?: number; pattern?: RegExp; patternMsg?: string };

const str =
  ({ min = 1, max = 2000, pattern, patternMsg }: StrOpts = {}): V<string> =>
  (x, path, issues) => {
    if (typeof x !== "string") {
      issues.push({ path, message: "Must be text" });
      return "";
    }
    const v = x.trim();
    if (v.length < min) issues.push({ path, message: min === 1 ? "Required" : `At least ${min} characters` });
    else if (v.length > max) issues.push({ path, message: `At most ${max} characters` });
    else if (pattern && !pattern.test(v)) issues.push({ path, message: patternMsg ?? "Invalid format" });
    return v;
  };

const num =
  ({ min = -Infinity, max = Infinity, int = false } = {}): V<number> =>
  (x, path, issues) => {
    if (typeof x !== "number" || !Number.isFinite(x)) {
      issues.push({ path, message: "Must be a number" });
      return 0;
    }
    if (int && !Number.isInteger(x)) issues.push({ path, message: "Must be a whole number" });
    if (x < min || x > max) issues.push({ path, message: `Must be between ${min} and ${max}` });
    return x;
  };

const bool: V<boolean> = (x, path, issues) => {
  if (typeof x !== "boolean") issues.push({ path, message: "Must be true or false" });
  return x === true;
};

/** Optional field: absent, null or empty string all mean "not set". */
const opt =
  <T,>(v: V<T>): V<T | undefined> =>
  (x, path, issues) =>
    x === undefined || x === null || x === "" ? undefined : v(x, path, issues);

const arr =
  <T,>(item: V<T>, { min = 0, max = 200 } = {}): V<T[]> =>
  (x, path, issues) => {
    if (!Array.isArray(x)) {
      issues.push({ path, message: "Must be a list" });
      return [];
    }
    if (x.length < min) issues.push({ path, message: `Needs at least ${min} item${min === 1 ? "" : "s"}` });
    if (x.length > max) issues.push({ path, message: `At most ${max} items` });
    return x.map((el, i) => item(el, `${path}[${i}]`, issues));
  };

type Shape<T> = { [K in keyof T]-?: V<T[K]> };

const obj =
  <T,>(shape: Shape<T>): V<T> =>
  (x, path, issues) => {
    if (typeof x !== "object" || x === null || Array.isArray(x)) {
      issues.push({ path, message: "Must be an object" });
      return {} as T;
    }
    const src = x as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(shape) as (keyof T & string)[]) {
      const value = shape[key](src[key], path ? `${path}.${key}` : key, issues);
      // Drop unset optionals so the JSON on disk stays tidy.
      if (value !== undefined) out[key] = value;
    }
    return out as T;
  };

/* ------------------------------- fields ------------------------------- */

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const text = (max = 400) => str({ max });
const slug = str({ max: 60, pattern: SLUG, patternMsg: "Lowercase letters, numbers and single dashes" });
const https = str({ max: 500, pattern: /^https:\/\/[^\s]+$/, patternMsg: "Must start with https://" });
const email = str({ max: 200, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, patternMsg: "Not an email address" });
/** A file under /public. Kept to the folders the admin writes so paths can't escape. */
const asset = (folder: string, ext: RegExp) =>
  str({
    max: 200,
    pattern: new RegExp(`^/${folder}/[a-z0-9][a-z0-9._-]*\\.(?:${ext.source})$`),
    patternMsg: `Must be a /${folder}/ file`,
  });

/* ------------------------------- types -------------------------------- */

export type Link = { label: string; href: string; icon?: string };
export type Profile = {
  name: string;
  initials: string;
  role: string;
  photo: { src: string; width: number; height: number };
  location: string;
  email: string;
  resume: string;
  headline: { lead: string; emphasis: string; tail: string };
  about: { lede: string; notes: string[] };
  links: Link[];
};
export type Stat = { value: string; label: string; count?: number; dec?: number; group?: boolean };
export type Tool = { name: string; logo?: string };
export type SkillGroup = { label: string; tools: Tool[] };
export type Job = {
  slug: string;
  company: string;
  role: string;
  period: string;
  year: string;
  /** Wrap a phrase in **double asterisks** to bold it. */
  highlights: string[];
  stack: string[];
  verified: boolean;
};
export type ProjectPoint = { label: string; text: string };
/** One box in an architecture diagram. */
export type ArchNode = { label: string; detail?: string };
export type ArchLayer = { label: string; nodes: ArchNode[] };
/** Drawn top to bottom as the request path; `aside` holds things that run alongside it. */
export type Architecture = { layers: ArchLayer[]; aside: ArchLayer[] };
export type CaseSection = {
  heading: string;
  /** Markdown subset (see lib/markdown.tsx) */
  body: string;
  /** Show the architecture diagram at the end of this section */
  diagram?: boolean;
};
export type CaseStudy = {
  /** Unverified case studies are drafts: visible in dev and the admin, never in production. */
  verified: boolean;
  sections: CaseSection[];
  architecture?: Architecture;
};
export type Project = {
  slug: string;
  name: string;
  tagline: string;
  lede: string;
  status?: string;
  stack: string[];
  /** Wrap a phrase in **double asterisks** to bold it. */
  points: ProjectPoint[];
  links: { label: string; href: string }[];
  note?: string;
  /** Screenshot paths under /public. Empty shows the "no screenshot yet" placeholder. */
  shots: string[];
  verified: boolean;
  caseStudy?: CaseStudy;
};
export type Education = { title: string; org: string; detail: string };
/** A concrete, checkable example of a practice. `source` is a project slug, or "site" for this portfolio. */
export type Evidence = { text: string; source: string };
export type Practice = { area: string; summary: string; evidence: Evidence[]; verified: boolean };
export type Award = { title: string; detail: string; href?: string; verified: boolean };
export type ResumeChecks = { pages: number; bytes: number; phone: boolean; textLayer: boolean };
export type ResumeVersion = { id: string; label: string; file: string; uploadedAt: string; checks: ResumeChecks };
export type Resumes = { live: string; versions: ResumeVersion[] };

/* ----------------------------- validators ----------------------------- */

const link: V<Link> = obj<Link>({ label: str({ max: 40 }), href: https, icon: opt(str({ max: 4 })) });

export const profileV: V<Profile> = obj<Profile>({
  name: str({ max: 80 }),
  initials: str({ max: 3 }),
  role: str({ max: 80 }),
  photo: obj({
    src: asset("pfp", /webp|jpg|jpeg|png/),
    width: num({ min: 100, max: 4000, int: true }),
    height: num({ min: 100, max: 4000, int: true }),
  }),
  location: str({ max: 80 }),
  email,
  resume: str({ pattern: /^\/resume\.pdf$/, patternMsg: "Must be /resume.pdf" }),
  headline: obj({ lead: text(80), emphasis: text(120), tail: text(160) }),
  about: obj({ lede: text(300), notes: arr(text(300), { max: 8 }) }),
  links: arr(link, { max: 8 }),
});

const stat: V<Stat> = obj<Stat>({
  value: str({ max: 12 }),
  label: str({ max: 40 }),
  count: opt(num({ min: 0 })),
  dec: opt(num({ min: 0, max: 4, int: true })),
  group: opt(bool),
});
export const statsV: V<Stat[]> = arr(stat, { max: 6 });

const tool: V<Tool> = obj<Tool>({ name: str({ max: 40 }), logo: opt(asset("logos", /svg|webp|png/)) });
export const skillsV: V<SkillGroup[]> = arr(obj<SkillGroup>({ label: str({ max: 40 }), tools: arr(tool, { max: 30 }) }), {
  max: 12,
});

export const experienceV: V<Job[]> = arr(
  obj<Job>({
    slug,
    company: str({ max: 80 }),
    role: str({ max: 80 }),
    period: str({ max: 40 }),
    year: str({ max: 4, pattern: /^\d{4}$/, patternMsg: "Four-digit year" }),
    highlights: arr(text(400), { min: 1, max: 8 }),
    stack: arr(str({ max: 40 }), { max: 20 }),
    verified: bool,
  }),
  { max: 20 },
);

const archLayer: V<ArchLayer> = obj<ArchLayer>({
  label: str({ max: 40 }),
  nodes: arr(obj<ArchNode>({ label: str({ max: 60 }), detail: opt(str({ max: 120 })) }), { min: 1, max: 8 }),
});

const caseStudyV: V<CaseStudy> = obj<CaseStudy>({
  verified: bool,
  sections: arr(obj<CaseSection>({ heading: str({ max: 60 }), body: str({ max: 6000 }), diagram: opt(bool) }), { min: 1, max: 12 }),
  architecture: opt(obj<Architecture>({ layers: arr(archLayer, { min: 1, max: 6 }), aside: arr(archLayer, { max: 4 }) })),
});

export const projectsV: V<Project[]> = arr(
  obj<Project>({
    slug,
    name: str({ max: 60 }),
    tagline: str({ max: 100 }),
    status: opt(str({ max: 40 })),
    lede: str({ max: 400 }),
    stack: arr(str({ max: 40 }), { max: 20 }),
    points: arr(obj<ProjectPoint>({ label: str({ max: 40 }), text: text(500) }), { min: 1, max: 10 }),
    links: arr(obj({ label: str({ max: 20 }), href: https }), { max: 4 }),
    note: opt(str({ max: 200 })),
    shots: arr(asset("shots", /webp/), { max: 8 }),
    verified: bool,
    caseStudy: opt(caseStudyV),
  }),
  { max: 30 },
);

export const practicesV: V<Practice[]> = arr(
  obj<Practice>({
    area: str({ max: 30 }),
    summary: str({ max: 200 }),
    evidence: arr(obj<Evidence>({ text: text(300), source: str({ max: 60, pattern: SLUG, patternMsg: "A project slug or “site”" }) }), {
      min: 1,
      max: 6,
    }),
    verified: bool,
  }),
  { max: 12 },
);

export const educationV: V<Education[]> = arr(
  obj<Education>({ title: str({ max: 80 }), org: str({ max: 120 }), detail: str({ max: 120 }) }),
  { max: 6 },
);

export const awardsV: V<Award[]> = arr(
  obj<Award>({ title: str({ max: 80 }), detail: text(300), href: opt(https), verified: bool }),
  { max: 12 },
);

export const resumesV: V<Resumes> = obj<Resumes>({
  live: str({ max: 60 }),
  versions: arr(
    obj<ResumeVersion>({
      id: slug,
      label: str({ max: 60 }),
      file: asset("resumes", /pdf/),
      uploadedAt: str({ max: 40 }),
      checks: obj<ResumeChecks>({ pages: num({ min: 0, int: true }), bytes: num({ min: 0, int: true }), phone: bool, textLayer: bool }),
    }),
    { min: 1, max: 30 },
  ),
});

/* --------------------------- cross-field rules --------------------------- */

function uniqueBy<T>(list: T[], key: (t: T) => string, path: string, what: string, issues: Issue[]) {
  const seen = new Set<string>();
  list.forEach((item, i) => {
    const k = key(item).toLowerCase();
    if (seen.has(k)) issues.push({ path: `${path}[${i}]`, message: `Duplicate ${what} “${key(item)}”` });
    seen.add(k);
  });
}

type Refine<T> = (value: T, issues: Issue[]) => void;

const refinements: { [K in keyof Collections]?: Refine<Collections[K]> } = {
  projects: (list, issues) => {
    uniqueBy(list, (p) => p.slug, "", "slug", issues);
    // /admin/projects/new is the "add project" route.
    list.forEach((p, i) => p.slug === "new" && issues.push({ path: `[${i}].slug`, message: "“new” is reserved" }));
  },
  experience: (list, issues) => uniqueBy(list, (j) => j.slug, "", "slug", issues),
  practices: (list, issues) => uniqueBy(list, (p) => p.area, "", "area", issues),
  skills: (groups, issues) => {
    uniqueBy(groups, (g) => g.label, "", "group", issues);
    uniqueBy(
      groups.flatMap((g) => g.tools),
      (t) => t.name,
      "tools",
      "skill",
      issues,
    );
  },
  resumes: (r, issues) => {
    uniqueBy(r.versions, (v) => v.id, "versions", "version", issues);
    if (!r.versions.some((v) => v.id === r.live)) issues.push({ path: "live", message: "Live version does not exist" });
  },
};

/* ------------------------------ registry ------------------------------ */

export type Collections = {
  profile: Profile;
  stats: Stat[];
  skills: SkillGroup[];
  experience: Job[];
  projects: Project[];
  practices: Practice[];
  education: Education[];
  awards: Award[];
  resumes: Resumes;
};
export type CollectionName = keyof Collections;

const validators: { [K in CollectionName]: V<Collections[K]> } = {
  profile: profileV,
  stats: statsV,
  skills: skillsV,
  experience: experienceV,
  projects: projectsV,
  practices: practicesV,
  education: educationV,
  awards: awardsV,
  resumes: resumesV,
};

export const COLLECTIONS = Object.keys(validators) as CollectionName[];

export function isCollection(name: string): name is CollectionName {
  return (COLLECTIONS as string[]).includes(name);
}

export const collectionPath = (name: CollectionName) => `content/${name}.json`;

export type Parsed<T> = { ok: true; value: T } | { ok: false; issues: Issue[] };

export function validate<K extends CollectionName>(name: K, input: unknown): Parsed<Collections[K]> {
  const issues: Issue[] = [];
  const value = validators[name](input, "", issues);
  if (issues.length === 0) (refinements[name] as Refine<Collections[K]> | undefined)?.(value, issues);
  return issues.length ? { ok: false, issues } : { ok: true, value };
}

/** Build-time parse: a bad content file fails the build with a readable message. */
export function parseOrThrow<K extends CollectionName>(name: K, input: unknown): Collections[K] {
  const result = validate(name, input);
  if (!result.ok) {
    const lines = result.issues.map((i) => `  ${i.path || "(root)"}: ${i.message}`).join("\n");
    throw new Error(`content/${name}.json is invalid:\n${lines}`);
  }
  return result.value;
}
