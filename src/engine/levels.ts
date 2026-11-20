export interface LevelConfig {
  elo: number;
  limitStrength: boolean;
  uciElo?: number;
  skill: number;
  depth: number;
  /** Probability of playing a random legal move (simulates beginner mistakes). */
  randomMoveProb: number;
}

export const LEVELS = [400, 600, 800, 1000, 1200, 1400, 1600, 1800] as const;

const UCI_ELO_MIN = 1320;

/** Maps a target Elo to Stockfish settings. UCI_Elo only works from 1320; below that we cripple the engine manually. */
export function levelConfig(elo: number): LevelConfig {
  if (elo >= UCI_ELO_MIN) {
    return { elo, limitStrength: true, uciElo: Math.min(elo, 3190), skill: 20, depth: 12, randomMoveProb: 0 };
  }
  const t = Math.max(0, Math.min(1, (elo - 400) / (UCI_ELO_MIN - 400)));
  return {
    elo,
    limitStrength: false,
    skill: Math.round(t * 5),
    depth: t < 0.5 ? 1 : 2,
    randomMoveProb: +(0.5 - 0.45 * t).toFixed(2),
  };
}
