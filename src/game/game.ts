import { Chess } from 'chess.js';

export type GameStatus =
  | { kind: 'playing'; check: boolean }
  | { kind: 'checkmate'; winner: 'w' | 'b' }
  | { kind: 'draw'; reason: 'stalemate' | 'insufficient' | 'repetition' | 'fifty' };

export function getStatus(chess: Chess): GameStatus {
  if (chess.isCheckmate()) return { kind: 'checkmate', winner: chess.turn() === 'w' ? 'b' : 'w' };
  if (chess.isStalemate()) return { kind: 'draw', reason: 'stalemate' };
  if (chess.isInsufficientMaterial()) return { kind: 'draw', reason: 'insufficient' };
  if (chess.isThreefoldRepetition()) return { kind: 'draw', reason: 'repetition' };
  if (chess.isDraw()) return { kind: 'draw', reason: 'fifty' };
  return { kind: 'playing', check: chess.inCheck() };
}

export interface MoveRow {
  number: number;
  white: string;
  black?: string;
}

/** Groups SAN moves into numbered rows for the move list. */
export function toMoveRows(sans: string[]): MoveRow[] {
  const rows: MoveRow[] = [];
  for (let i = 0; i < sans.length; i += 2) rows.push({ number: i / 2 + 1, white: sans[i], black: sans[i + 1] });
  return rows;
}

export interface UciMove {
  from: string;
  to: string;
  promotion?: string;
}

export function parseUci(uci: string): UciMove {
  return { from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] };
}

/** Undo until it's the human's turn again (undoes the engine reply plus the human move). */
export function undoToHuman(chess: Chess, human: 'w' | 'b') {
  if (chess.history().length === 0) return;
  chess.undo();
  if (chess.turn() !== human && chess.history().length > 0) chess.undo();
}
