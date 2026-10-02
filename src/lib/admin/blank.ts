import type { Project } from "@/lib/content/schema";

const POINT_LABELS = ["Backend", "Data model", "Security", "Testing", "CI/CD"];

/** Starting point for /admin/projects/new, with the point labels projects usually have. */
export const blankProject = (): Project => ({
  slug: "",
  name: "",
  tagline: "",
  lede: "",
  status: "Live",
  stack: [],
  points: POINT_LABELS.slice(0, 3).map((label) => ({ label, text: "" })),
  links: [],
  shots: [],
  verified: false,
});
