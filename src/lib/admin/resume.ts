import type { Collections, ResumeChecks } from "@/lib/content/schema";

// Résumé analysis. The PDF text layer is what applicant-tracking systems read, so checks run
// on that text: page count, whether text is extractable at all, a phone number in a file that
// is served publicly, and claims that disagree with the site content.

export async function extractPdfText(bytes: Uint8Array): Promise<{ pages: number; text: string }> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  // pdf.js takes ownership of the buffer; hand it a copy.
  const pdf = await getDocumentProxy(new Uint8Array(bytes));
  const { totalPages, text } = await extractText(pdf, { mergePages: true });
  return { pages: totalPages, text };
}

// +91 99975 69431, (+91) 9997569431, 999-756-9431 … at least 10 digits in a phone-like run.
const PHONE = /(?:\+|\(\+)?\d[\d\s().-]{8,}\d/g;

export function findPhone(text: string): string | null {
  for (const match of text.match(PHONE) ?? []) {
    const digits = match.replace(/\D/g, "");
    // Year ranges like "2023–2027" or "2021 2023" are not phone numbers.
    if (digits.length >= 10 && digits.length <= 13 && !/^(?:(?:19|20)\d\d){2,}$/.test(digits)) return match.trim();
  }
  return null;
}

export function resumeChecks(pages: number, text: string, bytes: number): ResumeChecks {
  return { pages, bytes, phone: findPhone(text) !== null, textLayer: text.replace(/\s+/g, "").length > 200 };
}

export type Finding = { level: "error" | "warn" | "ok"; text: string; href?: string };

const numbersNear = (text: string, word: RegExp) => {
  const out: number[] = [];
  for (const m of text.matchAll(new RegExp(`${word.source}[^\\n]{0,80}`, "gi"))) {
    for (const n of m[0].matchAll(/\d[\d,]*/g)) out.push(Number(n[0].replace(/,/g, "")));
  }
  return out;
};

/** Compares the live résumé with the site content and reports where they disagree. */
export function consistency(
  text: string,
  data: Pick<Collections, "profile" | "projects" | "stats" | "awards">,
): Finding[] {
  const findings: Finding[] = [];
  const lower = text.toLowerCase();
  const phone = findPhone(text);
  if (phone) findings.push({ level: "error", text: `Live résumé contains a phone number (${phone.slice(0, 8)}…)`, href: "/admin/resume" });
  if (text.replace(/\s+/g, "").length < 200)
    findings.push({ level: "error", text: "Live résumé has no readable text layer (ATS can't parse it)", href: "/admin/resume" });

  if (!lower.includes(data.profile.email.toLowerCase()))
    findings.push({ level: "warn", text: `Résumé email differs from the site (${data.profile.email})`, href: "/admin/profile" });

  const missing = data.projects.filter((p) => p.verified && !lower.includes(p.name.toLowerCase())).map((p) => p.name);
  if (missing.length) findings.push({ level: "warn", text: `Not in résumé: ${missing.join(", ")}`, href: "/admin/resume" });

  // LeetCode: every number the site states should appear near "LeetCode" in the résumé.
  const siteNumbers = data.stats
    .filter((s) => /leetcode|contest|rating/i.test(s.label))
    .map((s) => Number(s.value.replace(/,/g, "")))
    .filter(Number.isFinite);
  const resumeNumbers = numbersNear(text, /leetcode|rating|rank/);
  const conflicting = resumeNumbers.filter((n) => n >= 100 && !siteNumbers.includes(n));
  if (siteNumbers.length && conflicting.length)
    findings.push({
      level: "warn",
      text: `LeetCode figures differ: résumé ${conflicting.map((n) => n.toLocaleString("en-IN")).join(", ")} vs site ${siteNumbers
        .map((n) => n.toLocaleString("en-IN"))
        .join(", ")}`,
      href: "/admin/profile",
    });

  if (!findings.length) findings.push({ level: "ok", text: "Résumé and site agree" });
  return findings;
}
