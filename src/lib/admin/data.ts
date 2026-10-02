import { COLLECTIONS, type CollectionName, type Collections } from "@/lib/content/schema";
import { getStore, readCollection, type Store } from "./store";

/** Reads several collections (draft view) in parallel. */
export async function load<K extends CollectionName>(names: K[], store: Store = getStore()): Promise<Pick<Collections, K>> {
  const values = await Promise.all(names.map((n) => readCollection(store, n)));
  return Object.fromEntries(names.map((n, i) => [n, values[i]])) as unknown as Pick<Collections, K>;
}

export const loadAll = (store?: Store) => load(COLLECTIONS, store);

/** Human-readable message for anything thrown while loading admin data. */
export const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e));
