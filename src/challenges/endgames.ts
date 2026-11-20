export interface Endgame {
  /** Texts: end_<id>_t / end_<id>_b. */
  id: string;
  fen: string;
  color: 'w' | 'b';
  /** "win" = checkmate or promotion-to-win; "draw" = not losing. */
  goal: 'win' | 'draw';
  rating: number;
}

export const ENDGAMES: Endgame[] = [
  { id: 'kqk', fen: '8/8/8/4k3/8/8/8/3QK3 w - - 0 1', color: 'w', goal: 'win', rating: 500 },
  { id: 'krk', fen: '8/8/8/4k3/8/8/8/R3K3 w - - 0 1', color: 'w', goal: 'win', rating: 700 },
  { id: 'kpk', fen: '6k1/8/6K1/6P1/8/8/8/8 w - - 0 1', color: 'w', goal: 'win', rating: 900 },
  { id: 'opposition', fen: '8/8/8/8/3k4/8/3P4/3K4 w - - 0 1', color: 'w', goal: 'draw', rating: 1100 },
  { id: 'lucena', fen: '1K1k4/1P6/8/8/8/8/r7/5R2 w - - 0 1', color: 'w', goal: 'win', rating: 1300 },
];
