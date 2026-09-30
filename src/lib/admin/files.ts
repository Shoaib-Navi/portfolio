import { StoreError } from "./store/types";

// Upload checks. The browser converts images to WebP before sending, but nothing from the
// client is trusted: type is decided by magic bytes, sizes are capped, SVGs are screened.

export const LIMITS = { image: 2 * 1024 * 1024, logo: 200 * 1024, pdf: 2 * 1024 * 1024 };

export type Kind = "webp" | "png" | "jpeg" | "svg" | "pdf";

const starts = (b: Uint8Array, bytes: number[], offset = 0) => bytes.every((v, i) => b[offset + i] === v);
const ascii = (s: string) => [...s].map((c) => c.charCodeAt(0));

export function sniff(b: Uint8Array): Kind | null {
  if (starts(b, ascii("RIFF")) && starts(b, ascii("WEBP"), 8)) return "webp";
  if (starts(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";
  if (starts(b, [0xff, 0xd8, 0xff])) return "jpeg";
  if (starts(b, ascii("%PDF-"))) return "pdf";
  const head = new TextDecoder().decode(b.subarray(0, 512)).trimStart().toLowerCase();
  if (head.startsWith("<svg") || (head.startsWith("<?xml") && head.includes("<svg"))) return "svg";
  return null;
}

/** Throws unless the bytes are one of the allowed kinds and within the size cap. */
export function expectKind(b: Uint8Array, allowed: Kind[], maxBytes: number): Kind {
  if (b.byteLength === 0) throw new StoreError("The file is empty");
  if (b.byteLength > maxBytes) throw new StoreError(`File is too large (max ${Math.round(maxBytes / 1024)} KB)`);
  const kind = sniff(b);
  if (!kind || !allowed.includes(kind)) throw new StoreError(`Expected ${allowed.join(" or ")}, got ${kind ?? "an unknown file type"}`);
  return kind;
}

// Anything that can run code or pull in outside content. SVGs are shown through <img>, which
// never runs scripts, but a logo URL opened directly would render as a document, so these are
// rejected outright instead of being "cleaned".
const SVG_FORBIDDEN: [RegExp, string][] = [
  [/<script[\s>]/i, "a <script> element"],
  [/<foreignObject[\s>]/i, "a <foreignObject> element"],
  [/<(?:iframe|embed|object|audio|video|animate|set)[\s>/]/i, "an embedded or animated element"],
  [/\son[a-z]+\s*=/i, "an event handler attribute"],
  [/javascript:/i, "a javascript: URL"],
  [/<!ENTITY/i, "an XML entity declaration"],
  [/(?:xlink:)?href\s*=\s*["']\s*(?!#)[^"']/i, "a link to an outside resource"],
  [/url\(\s*["']?\s*(?!#)[^)]/i, "a CSS url() to an outside resource"],
  [/@import/i, "a CSS @import"],
];

export function checkSvg(b: Uint8Array): string {
  const text = new TextDecoder("utf-8", { fatal: true }).decode(b);
  for (const [re, what] of SVG_FORBIDDEN) if (re.test(text)) throw new StoreError(`SVG rejected: contains ${what}`);
  if (!/<svg[\s>][\s\S]*<\/svg>\s*$/i.test(text.trim())) throw new StoreError("SVG rejected: not a complete <svg> document");
  // Drop comments and the XML prolog; keeps the file small and predictable.
  return text
    .replace(/<\?xml[\s\S]*?\?>/g, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<!DOCTYPE[\s\S]*?>/gi, "")
    .trim();
}

/** Reads width/height from a WebP header (VP8, VP8L and VP8X). */
export function webpSize(b: Uint8Array): { width: number; height: number } | null {
  const chunk = new TextDecoder().decode(b.subarray(12, 16));
  const u24 = (o: number) => b[o] | (b[o + 1] << 8) | (b[o + 2] << 16);
  if (chunk === "VP8X") return { width: u24(24) + 1, height: u24(27) + 1 };
  if (chunk === "VP8 ") return { width: (b[26] | (b[27] << 8)) & 0x3fff, height: (b[28] | (b[29] << 8)) & 0x3fff };
  if (chunk === "VP8L") {
    const bits = b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  return null;
}

/** "My Photo (1).JPG" → "my-photo-1" */
export function safeName(input: string, fallback = "file"): string {
  const base = input
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/, "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return base || fallback;
}

export const stamp = (now = new Date()) => now.toISOString().slice(0, 10);
