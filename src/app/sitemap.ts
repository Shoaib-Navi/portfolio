import type { MetadataRoute } from "next";
import { notes, projects } from "@/data/profile";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, changeFrequency: "monthly", priority: 1 },
    { url: `${SITE_URL}/work`, changeFrequency: "monthly", priority: 0.8 },
    ...projects.map((p) => ({
      url: `${SITE_URL}/work/${p.slug}`,
      changeFrequency: "yearly" as const,
      priority: 0.7,
    })),
    ...(notes.length ? [{ url: `${SITE_URL}/notes`, changeFrequency: "weekly" as const, priority: 0.6 }] : []),
    ...notes.map((n) => ({
      url: `${SITE_URL}/notes/${n.slug}`,
      lastModified: n.date,
      changeFrequency: "yearly" as const,
      priority: 0.6,
    })),
  ];
}
