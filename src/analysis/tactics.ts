import { Chess, type Color, type PieceSymbol, type Square } from 'chess.js';

export const VALUE: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
const FILES = 'abcdefgh';

export interface PieceAt {
  square: Square;
  type: PieceSymbol;
  color: Color;
}

export function piecesOf(chess: Chess, color: Color): PieceAt[] {
  const out: PieceAt[] = [];
  chess.board().forEach((row, r) =>
    row.forEach((p, f) => {
      if (p && p.color === color) out.push({ square: (FILES[f] + (8 - r)) as Square, type: p.type, color });
    }),
  );
  return out;
}

/** Pieces of `color` (never the king) that the enemy can win material from by capturing. */
export function hangingPieces(chess: Chess, color: Color): PieceAt[] {
  const enemy: Color = color === 'w' ? 'b' : 'w';
  return piecesOf(chess, color)
    .filter((p) => p.type !== 'k')
    .filter((p) => {
      const attackers = chess.attackers(p.square, enemy).map((s) => VALUE[chess.get(s)!.type]);
      if (attackers.length === 0) return false;
      const defended = chess.attackers(p.square, color).length > 0;
      return !defended || Math.min(...attackers) < VALUE[p.type];
    })
    .sort((a, b) => VALUE[b.type] - VALUE[a.type]);
}

const DIRS: Record<string, [number, number][]> = {
  b: [[1, 1], [1, -1], [-1, 1], [-1, -1]],
  r: [[1, 0], [-1, 0], [0, 1], [0, -1]],
  q: [[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]],
};

export type Tactic = 'fork' | 'pin' | 'skewer';

/** Looks for a fork/pin/skewer created by the piece standing on `sq` (the piece that just moved). */
export function findTactic(chess: Chess, sq: Square): Tactic | null {
  const piece = chess.get(sq);
  if (!piece) return null;
  const me = piece.color;
  const enemy: Color = me === 'w' ? 'b' : 'w';
  if (hangingPieces(chess, me).some((p) => p.square === sq)) return null;

  const targets = piecesOf(chess, enemy).filter(
    (p) =>
      chess.attackers(p.square, me).includes(sq) &&
      (p.type === 'k' || VALUE[p.type] > VALUE[piece.type] || chess.attackers(p.square, enemy).length === 0),
  );
  if (targets.length >= 2) return 'fork';

  for (const [df, dr] of DIRS[piece.type] ?? []) {
    let f = FILES.indexOf(sq[0]) + df;
    let r = Number(sq[1]) + dr;
    const hit: PieceAt[] = [];
    while (f >= 0 && f < 8 && r >= 1 && r <= 8 && hit.length < 2) {
      const p = chess.get((FILES[f] + r) as Square);
      if (p) {
        if (p.color === me) break;
        hit.push({ square: (FILES[f] + r) as Square, type: p.type, color: enemy });
      }
      f += df;
      r += dr;
    }
    if (hit.length === 2) {
      const [a, b] = hit;
      if (VALUE[a.type] > VALUE[b.type] && VALUE[a.type] >= 5) return 'skewer';
      if (b.type === 'k' || (VALUE[b.type] > VALUE[a.type] && VALUE[b.type] >= 5)) return 'pin';
    }
  }
  return null;
}
