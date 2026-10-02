import type { Collections } from "@/lib/content/schema";
import { consistency, extractPdfText, type Finding } from "./resume";
import type { Store } from "./store";

/** Everything the Overview flags: résumé vs site, missing media, unpublished drafts. */
export async function healthChecks(store: Store, data: Collections): Promise<Finding[]> {
  const findings: Finding[] = [];

  const pdf = await store.read("public/resume.pdf");
  if (!pdf) findings.push({ level: "error", text: "No résumé at /resume.pdf: the download button is broken", href: "/admin/resume" });
  else {
    try {
      const { text } = await extractPdfText(pdf);
      findings.push(...consistency(text, data).filter((f) => f.level !== "ok"));
    } catch {
      findings.push({ level: "error", text: "The live résumé PDF could not be read", href: "/admin/resume" });
    }
  }

  const noShots = data.projects.filter((p) => p.verified && p.shots.length === 0).map((p) => p.name);
  findings.push(
    noShots.length
      ? { level: "warn", text: `No screenshot: ${noShots.join(", ")}`, href: "/admin/projects" }
      : { level: "ok", text: "Every project has a screenshot" },
  );

  const drafts = [
    ...data.projects.filter((p) => !p.verified).map((p) => p.name),
    ...data.experience.filter((j) => !j.verified).map((j) => j.company),
    ...data.awards.filter((a) => !a.verified).map((a) => a.title),
  ];
  findings.push(
    drafts.length
      ? { level: "warn", text: `Hidden until verified: ${drafts.join(", ")}` }
      : { level: "ok", text: "No unverified entries" },
  );

  const tools = data.skills.flatMap((g) => g.tools);
  const withLogo = tools.filter((t) => t.logo).length;
  findings.push({ level: "ok", text: `${withLogo} of ${tools.length} skills have a logo`, href: "/admin/skills" });

  return findings.sort((a, b) => rank[a.level] - rank[b.level]);
}

const rank = { error: 0, warn: 1, ok: 2 };
