import { levelConfig } from './levels';

/** Thin UCI wrapper around Stockfish WASM running in a Web Worker. */
export class Engine {
  private worker: Worker;
  private listeners = new Set<(line: string) => void>();
  private ready: Promise<void>;

  constructor() {
    this.worker = new Worker(`${import.meta.env.BASE_URL}engine/stockfish-19-lite-single.js`);
    this.worker.onmessage = (e) => this.listeners.forEach((l) => l(String(e.data)));
    this.ready = this.waitFor('uciok', 'uci').then(() => this.waitFor('readyok', 'isready'));
  }

  private send(cmd: string) {
    this.worker.postMessage(cmd);
  }

  private waitFor(token: string, cmd?: string): Promise<void> {
    return new Promise((resolve) => {
      const l = (line: string) => {
        if (line.startsWith(token)) {
          this.listeners.delete(l);
          resolve();
        }
      };
      this.listeners.add(l);
      if (cmd) this.send(cmd);
    });
  }

  async setLevel(elo: number) {
    await this.ready;
    const c = levelConfig(elo);
    this.send(`setoption name Skill Level value ${c.skill}`);
    this.send(`setoption name UCI_LimitStrength value ${c.limitStrength}`);
    if (c.uciElo) this.send(`setoption name UCI_Elo value ${c.uciElo}`);
    return c;
  }

  /** Returns the best move in UCI notation (e.g. "e2e4", "e7e8q"). */
  async bestMove(fen: string, depth: number): Promise<string> {
    await this.ready;
    return new Promise((resolve) => {
      const l = (line: string) => {
        if (line.startsWith('bestmove')) {
          this.listeners.delete(l);
          resolve(line.split(' ')[1]);
        }
      };
      this.listeners.add(l);
      this.send(`position fen ${fen}`);
      this.send(`go depth ${depth}`);
    });
  }

  newGame() {
    this.send('stop');
    this.send('ucinewgame');
  }

  terminate() {
    this.worker.terminate();
  }
}
