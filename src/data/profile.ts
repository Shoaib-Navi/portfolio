// Every value here comes from the résumés in CAREER_OS; unverified and [CONFIRM] lines are
// deliberately left out. Keep it that way when editing.
//
// The content itself lives in /content/*.json (edited by hand or through /admin). This file
// validates it at build time and hands pages the same shapes they have always imported.

import awardsJson from "../../content/awards.json";
import educationJson from "../../content/education.json";
import experienceJson from "../../content/experience.json";
import profileJson from "../../content/profile.json";
import projectsJson from "../../content/projects.json";
import skillsJson from "../../content/skills.json";
import statsJson from "../../content/stats.json";
import { parseOrThrow, type Project } from "@/lib/content/schema";
import { SHOW_DRAFTS } from "@/lib/drafts";

export type { Job, SkillGroup, Stat, Tool } from "@/lib/content/schema";

/** Entries marked unverified are drafts: they never reach the public site. */
const verifiedOnly = <T extends { verified: boolean }>(list: T[]) => list.filter((item) => item.verified);

export const profile = parseOrThrow("profile", profileJson);
export const stats = parseOrThrow("stats", statsJson);
export const skills = parseOrThrow("skills", skillsJson);
export const experience = verifiedOnly(parseOrThrow("experience", experienceJson));
/** The "01", "02"… index follows the list order, so it is never typed by hand. */
export const projects: (Project & { index: string })[] = verifiedOnly(parseOrThrow("projects", projectsJson)).map(
  ({ caseStudy, ...p }, i) => ({
    ...p,
    index: String(i + 1).padStart(2, "0"),
    ...(caseStudy && (caseStudy.verified || SHOW_DRAFTS) ? { caseStudy } : {}),
  }),
);
export const education = parseOrThrow("education", educationJson);
export const awards = verifiedOnly(parseOrThrow("awards", awardsJson));
