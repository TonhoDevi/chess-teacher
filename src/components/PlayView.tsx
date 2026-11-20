import { useCallback, useEffect, useRef, useState } from 'react';
import { Chess, type Move } from 'chess.js';
import { detailOf, engineEloFor, recordGame, recordInsights, recordTheme, type Profile } from '../profile/model';
import { Analyzer } from '../analysis/analyzer';
import { hint as makeHint, type Detail, type ExplainItem } from '../analysis/explain';
import { renderItems } from '../analysis/render';
import { reviewGame, reviewMove, type GameReview, type MoveReview } from '../analysis/review';
import { useOpeningDb } from '../openings/useOpenings';
import { formatClock, type GameSetup } from '../challenges/custom';
import { Board } from './Board';
import { PgnDialog } from './PgnDialog';
import { ReviewPanel } from './ReviewPanel';
import { Engine } from '../engine/engine';
import { LEVELS, levelConfig } from '../engine/levels';
import { getStatus, parseUci, toMoveRows, undoToHuman } from '../game/game';
import { useI18n } from '../i18n';
import type { MessageKey } from '../i18n/messages';

interface Props {
  profile: Profile;
  onProfile: (fn: (p: Profile) => Profile) => void;
  /** A custom game / drill launched from the Challenges tab. */
  setup?: GameSetup | null;
}

export function PlayView({ profile, onProfile, setup }: Props) {
  const { t } = useI18n();
  const chessRef = useRef(new Chess());
  const engineRef = useRef<Engine | null>(null);
  const [version, setVersion] = useState(0);
  const [human, setHuman] = useState<'w' | 'b'>('w');
  const [thinking, setThinking] = useState(false);
  const [engineError, setEngineError] = useState(false);
  const gameId = useRef(0);
  const analyzerRef = useRef<Analyzer | null>(null);
  const detail = detailOf(profile);
  const [levelOverride, setLevelOverride] = useState<number | null>(null);
  const [startFen, setStartFen] = useState(false);
  const [clock, setClock] = useState<{ w: number; b: number } | null>(null);
  const [flagged, setFlagged] = useState<'w' | 'b' | null>(null);
  const incRef = useRef(0);
  const lastLen = useRef(0);
  const goal = useRef<GameSetup['goal'] | null>(null);
  const goalDone = useRef(-1);
  const elo = levelOverride ?? engineEloFor(profile);
  const eloRef = useRef(elo);
  eloRef.current = elo;
  const rated = useRef(true);
  const recorded = useRef(-1);
  const [feedback, setFeedback] = useState<MoveReview | null>(null);
  const [hint, setHint] = useState<{ level: 1 | 2; items: ExplainItem[]; from: string; to: string } | null>(null);
  const [review, setReview] = useState<GameReview | null>(null);
  const [reviewProgress, setReviewProgress] = useState<[number, number] | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [pgnOpen, setPgnOpen] = useState(false);

  const chess = chessRef.current;
  const status = getStatus(chess);
  const over = status.kind !== 'playing' || flagged !== null;
  const bump = () => setVersion((v) => v + 1);

  useEffect(() => {
    try {
      engineRef.current = new Engine();
      analyzerRef.current = new Analyzer();
    } catch {
      setEngineError(true);
    }
    return () => {
      engineRef.current?.terminate();
      analyzerRef.current?.terminate();
    };
  }, []);

  useEffect(() => setHint(null), [version]);

  useEffect(() => {
    engineRef.current?.setLevel(elo);
  }, [elo]);

  const engineMove = useCallback(async () => {
    const engine = engineRef.current;
    const c = chessRef.current;
    if (!engine || getStatus(c).kind !== 'playing') return;
    const id = gameId.current;
    const fen = c.fen();
    setThinking(true);
    const cfg = levelConfig(eloRef.current);
    let move: { from: string; to: string; promotion?: string };
    if (Math.random() < cfg.randomMoveProb) {
      const all = c.moves({ verbose: true });
      const m = all[Math.floor(Math.random() * all.length)];
      move = { from: m.from, to: m.to, promotion: m.promotion };
    } else {
      await engine.setLevel(eloRef.current);
      move = parseUci(await engine.bestMove(fen, cfg.depth));
    }
    if (id !== gameId.current || c.fen() !== fen) return; // game changed meanwhile (undo / new game)
    c.move(move);
    setThinking(false);
    bump();
  }, []);

  // Engine plays whenever it is its turn.
  useEffect(() => {
    if (chess.turn() !== human && !over) void engineMove();
  }, [version, human, over, chess, engineMove]);

  // Clock: ticks for the side to move, the increment is added after each move.
  const clockOn = clock !== null;
  useEffect(() => {
    if (!clockOn || over) return;
    const id = setInterval(() => {
      setClock((c) => {
        if (!c) return c;
        const side = chessRef.current.turn();
        const v = c[side] - 200;
        if (v <= 0) setFlagged(side);
        return { ...c, [side]: Math.max(0, v) };
      });
    }, 200);
    return () => clearInterval(id);
  }, [clockOn, over]);

  useEffect(() => {
    const len = chess.history().length;
    if (clockOn && len > lastLen.current) {
      const mover = chess.turn() === 'w' ? 'b' : 'w';
      setClock((c) => (c ? { ...c, [mover]: c[mover] + incRef.current * 1000 } : c));
    }
    lastLen.current = len;
  }, [version, chess, clockOn]);

  function startSetup(s: GameSetup) {
    gameId.current++;
    rated.current = false;
    chessRef.current = new Chess(s.fen);
    lastLen.current = 0;
    engineRef.current?.newGame();
    setFeedback(null);
    setThinking(false);
    setHuman(s.color);
    setLevelOverride(s.level ?? null);
    setStartFen(!!s.fen);
    setFlagged(null);
    incRef.current = s.clock?.inc ?? 0;
    setClock(s.clock ? { w: s.clock.base * 1000, b: s.clock.base * 1000 } : null);
    goal.current = s.goal ?? null;
    bump();
  }

  useEffect(() => {
    if (setup) startSetup(setup);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setup?.nonce]);

  // Endgame drills report to the profile (endgame theme + Elo) once.
  useEffect(() => {
    const g = goal.current;
    if (!g || !over || goalDone.current === gameId.current) return;
    goalDone.current = gameId.current;
    const won = status.kind === 'checkmate' && status.winner === human;
    const lost = (status.kind === 'checkmate' && status.winner !== human) || flagged === human;
    onProfile((p) => recordTheme(p, 'endgame', g.rating, g.win ? won : !lost));
  }, [over, status, human, flagged, onProfile]);

  const setPref = (patch: Partial<Profile['prefs']>) => onProfile((p) => ({ ...p, prefs: { ...p.prefs, ...patch } }));

  // Rated games update the profile Elo once, when they end.
  useEffect(() => {
    if (!over || !rated.current || recorded.current === gameId.current) return;
    recorded.current = gameId.current;
    const result = status.kind === 'checkmate' ? (status.winner === human ? 'win' : 'loss') : 'draw';
    onProfile((p) => recordGame(p, { result, color: human, oppElo: eloRef.current, pgn: chess.pgn() }));
  }, [over, status, human, chess, onProfile]);

  function onMove(from: string, to: string, promotion?: string) {
    const move = chess.move({ from, to, promotion });
    bump();
    void giveFeedback(move, chess.history().length - 1);
  }

  async function giveFeedback(move: Move, ply: number) {
    const a = analyzerRef.current;
    const id = gameId.current;
    if (!a) return;
    const [before, after] = [await a.evaluate(move.before), await a.evaluate(move.after)];
    if (id !== gameId.current) return;
    const fb = reviewMove(ply, move, before, after);
    setFeedback(fb);
    if (rated.current) onProfile((p) => recordInsights(p, fb.items));
  }

  async function showHint() {
    const a = analyzerRef.current;
    if (!a) return;
    const level = hint?.level === 1 ? 2 : 1;
    const fen = chess.fen();
    const ev = await a.evaluate(fen);
    if (fen === chess.fen()) setHint({ level, ...makeHint(fen, ev.best, level) });
  }

  async function openReview() {
    const a = analyzerRef.current;
    if (!a) return;
    setReview(null);
    setReviewOpen(true);
    const result = await reviewGame(chess.history({ verbose: true }), a.evaluate, (d, n) => setReviewProgress([d, n]));
    setReview(result);
  }

  function loadPgn(text: string): boolean {
    try {
      const c = new Chess();
      c.loadPgn(text);
      if (c.history().length === 0) return false;
      gameId.current++;
      rated.current = false;
      chessRef.current = c;
      goal.current = null;
      setClock(null);
      setFlagged(null);
      setStartFen(false);
      engineRef.current?.newGame();
      setThinking(false);
      setFeedback(null);
      setHuman(c.turn());
      bump();
      void openReview();
      return true;
    } catch {
      return false;
    }
  }

  function newGame(color: 'w' | 'b' = human) {
    gameId.current++;
    rated.current = true;
    chessRef.current = new Chess();
    goal.current = null;
    lastLen.current = 0;
    setClock(null);
    setFlagged(null);
    setLevelOverride(null);
    setStartFen(false);
    engineRef.current?.newGame();
    setFeedback(null);
    setThinking(false);
    setHuman(color);
    bump();
  }

  function undo() {
    gameId.current++;
    undoToHuman(chess, human);
    setFeedback(null);
    setThinking(false);
    bump();
  }

  let message: string;
  if (status.kind === 'checkmate') message = status.winner === human ? t('checkmateWin') : t('checkmateLoss');
  else if (status.kind === 'draw') message = t(status.reason === 'stalemate' ? 'stalemate' : status.reason === 'insufficient' ? 'insufficient' : status.reason === 'repetition' ? 'repetition' : 'fifty');
  else if (flagged) message = t('timeout', { side: t(flagged === 'w' ? 'white' : 'black') });
  else if (engineError) message = t('engineError');
  else if (thinking) message = t('thinking');
  else message = status.check ? `${t('check')} ${t('yourTurn')}` : t('yourTurn');

  const openingDb = useOpeningDb();
  const opening = startFen ? null : openingDb?.identify(chess.history());
  const rows = toMoveRows(chess.history());
  const canUndo = chess.history().length > 0 && !thinking;

  return (
    <div>
      <main>
        <section className="play">
          <div className={`status ${over ? 'over' : ''}`}>{message}</div>
          {opening && <div className="muted small">{t('openingLabel')}: {opening.eco} · {opening.name}</div>}
          {feedback && (
            <div className={`feedback cls-${feedback.cls}`}>
              <span className={`badge cls-${feedback.cls}`}>{t(`cls_${feedback.cls}` as MessageKey)}</span> <b>{feedback.san}</b>
              <div>{renderItems(t, feedback.items, detail).join(' ')}</div>
            </div>
          )}
          {clock && (
            <div className="row between clocks">
              <span className={chess.turn() !== human && !over ? 'tick' : ''}>{t(human === 'w' ? 'black' : 'white')} {formatClock(clock[human === 'w' ? 'b' : 'w'])}</span>
              <span className={chess.turn() === human && !over ? 'tick' : ''}>{t('you')} {formatClock(clock[human])}</span>
            </div>
          )}
          <Board chess={chess} version={version} orientation={human} disabled={over || thinking || chess.turn() !== human} hint={hint} onMove={onMove} />
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
              <select value={profile.prefs.level} onChange={(e) => setPref({ level: e.target.value === 'auto' ? 'auto' : Number(e.target.value) })}>
                <option value="auto">{t('auto')} (~{elo})</option>
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
          <div className="panel controls">
            <label>
              {t('explainLevel')}
              <select value={profile.prefs.detail} onChange={(e) => setPref({ detail: e.target.value as Profile['prefs']['detail'] })}>
                <option value="auto">{t('auto')}</option>
                <option value="beginner">{t('beginner')}</option>
                <option value="intermediate">{t('intermediate')}</option>
              </select>
            </label>
            <div className="row">
              <button onClick={showHint} disabled={over || thinking || chess.turn() !== human}>
                💡 {t('hintBtn')}
              </button>
              <button onClick={openReview} disabled={rows.length === 0}>
                📊 {t('review')}
              </button>
              <button onClick={() => setPgnOpen(true)}>{t('pgn')}</button>
            </div>
            {hint && <div className="hint">{renderItems(t, hint.items, 'intermediate').join(' ')}</div>}
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
      {reviewOpen && <ReviewPanel review={review} progress={reviewProgress} human={human} detail={detail} showOpening={!startFen} onClose={() => setReviewOpen(false)} />}
      {pgnOpen && <PgnDialog initial={chess.pgn()} onLoad={loadPgn} onClose={() => setPgnOpen(false)} />}
    </div>
  );
}
