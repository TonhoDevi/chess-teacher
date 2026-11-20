import { Chess, type Move } from 'chess.js';
import type { Evaluation } from '../engine/uci';
import { classify, cpLoss, isSacrifice, type MoveClass } from './classify';
import { explainMove, type ExplainItem } from './explain';

export type Evaluator = (fen: string) => Promise<Evaluation>;

export interface MoveReview {
  ply: number;
  san: string;
  color: 'w' | 'b';
  cls: MoveClass;
  loss: number;
  items: ExplainItem[];
  /** Evaluation after the move, white's point of view (centipawns). */
  cpWhite: number;
}

export const uciOf = (m: Pick<Move, 'from' | 'to' | 'promotion'>) => m.from + m.to + (m.promotion ?? '');

/** Terminal positions have no search result, so they are scored directly. */
export async function evalFen(fen: string, search: Evaluator): Promise<Evaluation> {
  const c = new Chess(fen);
  if (c.isCheckmate()) return { cp: -10000, best: '', pv: [] };
  if (c.isDraw()) return { cp: 0, best: '', pv: [] };
  return search(fen);
}

export function reviewMove(ply: number, move: Move, before: Evaluation, after: Evaluation): MoveReview {
  const uci = uciOf(move);
  const playedCp = -after.cp;
  const loss = cpLoss(before.cp, playedCp);
  const cls = classify({ loss, isBest: uci === before.best, sacrifice: isSacrifice(move.before, uci), playedCp });
  let bestSan = '';
  if (before.best && before.best !== uci) bestSan = new Chess(move.before).move({ from: before.best.slice(0, 2), to: before.best.slice(2, 4), promotion: before.best[4] }).san;
  return {
    ply,
    san: move.san,
    color: move.color,
    cls,
    loss,
    items: explainMove(move.before, uci, before.best, bestSan, cls, loss),
    cpWhite: move.color === 'w' ? playedCp : -playedCp,
  };
}

export interface GameReview {
  startCp: number;
  moves: MoveReview[];
}

export async function reviewGame(moves: Move[], search: Evaluator, onProgress?: (done: number, total: number) => void): Promise<GameReview> {
  if (moves.length === 0) return { startCp: 0, moves: [] };
  let prev = await evalFen(moves[0].before, search);
  const startCp = prev.cp;
  const out: MoveReview[] = [];
  for (let i = 0; i < moves.length; i++) {
    const next = await evalFen(moves[i].after, search);
    out.push(reviewMove(i, moves[i], prev, next));
    prev = next;
    onProgress?.(i + 1, moves.length);
  }
  return { startCp, moves: out };
}

export const isCritical = (m: MoveReview) => m.cls === 'brilliant' || m.cls === 'mistake' || m.cls === 'blunder';

export function countByClass(moves: MoveReview[], color: 'w' | 'b'): Record<MoveClass, number> {
  const r = { brilliant: 0, best: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0 };
  moves.filter((m) => m.color === color).forEach((m) => r[m.cls]++);
  return r;
}
