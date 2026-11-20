import { useCallback, useEffect, useState } from 'react';
import type { Profile } from './model';

const KEY = 'chess-teacher/profiles';

interface State {
  profiles: Profile[];
  activeId: string | null;
}

function load(): State {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? '');
    if (Array.isArray(s.profiles)) return s;
  } catch {
    /* first run or corrupt data */
  }
  return { profiles: [], activeId: null };
}

/** Local profiles persisted in localStorage (no login). */
export function useProfiles() {
  const [state, setState] = useState<State>(load);
  useEffect(() => localStorage.setItem(KEY, JSON.stringify(state)), [state]);

  const active = state.profiles.find((p) => p.id === state.activeId) ?? null;
  const add = useCallback((p: Profile) => setState((s) => ({ profiles: [...s.profiles, p], activeId: p.id })), []);
  const select = useCallback((id: string) => setState((s) => ({ ...s, activeId: id })), []);
  const remove = useCallback(
    (id: string) =>
      setState((s) => {
        const profiles = s.profiles.filter((p) => p.id !== id);
        return { profiles, activeId: s.activeId === id ? (profiles[0]?.id ?? null) : s.activeId };
      }),
    [],
  );
  /** Updates the active profile; safe to call from async callbacks. */
  const update = useCallback(
    (fn: (p: Profile) => Profile) => setState((s) => ({ ...s, profiles: s.profiles.map((p) => (p.id === s.activeId ? fn(p) : p)) })),
    [],
  );
  return { profiles: state.profiles, active, add, select, remove, update };
}
