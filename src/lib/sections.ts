export const SECTIONS = ["about", "skills", "experience", "contact"] as const;
export type SectionId = (typeof SECTIONS)[number];
