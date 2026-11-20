export type Row = [eco: string, name: string, moves: string];
export interface Named {
  eco: string;
  name: string;
}
export interface NextMove extends Partial<Named> {
  san: string;
  count: number;
}

export interface Db {
  /** Deepest named opening that is a prefix of the game. */
  identify(sans: string[]): Named | null;
  /** Number of leading moves that are still "book" (known theory). */
  bookDepth(sans: string[]): number;
  next(sans: string[]): NextMove[];
}

/** Builds the lookup structures from [eco, name, "e4 e5 Nf3"] rows. */
export function buildDb(rows: Row[]): Db {
  const named = new Map<string, Named>();
  const children = new Map<string, Map<string, number>>();
  for (const [eco, name, moves] of rows) {
    const m = moves.split(' ');
    named.set(moves, { eco, name });
    for (let i = 0; i < m.length; i++) {
      const key = m.slice(0, i).join(' ');
      const kids = children.get(key) ?? new Map<string, number>();
      kids.set(m[i], (kids.get(m[i]) ?? 0) + 1);
      children.set(key, kids);
    }
  }
  const known = (sans: string[]) => children.has(sans.join(' ')) || named.has(sans.join(' '));
  return {
    identify(sans) {
      for (let i = sans.length; i > 0; i--) {
        const hit = named.get(sans.slice(0, i).join(' '));
        if (hit) return hit;
      }
      return null;
    },
    bookDepth(sans) {
      let i = sans.length;
      while (i > 0 && !known(sans.slice(0, i))) i--;
      return i;
    },
    next(sans) {
      const kids = children.get(sans.join(' '));
      if (!kids) return [];
      return [...kids]
        .map(([san, count]) => ({ san, count, ...named.get([...sans, san].join(' ')) }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
    },
  };
}

let cached: Promise<Db> | null = null;
/** The ~360 KB dataset is loaded on demand so it does not slow down the first paint. */
export function loadOpenings(): Promise<Db> {
  cached ??= import('./data.json').then((m) => buildDb(m.default as Row[]));
  return cached;
}
