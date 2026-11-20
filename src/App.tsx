import { useCallback, useEffect, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import { Board } from './components/Board';
import { Engine } from './engine/engine';
import { LEVELS, levelConfig } from './engine/levels';
import { getStatus, parseUci, toMoveRows, undoToHuman } from './game/game';
import { useI18n } from './i18n';
import { SUPPORTED, type Locale } from './i18n/locale';

type Theme = 'auto' | 'light' | 'dark';

export function App() {
  const { t, locale, setLocale } = useI18n();
  const chessRef = useRef(new Chess());
  const engineRef = useRef<Engine | null>(null);
  const [version, setVersion] = useState(0);
  const [human, setHuman] = useState<'w' | 'b'>('w');
  const [elo, setElo] = useState<number>(() => Number(localStorage.getItem('elo')) || 800);
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('theme') as Theme) || 'auto');
  const [thinking, setThinking] = useState(false);
  const [engineError, setEngineError] = useState(false);
  const gameId = useRef(0);

  const chess = chessRef.current;
  const status = getStatus(chess);
  const over = status.kind !== 'playing';
  const bump = () => setVersion((v) => v + 1);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    try {
      engineRef.current = new Engine();
    } catch {
      setEngineError(true);
    }
    return () => engineRef.current?.terminate();
  }, []);

  useEffect(() => {
    localStorage.setItem('elo', String(elo));
    engineRef.current?.setLevel(elo);
  }, [elo]);

  const engineMove = useCallback(async () => {
    const engine = engineRef.current;
    const c = chessRef.current;
    if (!engine || getStatus(c).kind !== 'playing') return;
    const id = gameId.current;
    const fen = c.fen();
    setThinking(true);
    const cfg = levelConfig(elo);
    let move: { from: string; to: string; promotion?: string };
    if (Math.random() < cfg.randomMoveProb) {
      const all = c.moves({ verbose: true });
      const m = all[Math.floor(Math.random() * all.length)];
      move = { from: m.from, to: m.to, promotion: m.promotion };
    } else {
      await engine.setLevel(elo);
      move = parseUci(await engine.bestMove(fen, cfg.depth));
    }
    if (id !== gameId.current || c.fen() !== fen) return; // game changed meanwhile (undo / new game)
    c.move(move);
    setThinking(false);
    bump();
  }, [elo]);

  // Engine plays whenever it is its turn.
  useEffect(() => {
    if (chess.turn() !== human && !over) void engineMove();
  }, [version, human, over, chess, engineMove]);

  function onMove(from: string, to: string, promotion?: string) {
    chess.move({ from, to, promotion });
    bump();
  }

  function newGame(color: 'w' | 'b' = human) {
    gameId.current++;
    chessRef.current = new Chess();
    engineRef.current?.newGame();
    setThinking(false);
    setHuman(color);
    bump();
  }

  function undo() {
    gameId.current++;
    undoToHuman(chess, human);
    setThinking(false);
    bump();
  }

  let message: string;
  if (status.kind === 'checkmate') message = status.winner === human ? t('checkmateWin') : t('checkmateLoss');
  else if (status.kind === 'draw') message = t(status.reason === 'stalemate' ? 'stalemate' : status.reason === 'insufficient' ? 'insufficient' : status.reason === 'repetition' ? 'repetition' : 'fifty');
  else if (engineError) message = t('engineError');
  else if (thinking) message = t('thinking');
  else message = status.check ? `${t('check')} ${t('yourTurn')}` : t('yourTurn');

  const rows = toMoveRows(chess.history());
  const canUndo = chess.history().length > 0 && !thinking;

  return (
    <div className="app">
      <header>
        <h1>♞ {t('title')}</h1>
        <div className="row">
          <select aria-label={t('language')} value={locale} onChange={(e) => setLocale(e.target.value as Locale)}>
            {SUPPORTED.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
          <select aria-label={t('theme')} value={theme} onChange={(e) => setTheme(e.target.value as Theme)}>
            <option value="auto">{t('auto')}</option>
            <option value="light">{t('light')}</option>
            <option value="dark">{t('dark')}</option>
          </select>
        </div>
      </header>

      <main>
        <section className="play">
          <div className={`status ${over ? 'over' : ''}`}>{message}</div>
          <Board chess={chess} version={version} orientation={human} disabled={over || thinking || chess.turn() !== human} onMove={onMove} />
        </section>

        <aside>
          <div className="panel controls">
            <label>
              {t('yourColor')}
              <select value={human} onChange={(e) => newGame(e.target.value as 'w' | 'b')}>
                <option value="w">{t('white')}</option>
                <option value="b">{t('black')}</option>
              </select>
            </label>
            <label>
              {t('level')}
              <select value={elo} onChange={(e) => setElo(Number(e.target.value))}>
                {LEVELS.map((l) => (
                  <option key={l} value={l}>
                    ~{l}
                  </option>
                ))}
              </select>
            </label>
            <div className="row">
              <button className="primary" onClick={() => newGame()}>
                {t('newGame')}
              </button>
              <button onClick={undo} disabled={!canUndo}>
                ↶ {t('undo')}
              </button>
            </div>
          </div>
          <div className="panel moves">
            <h2>{t('moves')}</h2>
            {rows.length === 0 ? (
              <p className="muted">{t('noMoves')}</p>
            ) : (
              <ol>
                {rows.map((r) => (
                  <li key={r.number}>
                    <span className="n">{r.number}.</span> <span>{r.white}</span> <span>{r.black ?? ''}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}
