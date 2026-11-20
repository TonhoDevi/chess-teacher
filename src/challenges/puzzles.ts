import type { Theme } from '../learn/exercises';
import data from './puzzles.json';

export interface Puzzle {
  id: string;
  theme: Theme;
  rating: number;
  /** Position before the opponent's first move (Lichess format). */
  fen: string;
  /** UCI moves: opponent first, then solver / opponent alternating. */
  moves: string[];
}

/** Subset of the Lichess puzzle database (CC0, https://database.lichess.org/#puzzles). */
export const PUZZLES: Puzzle[] = (data as [string, Theme, number, string, string][]).map(([id, theme, rating, fen, moves]) => ({ id, theme, rating, fen, moves: moves.split(' ') }));

export const PUZZLE_THEMES: Theme[] = ['mate1', 'mate2', 'mate3', 'fork', 'pin', 'skewer', 'hanging', 'discovered'];

/** Picks puzzles close to the player's Elo, favouring weak themes and ones not yet solved. */
export function nextPuzzles(elo: number, progress: Record<string, { ok: number; fail: number }> = {}, weak: Record<string, number>, count: number, theme?: Theme): Puzzle[] {
  const score = (p: Puzzle) => -Math.abs(p.rating - elo) / 150 + 2 * (weak[p.theme] ?? 0) - 1.5 * Math.min(progress[p.id]?.ok ?? 0, 2) + 0.3 * (progress[p.id]?.fail ?? 0);
  return PUZZLES.filter((p) => !theme || p.theme === theme)
    .sort((a, b) => score(b) - score(a))
    .slice(0, count);
}

export const todayKey = (d = new Date()) => d.toLocaleDateString('sv');

/** Same puzzle all day for a profile, chosen among those closest to its Elo. */
export function dailyPuzzle(profileId: string, elo: number, date: string): Puzzle {
  const near = [...PUZZLES].sort((a, b) => Math.abs(a.rating - elo) - Math.abs(b.rating - elo) || a.id.localeCompare(b.id)).slice(0, 8);
  let h = 0;
  for (const ch of date + profileId) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return near[h % near.length];
}
