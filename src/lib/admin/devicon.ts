// Search and fetch logos from devicon, the set every logo in /public/logos comes from.

const BASE = "https://cdn.jsdelivr.net/gh/devicons/devicon@latest";
type Entry = { name: string; altnames?: string[]; tags?: string[]; versions: { svg: string[] } };
export type DeviconHit = { name: string; variants: string[] };

let cache: { at: number; list: Entry[] } | null = null;

async function catalogue(): Promise<Entry[]> {
  if (cache && Date.now() - cache.at < 60 * 60 * 1000) return cache.list;
  const res = await fetch(`${BASE}/devicon.json`, { cache: "no-store" });
  if (!res.ok) throw new Error(`devicon catalogue unavailable (${res.status})`);
  cache = { at: Date.now(), list: (await res.json()) as Entry[] };
  return cache.list;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9+#]/g, "");

export async function searchDevicon(query: string, limit = 8): Promise<DeviconHit[]> {
  const q = norm(query);
  if (!q) return [];
  const scored = (await catalogue())
    .map((e) => {
      const names = [e.name, ...(e.altnames ?? [])].map(norm);
      const score = names.includes(q) ? 3 : names.some((n) => n.startsWith(q)) ? 2 : names.some((n) => n.includes(q)) ? 1 : 0;
      return { e, score };
    })
    .filter((x) => x.score > 0 && x.e.versions.svg.length > 0)
    .sort((a, b) => b.score - a.score || a.e.name.length - b.e.name.length);
  return scored.slice(0, limit).map(({ e }) => ({ name: e.name, variants: e.versions.svg }));
}

export const deviconUrl = (name: string, variant: string) => `${BASE}/icons/${name}/${name}-${variant}.svg`;

export async function fetchDevicon(name: string, variant: string): Promise<Uint8Array> {
  if (!/^[a-z0-9]+$/.test(name) || !/^[a-z-]+$/.test(variant)) throw new Error("Invalid logo name");
  const entry = (await catalogue()).find((e) => e.name === name);
  if (!entry || !entry.versions.svg.includes(variant)) throw new Error(`devicon has no ${name}-${variant}`);
  const res = await fetch(deviconUrl(name, variant), { cache: "no-store" });
  if (!res.ok) throw new Error(`Could not download ${name}-${variant}.svg (${res.status})`);
  return new Uint8Array(await res.arrayBuffer());
}
