// In-memory case store with subscriptions (MVP — swap for Supabase later).
import type { CaseState } from "./types";

type Listener = (state: CaseState) => void;

const g = globalThis as unknown as {
  __angler_cases?: Map<string, CaseState>;
  __angler_subs?: Map<string, Set<Listener>>;
};
const cases = (g.__angler_cases ??= new Map<string, CaseState>());
const subs = (g.__angler_subs ??= new Map<string, Set<Listener>>());

export function putCase(state: CaseState): void {
  cases.set(state.id, state);
  notify(state.id);
}

export function getCase(id: string): CaseState | undefined {
  return cases.get(id);
}

/** Mutate a case via updater and notify subscribers. */
export function updateCase(id: string, fn: (c: CaseState) => void): void {
  const c = cases.get(id);
  if (!c) return;
  fn(c);
  notify(id);
}

export function subscribe(id: string, fn: Listener): () => void {
  let set = subs.get(id);
  if (!set) subs.set(id, (set = new Set()));
  set.add(fn);
  return () => set!.delete(fn);
}

function notify(id: string): void {
  const c = cases.get(id);
  if (!c) return;
  subs.get(id)?.forEach((fn) => {
    try {
      fn(c);
    } catch {
      /* listener gone */
    }
  });
}
