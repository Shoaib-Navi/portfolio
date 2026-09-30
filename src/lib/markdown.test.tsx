import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { headingsOf, inline, Markdown, parseBlocks, readingMinutes } from "./markdown";

const html = (src: string) => renderToStaticMarkup(<Markdown source={src} />);

describe("markdown subset", () => {
  it("parses headings, paragraphs, lists, quotes and code fences", () => {
    const blocks = parseBlocks("## Title\n\nOne\nline.\n\n- a\n- b\n  continued\n\n1. x\n2. y\n\n> quote\n\n```sql\nSELECT 1;\n```");
    expect(blocks.map((b) => b.t)).toEqual(["h", "p", "ul", "ol", "quote", "code"]);
    expect(blocks[1]).toEqual({ t: "p", text: "One line." });
    expect(blocks[2]).toEqual({ t: "ul", items: ["a", "b continued"] });
    expect(blocks[5]).toEqual({ t: "code", lang: "sql", text: "SELECT 1;" });
  });

  it("gives headings unique ids for the table of contents", () => {
    expect(headingsOf("## Why\n### Setup\n## Why")).toEqual([
      { id: "why", text: "Why", level: 2 },
      { id: "setup", text: "Setup", level: 3 },
      { id: "why-2", text: "Why", level: 2 },
    ]);
  });

  it("renders inline bold, code and safe links only", () => {
    const out = renderToStaticMarkup(<p>{inline("**b** and `c` [ok](https://x.dev) [site](/work) [bad](javascript:alert(1))")}</p>);
    expect(out).toContain("<strong>b</strong>");
    expect(out).toContain("<code>c</code>");
    expect(out).toContain('href="https://x.dev" target="_blank" rel="noopener noreferrer"');
    expect(out).toContain('href="/work"');
    expect(out).not.toContain("javascript:");
    expect(out).toContain("bad");
  });

  it("formats inside bold, supports italics, and leaves lone asterisks alone", () => {
    const out = renderToStaticMarkup(<p>{inline("**roles with `BYPASSRLS` ignore it** and *one* query; 2 * 3 * 4")}</p>);
    expect(out).toContain("<strong>roles with <code>BYPASSRLS</code> ignore it</strong>");
    expect(out).toContain("<em>one</em>");
    expect(out).toContain("2 * 3 * 4");
  });

  it("escapes raw HTML instead of rendering it", () => {
    const out = html('<script>alert(1)</script>\n\n<img src=x onerror="alert(1)">');
    expect(out).not.toContain("<script>");
    expect(out).not.toContain("<img");
    expect(out).toContain("&lt;script&gt;");
  });

  it("keeps code blocks verbatim (no inline formatting inside)", () => {
    expect(html("```\n**not bold** `x`\n```")).toContain("<code>**not bold** `x`</code>");
  });

  it("estimates reading time", () => {
    expect(readingMinutes("word ".repeat(10))).toBe(1);
    expect(readingMinutes("word ".repeat(880))).toBe(4);
  });
});
