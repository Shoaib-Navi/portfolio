import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { Collections } from "@/lib/content/schema";
import { consistency, extractPdfText, findPhone, resumeChecks } from "./resume";

type Data = Pick<Collections, "profile" | "projects" | "stats" | "awards">;

const data = (): Data => ({
  profile: { email: "me@example.com" } as Collections["profile"],
  projects: [
    { name: "CarePulse", verified: true },
    { name: "HireStream", verified: true },
    { name: "Secret WIP", verified: false },
  ] as Collections["projects"],
  stats: [
    { value: "8.05", label: "CGPA" },
    { value: "354", label: "LeetCode problems" },
    { value: "1,709", label: "Peak contest rating" },
  ],
  awards: [],
});

// Long enough to count as a real text layer (> 200 non-space characters).
const filler = "Built backend services and dashboards used by clinics and recruiters across several cities. ".repeat(3);
const goodText = [
  "MOHD SHOAIB me@example.com",
  "B.Tech CSE 2023–2027 CGPA 8.05",
  "Projects: CarePulse, HireStream",
  "LeetCode: 354 problems solved, peak contest rating 1,709",
  filler,
].join("\n");

describe("findPhone", () => {
  it.each(["(+91) 9997569431", "+91 99975 69431", "Call 999-756-9431 anytime"])("flags %s", (s) => {
    expect(findPhone(s)).not.toBeNull();
  });

  it("returns the matched number", () => {
    expect(findPhone("Phone: (+91) 9997569431 | Email")).toBe("(+91) 9997569431");
  });

  it.each(["2023–2027", "2021 2023", "2021 2023 2025", "CGPA 8.05", "354 problems", "Jan 2021 - Mar 2023"])(
    "does not flag %s",
    (s) => {
      expect(findPhone(s)).toBeNull();
    },
  );

  it("does not flag the real non-phone parts of a résumé", () => {
    expect(findPhone(goodText)).toBeNull();
  });
});

describe("resumeChecks", () => {
  it("reports phone and text layer", () => {
    expect(resumeChecks(1, goodText, 1234)).toEqual({ pages: 1, bytes: 1234, phone: false, textLayer: true });
    expect(resumeChecks(2, "(+91) 9997569431", 10)).toEqual({ pages: 2, bytes: 10, phone: true, textLayer: false });
  });
});

describe("consistency", () => {
  it("says ok when everything agrees", () => {
    expect(consistency(goodText, data())).toEqual([{ level: "ok", text: "Résumé and site agree" }]);
  });

  it("flags a phone number as an error", () => {
    const findings = consistency(`${goodText}\n+91 99975 69431`, data());
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ level: "error", href: "/admin/resume" });
    expect(findings[0].text).toMatch(/phone number \(\+91 9997…\)/);
  });

  it("flags a missing text layer", () => {
    const findings = consistency("MOHD SHOAIB me@example.com CarePulse HireStream", data());
    expect(findings.map((f) => f.text)).toContain("Live résumé has no readable text layer (ATS can't parse it)");
  });

  it("flags verified projects missing from the résumé, ignoring unverified ones", () => {
    const findings = consistency(goodText.replace("HireStream", ""), data());
    expect(findings).toEqual([{ level: "warn", text: "Not in résumé: HireStream", href: "/admin/resume" }]);
  });

  it("flags a different email", () => {
    const findings = consistency(goodText.replace("me@example.com", "old@example.com"), data());
    expect(findings).toEqual([{ level: "warn", text: "Résumé email differs from the site (me@example.com)", href: "/admin/profile" }]);
  });

  it("flags LeetCode figures that differ from the site", () => {
    const findings = consistency(goodText.replace("rating 1,709", "rating 1,650"), data());
    expect(findings).toHaveLength(1);
    expect(findings[0].level).toBe("warn");
    expect(findings[0].text).toMatch(/^LeetCode figures differ: résumé 1,650 vs site /);
    expect(findings[0].text).toContain("1,709");
  });
});

describe("extractPdfText", () => {
  it("reads the live résumé", async () => {
    const bytes = new Uint8Array(readFileSync(resolve(__dirname, "../../../public/resume.pdf")));
    const { pages, text } = await extractPdfText(bytes);
    expect(pages).toBe(1);
    expect(text).toContain("MOHD SHOAIB");
    // The caller's buffer is left usable (pdf.js gets a copy).
    expect(bytes.byteLength).toBeGreaterThan(0);
  });
});

describe("LeetCode lookup word boundary", () => {
  it("does not treat 'Operating Systems 2024' as a rating", () => {
    const text = `${"x ".repeat(120)} Core CS: Operating Systems 2024 1999. mail@example.com`;
    const findings = consistency(text, {
      profile: { email: "mail@example.com" } as never,
      projects: [],
      stats: [{ value: "1,709", label: "Peak contest rating" }],
      awards: [],
    });
    expect(findings.some((f) => f.text.startsWith("LeetCode"))).toBe(false);
  });
});
