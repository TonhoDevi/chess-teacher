import { Chess } from 'chess.js';

export interface GameSetup {
  fen?: string;
  color: 'w' | 'b';
  /** Engine Elo; undefined follows the profile. */
  level?: number;
  /** Base time in seconds and increment per move in seconds. */
  clock?: { base: number; inc: number };
  /** Endgame drill: results feed the profile's endgame theme. */
  goal?: { win: boolean; rating: number };
  /** Changes on every launch so the same setup can be started again. */
  nonce: number;
}

export type Handicap = '' | 'q' | 'r' | 'b' | 'n';
const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const FILE_OF: Record<string, string> = { q: 'd', r: 'a', b: 'c', n: 'b' };

/** Standard start position without one piece per side (queenside rook/bishop/knight or the queen). */
export function handicapFen(white: Handicap, black: Handicap): string {
  const c = new Chess(START);
  let castling = 'KQkq';
  for (const [color, h] of [['w', white], ['b', black]] as const) {
    if (!h) continue;
    c.remove(`${FILE_OF[h]}${color === 'w' ? 1 : 8}` as never);
    if (h === 'r') castling = castling.replace(color === 'w' ? 'Q' : 'q', '');
  }
  const parts = c.fen().split(' ');
  parts[2] = castling || '-';
  return parts.join(' ');
}

export function isValidFen(fen: string): boolean {
  try {
    new Chess(fen.trim());
    return true;
  } catch {
    return false;
  }
}

export const formatClock = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
