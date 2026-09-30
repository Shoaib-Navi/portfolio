// Sign-in throttle: 5 failures per 15 minutes per key (IP). In memory, so on serverless it is
// per instance; the scrypt cost and the generic error message do the rest.

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;
const failures = new Map<string, number[]>();

function recent(key: string, now: number) {
  const list = (failures.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  failures.set(key, list);
  return list;
}

/** Seconds until another attempt is allowed, or 0 when allowed now. */
export function retryAfter(key: string, now = Date.now()): number {
  const list = recent(key, now);
  return list.length < MAX_FAILURES ? 0 : Math.ceil((list[0] + WINDOW_MS - now) / 1000);
}

export function recordFailure(key: string, now = Date.now()) {
  recent(key, now).push(now);
}

export function clearFailures(key: string) {
  failures.delete(key);
}
