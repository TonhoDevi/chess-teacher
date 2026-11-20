export type Theme = 'hanging' | 'mate1' | 'mate2' | 'mate3' | 'fork' | 'pin' | 'skewer' | 'discovered' | 'endgame' | 'opening';
export const THEMES: Theme[] = ['hanging', 'mate1', 'mate2', 'mate3', 'fork', 'pin', 'skewer', 'discovered', 'endgame', 'opening'];

export interface Exercise {
  id: string;
  theme: Theme;
  fen: string;
  /** Accepted first moves in UCI. */
  solutions: string[];
  /** Difficulty on the Elo scale. */
  rating: number;
}

const ex = (id: string, theme: Theme, rating: number, fen: string, ...solutions: string[]): Exercise => ({ id, theme, fen, solutions, rating });

export const EXERCISES: Exercise[] = [
  ex('o2', 'opening', 400, 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 'e2e4', 'd2d4', 'g1f3', 'c2c4'),
  ex('h1', 'hanging', 450, '4k3/8/8/3q4/8/8/8/3RK3 w - - 0 1', 'd1d5'),
  ex('o1', 'opening', 450, 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2', 'g1f3', 'b1c3', 'f1c4', 'd2d4'),
  ex('h2', 'hanging', 500, '4k3/8/8/8/4b3/8/8/4K2Q w - - 0 1', 'h1e4'),
  ex('h3', 'hanging', 550, '4k3/8/8/1p6/2B5/8/8/4K3 w - - 0 1', 'c4b5'),
  ex('m1', 'mate1', 550, '6k1/5ppp/8/8/8/8/8/R3K3 w - - 0 1', 'a1a8'),
  ex('m4', 'mate1', 600, 'k7/8/1K6/8/8/8/8/7R w - - 0 1', 'h1h8'),
  ex('o3', 'opening', 600, 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4', 'e1g1', 'd2d3', 'b1c3', 'd2d4'),
  ex('m3', 'mate1', 650, 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4', 'h5f7'),
  ex('e1', 'endgame', 700, '8/P7/8/8/8/8/8/k6K w - - 0 1', 'a7a8q'),
  ex('e2', 'endgame', 750, '7k/5K2/8/8/8/8/8/6Q1 w - - 0 1', 'g1g7'),
  ex('m2', 'mate1', 800, '6k1/5ppp/8/8/8/8/5PPP/3Q2K1 w - - 0 1', 'd1d8'),
  ex('f1', 'fork', 950, 'r3k3/8/8/3N4/8/8/8/4K3 w - - 0 1', 'd5c7'),
  ex('f2', 'fork', 1000, '4k3/8/8/3n1r2/8/4P3/8/4K3 w - - 0 1', 'e3e4'),
  ex('p1', 'pin', 1050, '4k3/8/2n5/8/8/8/4B3/4K3 w - - 0 1', 'e2b5'),
  ex('s1', 'skewer', 1100, 'q3k3/8/8/8/8/8/8/4K2R w - - 0 1', 'h1h8'),
];

export const exerciseById = (id: string) => EXERCISES.find((e) => e.id === id)!;
