import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { getStatus, parseUci, toMoveRows, undoToHuman } from './game/game';
import { levelConfig } from './engine/levels';
import { detectLocale } from './i18n/locale';
import { messages } from './i18n/messages';

describe('game', () => {
  it('detects fool\'s mate', () => {
    const c = new Chess();
    ['f3', 'e5', 'g4', 'Qh4'].forEach((m) => c.move(m));
    expect(getStatus(c)).toEqual({ kind: 'checkmate', winner: 'b' });
  });
  it('detects stalemate', () => {
    const c = new Chess('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1');
    expect(getStatus(c)).toEqual({ kind: 'draw', reason: 'stalemate' });
  });
  it('supports castling, en passant and promotion', () => {
    const c = new Chess('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
    expect(c.move('O-O').san).toBe('O-O');
    const ep = new Chess('4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1');
    expect(ep.move('exd6').flags).toContain('e');
    const pr = new Chess('8/P7/8/8/8/8/8/k6K w - - 0 1');
    expect(pr.move({ from: 'a7', to: 'a8', promotion: 'q' }).san).toBe('a8=Q+');
  });
  it('groups moves into rows and parses UCI', () => {
    expect(toMoveRows(['e4', 'e5', 'Nf3'])).toEqual([
      { number: 1, white: 'e4', black: 'e5' },
      { number: 2, white: 'Nf3', black: undefined },
    ]);
    expect(parseUci('e7e8q')).toEqual({ from: 'e7', to: 'e8', promotion: 'q' });
  });
  it('undoes back to the human turn', () => {
    const c = new Chess();
    ['e4', 'e5', 'Nf3'].forEach((m) => c.move(m)); // black (engine) to move after human's Nf3? human = w
    undoToHuman(c, 'w'); // engine hasn't replied: only human's move is undone
    expect(c.history()).toEqual(['e4', 'e5']);
    c.move('Nf3'); c.move('Nc6');
    undoToHuman(c, 'w');
    expect(c.history()).toEqual(['e4', 'e5']);
  });
});

describe('engine levels', () => {
  it('uses UCI_Elo from 1320 and manual weakening below', () => {
    expect(levelConfig(1600)).toMatchObject({ limitStrength: true, uciElo: 1600, randomMoveProb: 0 });
    const low = levelConfig(400);
    expect(low.limitStrength).toBe(false);
    expect(low.randomMoveProb).toBeGreaterThan(levelConfig(1000).randomMoveProb);
  });
});

describe('i18n', () => {
  it('detects locale and keeps catalogs in sync', () => {
    expect(detectLocale(['es-ES', 'en-US'])).toBe('en');
    expect(detectLocale(['pt-PT'])).toBe('pt-BR');
    expect(detectLocale(['fr'])).toBe('pt-BR');
    expect(Object.keys(messages.en).sort()).toEqual(Object.keys(messages['pt-BR']).sort());
  });
});
