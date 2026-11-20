import { bandOf, type Band } from '../learn/curriculum';

export interface Study {
  /** Texts: op_<id>_n (name), op_<id>_idea, op_<id>_plan, op_<id>_err. */
  id: string;
  side: 'w' | 'b';
  /** 1 = simple, 2 = intermediate, 3 = advanced. */
  level: 1 | 2 | 3;
  moves: string[];
}

const s = (id: string, side: 'w' | 'b', level: 1 | 2 | 3, line: string): Study => ({ id, side, level, moves: line.split(' ') });

export const STUDIES: Study[] = [
  s('italian', 'w', 1, 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6'),
  s('london', 'w', 1, 'd4 d5 Bf4 Nf6 e3 e6 Nf3 Bd6 Bg3 O-O'),
  s('scandinavian', 'b', 1, 'e4 d5 exd5 Qxd5 Nc3 Qa5 d4 Nf6 Nf3 c6'),
  s('caro', 'b', 1, 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5 Ng3 Bg6'),
  s('ruy', 'w', 2, 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7'),
  s('qg', 'w', 2, 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O'),
  s('sicilian', 'b', 2, 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6'),
  s('french', 'b', 2, 'e4 e6 d4 d5 Nc3 Nf6 Bg5 Be7 e5 Nfd7'),
  s('kid', 'b', 3, 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O'),
  s('english', 'w', 3, 'c4 e5 Nc3 Nf6 Nf3 Nc6 g3 d5 cxd5 Nxd5'),
];

export const studyById = (id: string) => STUDIES.find((x) => x.id === id)!;

const MAX_LEVEL: Record<Band, number> = { beginner: 1, intermediate: 2, advanced: 3 };

/** Simple openings (one per colour) for beginners; a wider mix as the Elo grows. */
export function suggestedStudies(elo: number, inRepertoire: string[]): Study[] {
  const band = bandOf(elo);
  const pool = STUDIES.filter((x) => x.level <= MAX_LEVEL[band] && !inRepertoire.includes(x.id));
  // Prefer the highest level the player can handle, then spread across colours.
  pool.sort((a, b) => b.level - a.level);
  const out: Study[] = [];
  for (const side of ['w', 'b'] as const) {
    const pick = pool.find((x) => x.side === side && !out.includes(x));
    if (pick) out.push(pick);
  }
  if (band !== 'beginner') {
    const extra = pool.find((x) => !out.includes(x));
    if (extra) out.push(extra);
  }
  return out;
}
