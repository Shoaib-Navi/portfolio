"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { saveCollection } from "@/app/admin/actions";
import type { CollectionName, Collections, Issue } from "@/lib/content/schema";
import { useToast } from "./Toasts";

const key = (name: string) => `admin.unsaved.${name}`;

/**
 * Form state for one content collection: edits stay in the browser until "Save draft",
 * unsaved edits survive a closed tab (localStorage), and server-side validation issues
 * come back keyed by field path, e.g. "[0].points[1].text".
 */
export function useCollection<K extends CollectionName>(name: K, initial: Collections[K]) {
  const [value, setValue] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [restorable, setRestorable] = useState<{ at: string; value: Collections[K] } | null>(null);
  const [saving, startSaving] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const loaded = useRef(false);

  const dirty = useMemo(() => JSON.stringify(value) !== JSON.stringify(saved), [value, saved]);

  // Server data changed (another save, a publish): adopt it unless the user is mid-edit.
  useEffect(() => {
    setSaved(initial);
    setValue((v) => (JSON.stringify(v) === JSON.stringify(saved) ? initial : v));
  }, [JSON.stringify(initial)]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key(name));
      if (raw) {
        const stored = JSON.parse(raw) as { at: string; value: Collections[K] };
        if (JSON.stringify(stored.value) !== JSON.stringify(initial)) setRestorable(stored);
        else localStorage.removeItem(key(name));
      }
    } catch {
      /* storage blocked: recovery is a convenience only */
    }
    loaded.current = true;
  }, [name]);

  useEffect(() => {
    if (!loaded.current) return;
    try {
      if (dirty) localStorage.setItem(key(name), JSON.stringify({ at: new Date().toISOString(), value }));
      else localStorage.removeItem(key(name));
    } catch {
      /* ignore */
    }
  }, [dirty, name, value]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const save = useCallback(
    (next?: Collections[K], okMessage = "Draft saved") =>
      new Promise<boolean>((resolve) =>
        startSaving(async () => {
          const payload = next ?? value;
          const res = await saveCollection(name, payload);
          if (res.ok) {
            setIssues([]);
            setSaved(payload);
            setValue(payload);
            try {
              localStorage.removeItem(key(name));
            } catch {}
            toast(okMessage);
            router.refresh();
            resolve(true);
          } else {
            setIssues(res.issues ?? []);
            toast(res.error, "error");
            resolve(false);
          }
        }),
      ),
    [name, router, toast, value],
  );

  const reset = useCallback(() => {
    setValue(saved);
    setIssues([]);
  }, [saved]);

  const issueAt = useCallback((path: string) => issues.find((i) => i.path === path)?.message, [issues]);

  return {
    value,
    setValue,
    dirty,
    saving,
    save,
    reset,
    issues,
    issueAt,
    restorable,
    restore: () => {
      if (restorable) setValue(restorable.value);
      setRestorable(null);
    },
    dropRestorable: () => {
      setRestorable(null);
      try {
        localStorage.removeItem(key(name));
      } catch {}
    },
  };
}

/** Immutable helpers for nested list edits. */
export const move = <T,>(list: T[], from: number, to: number) => {
  if (to < 0 || to >= list.length || from === to) return list;
  const next = list.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
};
export const replaceAt = <T,>(list: T[], i: number, item: T) => list.map((x, j) => (j === i ? item : x));
export const removeAt = <T,>(list: T[], i: number) => list.filter((_, j) => j !== i);
