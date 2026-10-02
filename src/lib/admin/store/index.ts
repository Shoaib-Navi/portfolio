import { collectionPath, validate, type CollectionName, type Collections } from "@/lib/content/schema";
import { storeMode } from "../env";
import { GitHubStore } from "./github";
import { LocalStore } from "./local";
import { StoreError, type Store } from "./types";

export * from "./types";

export function getStore(): Store {
  return storeMode() === "github" ? new GitHubStore() : new LocalStore();
}

const decoder = new TextDecoder();
const encoder = new TextEncoder();

/** A collection as the admin sees it (draft over live), validated. */
export async function readCollection<K extends CollectionName>(store: Store, name: K): Promise<Collections[K]> {
  const raw = await store.read(collectionPath(name));
  if (!raw) throw new StoreError(`content/${name}.json is missing`);
  const result = validate(name, JSON.parse(decoder.decode(raw)));
  if (!result.ok) throw new StoreError(`content/${name}.json is invalid: ${result.issues[0].path} ${result.issues[0].message}`);
  return result.value;
}

export const encodeCollection = (value: unknown) => encoder.encode(JSON.stringify(value, null, 2) + "\n");
