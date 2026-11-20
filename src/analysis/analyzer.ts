import { Engine } from '../engine/engine';
import type { Evaluation } from '../engine/uci';
import { evalFen } from './review';

const DEPTH = 11;

/** Full-strength Stockfish in its own worker, with a per-position cache shared by live feedback, hints and review. */
export class Analyzer {
  private engine = new Engine();
  private cache = new Map<string, Evaluation>();
  private ready = this.engine.setFullStrength();

  evaluate = async (fen: string): Promise<Evaluation> => {
    const hit = this.cache.get(fen);
    if (hit) return hit;
    await this.ready;
    const ev = await evalFen(fen, (f) => this.engine.evaluate(f, DEPTH));
    this.cache.set(fen, ev);
    return ev;
  };

  terminate() {
    this.engine.terminate();
  }
}
