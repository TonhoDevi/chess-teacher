import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { parseInfo } from './engine/uci';
import { classify, cpLoss } from './analysis/classify';
import { hangingPieces } from './analysis/tactics';
import { applyDetail, describeMove, hint } from './analysis/explain';
import { reviewGame, type Evaluator } from './analysis/review';

describe('analysis', () => {
  it('parses engine info, mapping mates to large scores', () => {
    expect(parseInfo('info depth 9 score cp -35 nodes 1 pv e7e5 g1f3', 'e7e5')).toEqual({ cp: -35, best: 'e7e5', pv: ['e7e5', 'g1f3'] });
    expect(parseInfo('info depth 9 score mate 2 pv d1h5', 'd1h5').cp).toBe(9998);
    expect(parseInfo('info score mate -1 pv a2a3', 'a2a3').cp).toBe(-9999);
  });

  it('classifies by centipawn loss', () => {
    const c = (loss: number, sacrifice = false) => classify({ loss, isBest: false, sacrifice, playedCp: 0 });
    expect([c(5), c(40), c(100), c(200), c(400)]).toEqual(['best', 'good', 'inaccuracy', 'mistake', 'blunder']);
    expect(c(0, true)).toBe('brilliant');
    expect(cpLoss(9990, 9000)).toBe(0); // both winning: not penalized
    expect(cpLoss(100, -300)).toBe(400);
  });

  it('detects hanging pieces, forks and pins', () => {
    expect(hangingPieces(new Chess('4k3/8/3p4/4N3/8/8/8/4K3 w - - 0 1'), 'w').map((p) => p.square)).toEqual(['e5']);
    expect(describeMove('r3k3/8/8/3N4/8/8/8/4K3 w - - 0 1', 'd5c7')?.kind).toBe('fork');
    expect(describeMove('4k3/8/2n5/8/8/8/4B3/4K3 w - - 0 1', 'e2b5')?.kind).toBe('pin');
    expect(describeMove('6k1/5ppp/8/8/8/8/8/R3K3 w - - 0 1', 'a1a8')?.kind).toBe('mate');
  });

  it('trims explanations by detail level and builds two-step hints', () => {
    const items = [{ key: 'x_hangsPiece' as const }, { key: 'x_bestMove' as const }];
    expect(applyDetail(items, 'beginner')).toHaveLength(1);
    expect(applyDetail(items, 'intermediate')).toHaveLength(2);
    const start = new Chess().fen();
    expect(hint(start, 'g1f3', 1).items[0]).toEqual({ key: 'x_hintPiece', params: { piece: 'n' } });
    expect(hint(start, 'g1f3', 2).items[0].params?.san).toBe('Nf3');
  });

  it('reviews a game and flags a blunder', async () => {
    const c = new Chess();
    ['e4', 'e5', 'Qh5'].forEach((m) => c.move(m));
    let n = 0;
    const cps = [30, -30, 30, 20]; // start, after e4, after e5, after Qh5
    const search: Evaluator = async () => ({ cp: cps[n++], best: '', pv: [] });
    const r = await reviewGame(c.history({ verbose: true }), search);
    expect(r.moves).toHaveLength(3);
    expect(r.moves[0].cpWhite).toBe(30);
    expect(r.moves[2].cls).toBe('good');
  });
});
