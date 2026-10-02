import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { checkSvg, expectKind, LIMITS, safeName, sniff, webpSize } from "./files";
import { StoreError } from "./store/types";

const enc = (s: string) => new TextEncoder().encode(s);
const file = (p: string) => new Uint8Array(readFileSync(resolve(__dirname, "../../..", p)));

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0]);

describe("sniff", () => {
  it("detects by magic bytes", () => {
    expect(sniff(file("public/shots/carepulse.webp"))).toBe("webp");
    expect(sniff(PNG)).toBe("png");
    expect(sniff(JPEG)).toBe("jpeg");
    expect(sniff(enc("%PDF-1.7\n"))).toBe("pdf");
    expect(sniff(enc("  <svg xmlns='http://www.w3.org/2000/svg'></svg>"))).toBe("svg");
    expect(sniff(enc('<?xml version="1.0"?>\n<svg></svg>'))).toBe("svg");
  });

  it("returns null for unknown bytes", () => {
    expect(sniff(enc("hello"))).toBeNull();
    expect(sniff(enc("<?xml version='1.0'?><html/>"))).toBeNull();
    expect(sniff(new Uint8Array())).toBeNull();
  });
});

describe("expectKind", () => {
  it("returns the kind when allowed and within the cap", () => {
    expect(expectKind(PNG, ["png", "webp"], LIMITS.image)).toBe("png");
  });

  it("rejects empty, oversized and wrong-type files", () => {
    expect(() => expectKind(new Uint8Array(), ["png"], 100)).toThrow(/empty/);
    expect(() => expectKind(new Uint8Array(2048), ["png"], 1024)).toThrow(/too large \(max 1 KB\)/);
    expect(() => expectKind(JPEG, ["png", "webp"], 1024)).toThrow("Expected png or webp, got jpeg");
    expect(() => expectKind(enc("nope"), ["pdf"], 1024)).toThrow(/unknown file type/);
    expect(() => expectKind(enc("nope"), ["pdf"], 1024)).toThrow(StoreError);
  });
});

describe("checkSvg", () => {
  const wrap = (inner: string, attrs = "") => enc(`<svg xmlns="http://www.w3.org/2000/svg"${attrs}>${inner}</svg>`);

  it.each([
    ["script", wrap("<script>alert(1)</script>")],
    ["event handler", wrap("", ' onload="alert(1)"')],
    ["javascript: URL", wrap('<a xlink:href="javascript:alert(1)"><rect/></a>')],
    ["foreignObject", wrap("<foreignObject><div/></foreignObject>")],
    ["entity", enc('<?xml version="1.0"?><!DOCTYPE svg [<!ENTITY x "y">]><svg></svg>')],
    ["external href", wrap('<image href="http://evil.test/a.png"/>')],
    ["external xlink:href", wrap('<use xlink:href="https://evil.test/a.svg#x"/>')],
    ["external url()", wrap('<rect style="fill: url(http://evil.test/p.svg)"/>')],
    ["@import", wrap("<style>@import 'https://evil.test/x.css';</style>")],
    ["animate", wrap('<animate attributeName="href" to="x"/>')],
  ])("rejects %s", (_, bytes) => {
    expect(() => checkSvg(bytes)).toThrow(/SVG rejected/);
  });

  it("rejects an incomplete document and invalid UTF-8", () => {
    expect(() => checkSvg(enc("<svg><rect/>"))).toThrow(/not a complete/);
    expect(() => checkSvg(new Uint8Array([0x3c, 0x73, 0x76, 0x67, 0xff, 0xfe]))).toThrow();
  });

  it("accepts a devicon-style SVG with internal refs and strips prolog and comments", () => {
    const src = `<?xml version="1.0" encoding="UTF-8"?>
<!-- generated -->
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 128 128">
  <defs><linearGradient id="grad"><stop offset="0" stop-color="#5a9fd4"/></linearGradient></defs>
  <path id="p" fill="url(#grad)" d="M0 0h128v128H0z"/>
  <use href="#p"/><use xlink:href="#p"/>
</svg>
`;
    const out = checkSvg(enc(src));
    expect(out.startsWith("<svg")).toBe(true);
    expect(out).not.toContain("<?xml");
    expect(out).not.toContain("generated");
    expect(out).toContain('fill="url(#grad)"');
    expect(out.endsWith("</svg>")).toBe(true);
  });
});

describe("webpSize", () => {
  it("reads real files", () => {
    expect(webpSize(file("public/shots/carepulse.webp"))).toEqual({ width: 1400, height: 749 });
    expect(webpSize(file("public/pfp/shoaib.webp"))).toEqual({ width: 720, height: 960 });
  });

  it("returns null for a non-WebP header", () => {
    expect(webpSize(new Uint8Array(32))).toBeNull();
  });
});

describe("safeName", () => {
  it("slugifies file names", () => {
    expect(safeName("My Photo (1).JPG")).toBe("my-photo-1");
    expect(safeName("  --Résumé_v2.pdf")).toBe("resume-v2");
    expect(safeName("a".repeat(60) + ".png")).toHaveLength(40);
  });

  it("falls back when nothing is left", () => {
    expect(safeName("???.png")).toBe("file");
    expect(safeName("", "logo")).toBe("logo");
  });
});
