/** Elo calibration from one game against an adaptive Stockfish. Pure helpers; the UI lives in CalibrationView. */
import { LEVELS } from './engine/levels';

export const CAL_START_LEVEL = 1000;
/** The estimate is shown once the player made this many moves (or the game ended). */
export const CAL_MIN_MOVES = 12;
/** Opening moves are nearly always "best", so they say little about strength. */
const SKIP_MOVES = 3;
const MAX_LOSS = 300;

/** Raises the engine level after a sharp move and lowers it after a bad one. */
export function adaptLevel(level: number, loss: number): number {
  const lo = LEVELS[0];
  const hi = LEVELS[LEVELS.length - 1];
  const step = loss <= 25 ? 100 : loss >= 150 ? -150 : loss >= 70 ? -50 : 0;
  return Math.max(lo, Math.min(hi, level + step));
}

export const winPct = (cp: number) => 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);

/** Per-move accuracy (0-100), lichess-style, from centipawns before and after the move (mover's point of view). */
export function moveAccuracy(bestCp: number, playedCp: number): number {
  const drop = Math.max(0, winPct(bestCp) - winPct(playedCp));
  return Math.max(0, Math.min(100, 103.1668 * Math.exp(-0.04354 * drop) - 3.1669));
}

export interface CalMove {
  loss: number;
  accuracy: number;
}

export interface CalEstimate {
  elo: number;
  /** Half-width of the confidence band. */
  margin: number;
  accuracy: number;
  acpl: number;
  blunders: number;
  moves: number;
}

/** Maps average centipawn loss (plus blunders) to an Elo; null when there is too little data. */
export function estimateElo(moves: CalMove[]): CalEstimate | null {
  const used = moves.slice(SKIP_MOVES);
  if (used.length < 4) return null;
  const acpl = used.reduce((s, m) => s + Math.min(MAX_LOSS, m.loss), 0) / used.length;
  const blunders = used.filter((m) => m.loss >= 250).length;
  const raw = 2400 * Math.exp(-acpl / 90) - Math.min(150, blunders * 20);
  return {
    elo: Math.max(300, Math.min(2000, Math.round(raw / 50) * 50)),
    margin: Math.max(100, Math.round(450 / Math.sqrt(used.length) / 50) * 50),
    accuracy: Math.round(moves.reduce((s, m) => s + m.accuracy, 0) / moves.length),
    acpl: Math.round(acpl),
    blunders,
    moves: moves.length,
  };
}
