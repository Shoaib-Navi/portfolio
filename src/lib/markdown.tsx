import { Fragment, type ReactNode } from "react";

// A deliberately small Markdown subset for case studies and notes, rendered to React
// elements (never raw HTML), so content can't inject markup or scripts.
//
// Blocks:  ## / ### headings · paragraphs · "- " or "1. " lists · > quotes · ``` code fences
// Inline:  **bold** · *italic* · `code` · [text](https://… or /path)

export type Heading = { id: string; text: string; level: 2 | 3 };

type Block =
  | { t: "h"; level: 2 | 3; text: string; id: string }
  | { t: "p"; text: string }
  | { t: "ul" | "ol"; items: string[] }
  | { t: "quote"; text: string }
  | { t: "code"; lang: string; text: string };

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[`*[\]()]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "section";

export function parseBlocks(src: string): Block[] {
  const lines = src.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  const used = new Map<string, number>();
  const uniqueId = (text: string) => {
    const base = slugify(text);
    const n = used.get(base) ?? 0;
    used.set(base, n + 1);
    return n ? `${base}-${n + 1}` : base;
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    const fence = /^```(\w*)\s*$/.exec(line);
    if (fence) {
      const body: string[] = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) body.push(lines[i++]);
      i++; // closing fence (or end of input)
      blocks.push({ t: "code", lang: fence[1], text: body.join("\n") });
      continue;
    }
    const h = /^(#{2,3})\s+(.+)$/.exec(line);
    if (h) {
      const text = h[2].trim();
      blocks.push({ t: "h", level: h[1].length as 2 | 3, text, id: uniqueId(text) });
      i++;
      continue;
    }
    if (/^>\s?/.test(line)) {
      const body: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) body.push(lines[i++].replace(/^>\s?/, ""));
      blocks.push({ t: "quote", text: body.join(" ") });
      continue;
    }
    const listKind = /^[-*]\s+/.test(line) ? "ul" : /^\d+\.\s+/.test(line) ? "ol" : null;
    if (listKind) {
      const marker = listKind === "ul" ? /^[-*]\s+/ : /^\d+\.\s+/;
      const items: string[] = [];
      while (i < lines.length && (marker.test(lines[i]) || (/^\s{2,}\S/.test(lines[i]) && items.length))) {
        if (marker.test(lines[i])) items.push(lines[i].replace(marker, ""));
        else items[items.length - 1] += ` ${lines[i].trim()}`;
        i++;
      }
      blocks.push({ t: listKind, items });
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(```|#{2,3}\s|>|[-*]\s|\d+\.\s)/.test(lines[i])) para.push(lines[i++].trim());
    blocks.push({ t: "p", text: para.join(" ") });
  }
  return blocks;
}

const SAFE_HREF = /^(https:\/\/|\/(?!\/)|#)/;

/** Inline formatting: **bold**, *italic*, `code`, [text](href). Everything else is plain text. */
export function inline(text: string, keyBase = "i"): ReactNode[] {
  const out: ReactNode[] = [];
  // Code first so its contents are never formatted; bold before italic so ** isn't read as *.
  const re = /(`([^`]+)`)|(\*\*(.+?)\*\*)|(\*([^*\s](?:[^*]*[^*\s])?)\*)|(\[([^\]]+)\]\(([^)\s]+)\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const key = `${keyBase}-${k++}`;
    if (m[2] !== undefined) out.push(<code key={key}>{m[2]}</code>);
    else if (m[4] !== undefined) out.push(<strong key={key}>{inline(m[4], key)}</strong>);
    else if (m[6] !== undefined) out.push(<em key={key}>{inline(m[6], key)}</em>);
    else if (m[8] !== undefined) {
      const href = m[9];
      if (SAFE_HREF.test(href)) {
        const external = href.startsWith("https://");
        out.push(
          <a key={key} href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
            {inline(m[8], key)}
          </a>,
        );
      } else out.push(m[8]);
    }
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function headingsOf(src: string): Heading[] {
  return parseBlocks(src).flatMap((b) => (b.t === "h" ? [{ id: b.id, text: b.text, level: b.level }] : []));
}

/** Rough reading time at ~220 words a minute, code included. */
export function readingMinutes(src: string): number {
  return Math.max(1, Math.round(src.split(/\s+/).filter(Boolean).length / 220));
}

export function Markdown({ source, className = "md" }: { source: string; className?: string }) {
  const blocks = parseBlocks(source);
  return (
    <div className={className}>
      {blocks.map((b, i) => {
        const key = `b${i}`;
        switch (b.t) {
          case "h":
            return b.level === 2 ? (
              <h2 key={key} id={b.id}>
                {inline(b.text, key)}
              </h2>
            ) : (
              <h3 key={key} id={b.id}>
                {inline(b.text, key)}
              </h3>
            );
          case "p":
            return <p key={key}>{inline(b.text, key)}</p>;
          case "quote":
            return (
              <blockquote key={key}>
                <p>{inline(b.text, key)}</p>
              </blockquote>
            );
          case "code":
            return (
              <pre key={key} data-lang={b.lang || undefined}>
                <code>{b.text}</code>
              </pre>
            );
          default: {
            const List = b.t;
            return (
              <List key={key}>
                {b.items.map((item, j) => (
                  <li key={j}>
                    <Fragment>{inline(item, `${key}-${j}`)}</Fragment>
                  </li>
                ))}
              </List>
            );
          }
        }
      })}
    </div>
  );
}
