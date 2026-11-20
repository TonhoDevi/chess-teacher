import { Chess } from 'chess.js';
import { VALUE } from './tactics';

export type MoveClass = 'brilliant' | 'best' | 'good' | 'inaccuracy' | 'mistake' | 'blunder';

const CLAMP = 800;
const clamp = (v: number) => Math.max(-CLAMP, Math.min(CLAMP, v));

/** Centipawns lost by the played move versus the best one (both from the mover's point of view). */
export function cpLoss(bestCp: number, playedCp: number): number {
  return Math.max(0, clamp(bestCp) - clamp(playedCp));
}

export function classify(o: { loss: number; isBest: boolean; sacrifice: boolean; playedCp: number }): MoveClass {
  if (o.sacrifice && o.loss <= 20 && o.playedCp >= -100) return 'brilliant';
  if (o.isBest || o.loss <= 10) return 'best';
  if (o.loss < 60) return 'good';
  if (o.loss < 120) return 'inaccuracy';
  if (o.loss < 250) return 'mistake';
  return 'blunder';
}

/** A piece (not pawn/king) moved where it can be taken for net material loss. */
export function isSacrifice(fenBefore: Chess | string, uci: string): boolean {
  const c = typeof fenBefore === 'string' ? new Chess(fenBefore) : new Chess(fenBefore.fen());
  const m = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
  if (m.piece === 'p' || m.piece === 'k') return false;
  const enemy = m.color === 'w' ? 'b' : 'w';
  const gain = m.captured ? VALUE[m.captured] : 0;
  return VALUE[m.piece] - gain >= 3 && c.attackers(m.to, enemy).length > 0;
}
