import { EXERCISES, type Exercise, type Theme } from './exercises';

export type Band = 'beginner' | 'intermediate' | 'advanced';

export interface Lesson {
  id: string;
  band: Band;
  theme: Theme;
  /** Exercises that train the lesson; empty means "read and play a game". Texts: les_<id>_t / les_<id>_b. */
  exercises: string[];
}

export const LESSONS: Lesson[] = [
  { id: 'values', band: 'beginner', theme: 'hanging', exercises: ['h1', 'h2'] },
  { id: 'hanging', band: 'beginner', theme: 'hanging', exercises: ['h3', 'h2', 'h1'] },
  { id: 'mate', band: 'beginner', theme: 'mate1', exercises: ['m1', 'm4', 'e2'] },
  { id: 'principles', band: 'beginner', theme: 'opening', exercises: ['o2', 'o1', 'o3'] },
  { id: 'fork', band: 'intermediate', theme: 'fork', exercises: ['f1', 'f2'] },
  { id: 'pinskewer', band: 'intermediate', theme: 'pin', exercises: ['p1', 's1'] },
  { id: 'mates', band: 'intermediate', theme: 'mate1', exercises: ['m2', 'm3'] },
  { id: 'endgame', band: 'intermediate', theme: 'endgame', exercises: ['e1', 'e2'] },
  { id: 'openings', band: 'intermediate', theme: 'opening', exercises: ['o3', 'o1'] },
  { id: 'plans', band: 'advanced', theme: 'opening', exercises: [] },
  { id: 'pawns', band: 'advanced', theme: 'endgame', exercises: [] },
  { id: 'repertoire', band: 'advanced', theme: 'opening', exercises: [] },
  { id: 'theory', band: 'advanced', theme: 'endgame', exercises: ['e1', 'e2'] },
  { id: 'calc', band: 'advanced', theme: 'fork', exercises: ['m2', 'm3', 'f1', 'f2', 'p1', 's1'] },
];

export function bandOf(elo: number): Band {
  return elo < 700 ? 'beginner' : elo < 1100 ? 'intermediate' : 'advanced';
}

export const detailFor = (elo: number) => (bandOf(elo) === 'beginner' ? ('beginner' as const) : ('intermediate' as const));

export function lessonProgress(lesson: Lesson, solved: Record<string, { ok: number; fail: number }>): number {
  if (lesson.exercises.length === 0) return 0;
  return lesson.exercises.filter((id) => (solved[id]?.ok ?? 0) > 0).length / lesson.exercises.length;
}

/** Lessons for the profile's band, plus reinforcement lessons from lower bands for weak themes. */
export function curriculumFor(elo: number, weak: Theme[]): Lesson[] {
  const band = bandOf(elo);
  const order: Band[] = ['beginner', 'intermediate', 'advanced'];
  return LESSONS.filter((l) => l.band === band || (order.indexOf(l.band) < order.indexOf(band) && weak.includes(l.theme)));
}

export interface ExerciseStat {
  ok: number;
  fail: number;
}

/** Picks exercises near the player's level, favouring weak themes and ones not yet solved. */
export function nextExercises(elo: number, progress: Record<string, ExerciseStat>, weak: Record<string, number>, count: number, theme?: Theme): Exercise[] {
  const score = (e: Exercise) => {
    const p = progress[e.id];
    return -Math.abs(e.rating - elo) / 200 + 2 * (weak[e.theme] ?? 0) - 0.6 * (p?.ok ?? 0) + 0.2 * (p?.fail ?? 0);
  };
  return EXERCISES.filter((e) => !theme || e.theme === theme)
    .sort((a, b) => score(b) - score(a))
    .slice(0, count);
}

const PLACEMENT_QUESTIONS = 6;

/** Adaptive quick test: serves the unseen exercise closest to the current estimate. */
export function placementNext(estimate: number, usedIds: string[]): Exercise | null {
  if (usedIds.length >= PLACEMENT_QUESTIONS) return null;
  const pool = EXERCISES.filter((e) => !usedIds.includes(e.id));
  return pool.sort((a, b) => Math.abs(a.rating - estimate) - Math.abs(b.rating - estimate))[0] ?? null;
}

export function placementUpdate(estimate: number, exercise: Exercise, ok: boolean, answered: number): number {
  const expected = 1 / (1 + 10 ** ((exercise.rating - estimate) / 400));
  const k = 120 / (1 + 0.35 * answered);
  return Math.max(400, Math.min(1400, Math.round(estimate + k * ((ok ? 1 : 0) - expected))));
}
