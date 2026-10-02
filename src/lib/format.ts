// Date formatting that gives the same string on the server (Node, UTC on Vercel) and in
// the browser (any locale or time zone), so client components hydrate without mismatches.
// Intl is only used for the numeric parts, which every engine agrees on; names are ours.

export const DISPLAY_TZ = "Asia/Kolkata";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type Parts = { y: number; m: number; d: number; hh: number; mm: number };

function partsOf(iso: string | Date): Parts {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: DISPLAY_TZ,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  });
  const get = (type: string, list: Intl.DateTimeFormatPart[]) => Number(list.find((p) => p.type === type)?.value ?? 0);
  const list = fmt.formatToParts(typeof iso === "string" ? new Date(iso) : iso);
  return { y: get("year", list), m: get("month", list), d: get("day", list), hh: get("hour", list) % 24, mm: get("minute", list) };
}

const weekday = (y: number, m: number, d: number) => DAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];

/** A "YYYY-MM-DD" day key: "2 Sep" | "Wed 2 Sep" | "Wednesday 2 September". */
export function formatDay(day: string, style: "axis" | "short" | "long" = "short"): string {
  const [y, m, d] = day.split("-").map(Number);
  if (style === "axis") return `${d} ${MONTHS[m - 1].slice(0, 3)}`;
  if (style === "long") return `${weekday(y, m, d)} ${d} ${MONTHS[m - 1]}`;
  return `${weekday(y, m, d).slice(0, 3)} ${d} ${MONTHS[m - 1].slice(0, 3)}`;
}

/** "2 Sep 2026" */
export function formatDate(iso: string): string {
  const p = partsOf(iso);
  return `${p.d} ${MONTHS[p.m - 1].slice(0, 3)} ${p.y}`;
}

/** "2 Sep 2026, 14:05" (India time) */
export function formatDateTime(iso: string): string {
  const p = partsOf(iso);
  return `${formatDate(iso)}, ${String(p.hh).padStart(2, "0")}:${String(p.mm).padStart(2, "0")}`;
}

/** "just now" / "5 min ago" / "3 h ago" / "2 d ago", relative to `now` (pass the server's
 *  clock to client components so both render the same text). */
export function timeAgo(iso: string | undefined, now: number): string {
  if (!iso) return "never";
  const s = Math.max(0, (now - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86400)} d ago`;
}
