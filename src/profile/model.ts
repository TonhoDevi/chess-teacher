import type { Detail, ExplainItem } from '../analysis/explain';
import { THEMES, type Exercise, type Theme } from '../learn/exercises';
import { bandOf, detailFor } from '../learn/curriculum';
import { LEVELS } from '../engine/levels';
import type { Locale } from '../i18n/locale';

export interface GameRecord {
  date: string;
  result: 'win' | 'loss' | 'draw';
  color: 'w' | 'b';
  oppElo: number;
  eloBefore: number;
  eloAfter: number;
  pgn: string;
}

export interface Prefs {
  theme: 'auto' | 'light' | 'dark';
  locale?: Locale;
  detail: 'auto' | Detail;
  /** Engine strength: "auto" follows the profile Elo. */
  level: 'auto' | number;
}

export interface Profile {
  id: string;
  name: string;
  elo: number;
  prefs: Prefs;
  history: GameRecord[];
  exercises: Record<string, { ok: number; fail: number }>;
  themes: Partial<Record<Theme, { seen: number; missed: number }>>;
  /** Opening study id -> spaced-repetition state (absent in profiles saved before phase 4). */
  repertoire?: Record<string, LineState>;
}

export interface LineState {
  box: number;
  due: number;
  ok: number;
  fail: number;
}

const DAY = 86_400_000;
const BOX_DAYS = [0, 1, 3, 7, 16, 35];

export const ELO_MIN = 300;
export const ELO_MAX = 2000;
const MAX_HISTORY = 50;
const clampElo = (v: number) => Math.max(ELO_MIN, Math.min(ELO_MAX, Math.round(v)));

export function createProfile(name: string, elo: number): Profile {
  return {
    id: Math.random().toString(36).slice(2, 10),
    name: name.trim() || 'Jogador',
    elo: clampElo(elo),
    prefs: { theme: 'auto', detail: 'auto', level: 'auto' },
    history: [],
    exercises: {},
    themes: {},
  };
}

export const expectedScore = (elo: number, opp: number) => 1 / (1 + 10 ** ((opp - elo) / 400));

const kFor = (games: number) => (games < 10 ? 40 : games < 30 ? 28 : 20);

export function updateElo(elo: number, opp: number, score: number, k: number): number {
  return clampElo(elo + k * (score - expectedScore(elo, opp)));
}

export function recordGame(p: Profile, g: Omit<GameRecord, 'eloBefore' | 'eloAfter' | 'date'>): Profile {
  const score = g.result === 'win' ? 1 : g.result === 'draw' ? 0.5 : 0;
  const eloAfter = updateElo(p.elo, g.oppElo, score, kFor(p.history.length));
  const rec: GameRecord = { ...g, date: new Date().toISOString(), eloBefore: p.elo, eloAfter };
  return { ...p, elo: eloAfter, history: [...p.history, rec].slice(-MAX_HISTORY) };
}

function bumpTheme(p: Profile, theme: Theme, missed: boolean): Profile {
  const cur = p.themes[theme] ?? { seen: 0, missed: 0 };
  return { ...p, themes: { ...p.themes, [theme]: { seen: cur.seen + 1, missed: cur.missed + (missed ? 1 : 0) } } };
}

export function recordExercise(p: Profile, ex: Exercise, ok: boolean): Profile {
  const cur = p.exercises[ex.id] ?? { ok: 0, fail: 0 };
  const next = bumpTheme({ ...p, exercises: { ...p.exercises, [ex.id]: { ok: cur.ok + (ok ? 1 : 0), fail: cur.fail + (ok ? 0 : 1) } } }, ex.theme, !ok);
  return { ...next, elo: updateElo(p.elo, ex.rating, ok ? 1 : 0, 16) };
}

const MISSED: Partial<Record<string, Theme>> = {
  x_hangsPiece: 'hanging', x_missedCapture: 'hanging', x_allowsMate: 'mate1', x_missedMate: 'mate1',
  x_missedFork: 'fork', x_missedPin: 'pin', x_missedSkewer: 'skewer',
};
const HIT: Partial<Record<string, Theme>> = {
  x_goodCapture: 'hanging', x_goodMate: 'mate1', x_goodFork: 'fork', x_goodPin: 'pin', x_goodSkewer: 'skewer',
};

/** Learns from what the explanation engine found in a played move. */
export function recordInsights(p: Profile, items: ExplainItem[]): Profile {
  let out = p;
  for (const i of items) {
    if (MISSED[i.key]) out = bumpTheme(out, MISSED[i.key]!, true);
    else if (HIT[i.key]) out = bumpTheme(out, HIT[i.key]!, false);
  }
  return out;
}

/** Miss rate (0..1) per theme with enough evidence; used to rank weaknesses. */
export function weaknessRates(p: Profile): Record<string, number> {
  const out: Record<string, number> = {};
  for (const t of THEMES) {
    const s = p.themes[t];
    if (s && s.seen >= 3 && s.missed / s.seen >= 0.4) out[t] = s.missed / s.seen;
  }
  return out;
}

export function weakThemes(p: Profile, max = 2): Theme[] {
  const r = weaknessRates(p);
  return (Object.keys(r) as Theme[]).sort((a, b) => r[b] - r[a]).slice(0, max);
}

export const snapLevel = (elo: number) => LEVELS.reduce((best, l) => (Math.abs(l - elo) < Math.abs(best - elo) ? l : best), LEVELS[0]);
export const engineEloFor = (p: Profile): number => (p.prefs.level === 'auto' ? snapLevel(p.elo) : p.prefs.level);
export const detailOf = (p: Profile): Detail => (p.prefs.detail === 'auto' ? detailFor(p.elo) : p.prefs.detail);
export { bandOf };

export function addToRepertoire(p: Profile, id: string, now = Date.now()): Profile {
  if (p.repertoire?.[id]) return p;
  return { ...p, repertoire: { ...p.repertoire, [id]: { box: 0, due: now, ok: 0, fail: 0 } } };
}

export function removeFromRepertoire(p: Profile, id: string): Profile {
  const rest = { ...p.repertoire };
  delete rest[id];
  return { ...p, repertoire: rest };
}

/** Leitner boxes: a correct run moves the line up (longer wait), a mistake sends it back to box 0. */
export function reviewLine(p: Profile, id: string, ok: boolean, now = Date.now()): Profile {
  const cur = p.repertoire?.[id] ?? { box: 0, due: now, ok: 0, fail: 0 };
  const box = ok ? Math.min(cur.box + 1, BOX_DAYS.length - 1) : 0;
  const next: LineState = { box, due: now + BOX_DAYS[box] * DAY, ok: cur.ok + (ok ? 1 : 0), fail: cur.fail + (ok ? 0 : 1) };
  return { ...p, repertoire: { ...p.repertoire, [id]: next } };
}

export function dueLines(p: Profile, now = Date.now()): string[] {
  return Object.entries(p.repertoire ?? {}).filter(([, l]) => l.due <= now).map(([id]) => id);
}
