export const SECTIONS = ["about", "skills", "experience", "engineering", "contact"] as const;
export type SectionId = (typeof SECTIONS)[number];
