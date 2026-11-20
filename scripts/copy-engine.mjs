import { cpSync, mkdirSync, existsSync } from 'node:fs';
const src = 'node_modules/stockfish/bin/';
if (existsSync(src)) {
  mkdirSync('public/engine', { recursive: true });
  for (const f of ['stockfish-19-lite-single.js', 'stockfish-19-lite-single.wasm']) cpSync(src + f, 'public/engine/' + f);
}
