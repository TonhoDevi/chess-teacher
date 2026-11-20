import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { EXERCISES } from './learn/exercises';
import { bandOf, curriculumFor, nextExercises, placementNext, placementUpdate } from './learn/curriculum';
import { buildDb, type Row } from './openings/db';
import { STUDIES, suggestedStudies } from './openings/studies';
import { PUZZLES, dailyPuzzle, nextPuzzles } from './challenges/puzzles';
import { ENDGAMES } from './challenges/endgames';
import { handicapFen, isValidFen } from './challenges/custom';
import { recordDaily, recordTheme, addToRepertoire, dueLines, reviewLine, createProfile, engineEloFor, detailOf, recordExercise, recordGame, recordInsights, updateElo, weakThemes } from './profile/model';

describe('exercise bank', () => {
  it('has legal positions whose solutions are legal (and mate for mate exercises)', () => {
    for (const e of EXERCISES) {
      for (const s of e.solutions) {
        const c = new Chess(e.fen);
        c.move({ from: s.slice(0, 2), to: s.slice(2, 4), promotion: s[4] });
        if (e.theme === 'mate1') expect(c.isCheckmate(), e.id).toBe(true);
      }
    }
  });
});

describe('profile', () => {
  it('moves Elo by game result and exercise outcome', () => {
    expect(updateElo(1000, 1000, 1, 32)).toBe(1016);
    const p = recordGame(createProfile('Ana', 450), { result: 'win', color: 'w', oppElo: 600, pgn: '' });
    expect(p.elo).toBeGreaterThan(450);
    expect(p.history).toHaveLength(1);
    const ex = EXERCISES.find((e) => e.id === 'f1')!;
    expect(recordExercise(p, ex, false).elo).toBeLessThan(p.elo);
  });

  it('detects weaknesses from missed themes and links engine/detail to the profile', () => {
    let p = createProfile('Beto', 950);
    for (let i = 0; i < 4; i++) p = recordInsights(p, [{ key: 'x_hangsPiece' }]);
    p = recordInsights(p, [{ key: 'x_goodFork' }]);
    expect(weakThemes(p)).toEqual(['hanging']);
    expect(engineEloFor(p)).toBe(1000);
    expect(detailOf(p)).toBe('intermediate');
    expect(detailOf(createProfile('Ana', 450))).toBe('beginner');
    expect(engineEloFor({ ...p, prefs: { ...p.prefs, level: 600 } })).toBe(600);
  });
});

describe('curriculum', () => {
  it('adapts to band, weak themes and difficulty', () => {
    expect(bandOf(450)).toBe('beginner');
    expect(bandOf(950)).toBe('intermediate');
    expect(bandOf(1300)).toBe('advanced');
    expect(curriculumFor(950, []).every((l) => l.band === 'intermediate')).toBe(true);
    expect(curriculumFor(950, ['hanging']).some((l) => l.band === 'beginner')).toBe(true);
    expect(nextExercises(450, {}, {}, 3).every((e) => e.rating <= 650)).toBe(true);
    expect(nextExercises(900, {}, { fork: 1 }, 1)[0].theme).toBe('fork');
  });

  it('placement test converges up on success and down on failure', () => {
    const e = placementNext(800, [])!;
    expect(placementUpdate(800, e, true, 0)).toBeGreaterThan(800);
    expect(placementUpdate(800, e, false, 0)).toBeLessThan(800);
    expect(placementNext(800, EXERCISES.slice(0, 6).map((x) => x.id))).toBeNull();
  });
});

describe('openings', () => {
  const db = buildDb([
    ['C50', 'Italian Game', 'e4 e5 Nf3 Nc6 Bc4'],
    ['C60', 'Ruy Lopez', 'e4 e5 Nf3 Nc6 Bb5'],
    ['B00', "King's Pawn", 'e4'],
  ]);

  it('identifies the deepest opening, book depth and next moves', () => {
    expect(db.identify(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6'])?.name).toBe('Italian Game');
    expect(db.identify(['e4', 'c5'])?.eco).toBe('B00');
    expect(db.bookDepth(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6'])).toBe(5);
    expect(db.next(['e4', 'e5', 'Nf3', 'Nc6']).map((n) => n.san).sort()).toEqual(['Bb5', 'Bc4']);
  });

  it('study lines are legal and recognised by the real database', async () => {
    const real = buildDb((await import('./openings/data.json')).default as Row[]);
    for (const s of STUDIES) {
      const c = new Chess();
      expect(() => s.moves.forEach((m) => c.move(m)), s.id).not.toThrow();
      expect(real.identify(s.moves), s.id).not.toBeNull();
    }
  });

  it('suggests simple openings to beginners and more variety above', () => {
    expect(suggestedStudies(450, []).every((s) => s.level === 1)).toBe(true);
    expect(suggestedStudies(450, []).length).toBeLessThanOrEqual(2);
    expect(suggestedStudies(950, []).length).toBe(3);
    expect(suggestedStudies(450, ['italian']).some((s) => s.id === 'italian')).toBe(false);
  });

  it('spaced repetition: success moves the line up, a mistake resets it', () => {
    let p = addToRepertoire(createProfile('A', 900), 'italian', 0);
    expect(dueLines(p, 0)).toEqual(['italian']);
    p = reviewLine(p, 'italian', true, 0);
    p = reviewLine(p, 'italian', true, 0);
    expect(p.repertoire!.italian.box).toBe(2);
    expect(dueLines(p, 1000)).toEqual([]);
    p = reviewLine(p, 'italian', false, 0);
    expect(p.repertoire!.italian.box).toBe(0);
    expect(dueLines(p, 0)).toEqual(['italian']);
  });
});

describe('challenges', () => {
  it('puzzle lines are legal and mate puzzles end in checkmate', () => {
    for (const p of PUZZLES) {
      const c = new Chess(p.fen);
      for (const m of p.moves) c.move({ from: m.slice(0, 2), to: m.slice(2, 4), promotion: m[4] });
      if (p.theme === 'mate1' || p.theme === 'mate2' || p.theme === 'mate3') expect(c.isCheckmate(), p.id).toBe(true);
    }
  });

  it('picks puzzles near the Elo and a stable daily one', () => {
    const easy = nextPuzzles(500, {}, {}, 5);
    const hard = nextPuzzles(1700, {}, {}, 5);
    const avg = (l: { rating: number }[]) => l.reduce((a, x) => a + x.rating, 0) / l.length;
    expect(avg(easy)).toBeLessThan(avg(hard));
    expect(dailyPuzzle('a', 900, '2026-01-01').id).toBe(dailyPuzzle('a', 900, '2026-01-01').id);
  });

  it('endgame positions and handicaps are valid', () => {
    for (const e of ENDGAMES) expect(isValidFen(e.fen), e.id).toBe(true);
    for (const h of ['q', 'r', 'b', 'n'] as const) expect(isValidFen(handicapFen(h, '')), h).toBe(true);
    expect(handicapFen('q', '')).not.toContain('RNBQKBNR');
  });

  it('puzzle results move Elo and themes; the daily streak counts consecutive days', () => {
    let p = createProfile('A', 900);
    p = recordTheme(p, 'mate2', 1200, true, 'x');
    expect(p.elo).toBeGreaterThan(900);
    expect(p.puzzles!.x.ok).toBe(1);
    p = recordDaily(p, '2026-03-01', true);
    p = recordDaily(p, '2026-03-02', true);
    expect(p.daily!.streak).toBe(2);
    expect(recordDaily(p, '2026-03-02', false).daily!.ok).toBe(true);
    expect(recordDaily(p, '2026-03-05', true).daily!.streak).toBe(1);
  });
});
