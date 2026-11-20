export interface Evaluation {
  /** Centipawns from the side to move's point of view; mates are mapped to ±(10000 - plies). */
  cp: number;
  best: string;
  pv: string[];
}

/** Parses the last "info ... score ... pv ..." line of a search plus its bestmove. */
export function parseInfo(info: string, best: string): Evaluation {
  const m = /score (cp|mate) (-?\d+)/.exec(info);
  const pv = /\bpv (.+)$/.exec(info)?.[1].trim().split(' ') ?? [best];
  let cp = 0;
  if (m) {
    const v = Number(m[2]);
    cp = m[1] === 'cp' ? v : v > 0 ? 10000 - v : -10000 - v;
  }
  return { cp, best, pv };
}
