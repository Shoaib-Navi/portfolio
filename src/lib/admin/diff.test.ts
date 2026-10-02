import { describe, expect, it } from "vitest";
import { lineDiff } from "./diff";

const lines = (n: number) => Array.from({ length: n }, (_, i) => `line ${i + 1}`);

describe("lineDiff", () => {
  it("returns nothing for identical input", () => {
    const text = lines(20).join("\n");
    expect(lineDiff(text, text).filter((l) => l.kind === "add" || l.kind === "del")).toEqual([]);
  });

  it("shows a single-line change as one del and one add with context", () => {
    const before = lines(10);
    const after = [...before];
    after[4] = "changed";
    expect(lineDiff(before.join("\n"), after.join("\n"))).toEqual([
      { kind: "gap", text: "… 2 unchanged lines" },
      { kind: "ctx", text: "line 3" },
      { kind: "ctx", text: "line 4" },
      { kind: "del", text: "line 5" },
      { kind: "add", text: "changed" },
      { kind: "ctx", text: "line 6" },
      { kind: "ctx", text: "line 7" },
      { kind: "gap", text: "… 3 unchanged lines" },
    ]);
  });

  it("collapses the unchanged run between two distant changes", () => {
    const before = lines(30);
    const after = [...before];
    after[2] = "first";
    after[25] = "second";
    const out = lineDiff(before.join("\n"), after.join("\n"), 1);
    expect(out.filter((l) => l.kind === "gap").map((l) => l.text)).toEqual(["… 1 unchanged line", "… 20 unchanged lines", "… 3 unchanged lines"]);
    expect(out.filter((l) => l.kind === "add").map((l) => l.text)).toEqual(["first", "second"]);
  });

  it("handles pure additions and deletions", () => {
    expect(lineDiff("a", "a\nb")).toEqual([
      { kind: "ctx", text: "a" },
      { kind: "add", text: "b" },
    ]);
    expect(lineDiff("a\nb", "b")).toEqual([
      { kind: "del", text: "a" },
      { kind: "ctx", text: "b" },
    ]);
  });

  it("returns a single gap line when the input is too large", () => {
    const big = lines(1000).join("\n");
    expect(lineDiff(big, big + "\nx")).toEqual([{ kind: "gap", text: "File too large to diff (1000 → 1001 lines)" }]);
    expect(lineDiff("a\nb", "a\nc", 2, 3)).toHaveLength(1);
  });
});
