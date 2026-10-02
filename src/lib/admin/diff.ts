// Line diff for the Publish review (LCS; content files are a few hundred lines at most).

export type DiffLine = { kind: "add" | "del" | "ctx" | "gap"; text: string };

export function lineDiff(before: string, after: string, context = 2, maxLines = 1500): DiffLine[] {
  const a = before.split("\n");
  const b = after.split("\n");
  if (a.length + b.length > maxLines) return [{ kind: "gap", text: `File too large to diff (${a.length} → ${b.length} lines)` }];

  // lcs[i][j] = LCS length of a[i..] and b[j..]
  const lcs: Uint16Array[] = Array.from({ length: a.length + 1 }, () => new Uint16Array(b.length + 1));
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--) lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);

  const full: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      full.push({ kind: "ctx", text: a[i] });
      i++;
      j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) full.push({ kind: "del", text: a[i++] });
    else full.push({ kind: "add", text: b[j++] });
  }
  while (i < a.length) full.push({ kind: "del", text: a[i++] });
  while (j < b.length) full.push({ kind: "add", text: b[j++] });

  // Keep changed lines plus a little context; collapse the rest.
  const keep = full.map(() => false);
  full.forEach((l, k) => {
    if (l.kind === "ctx") return;
    for (let d = -context; d <= context; d++) if (full[k + d]) keep[k + d] = true;
  });
  const out: DiffLine[] = [];
  let skipped = 0;
  full.forEach((l, k) => {
    if (keep[k]) {
      if (skipped) out.push({ kind: "gap", text: `… ${skipped} unchanged line${skipped === 1 ? "" : "s"}` });
      skipped = 0;
      out.push(l);
    } else skipped++;
  });
  if (skipped && out.length) out.push({ kind: "gap", text: `… ${skipped} unchanged line${skipped === 1 ? "" : "s"}` });
  return out;
}
