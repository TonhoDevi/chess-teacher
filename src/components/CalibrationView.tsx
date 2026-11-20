import { useCallback, useEffect, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import { Analyzer } from '../analysis/analyzer';
import { cpLoss } from '../analysis/classify';
import { adaptLevel, CAL_MIN_MOVES, CAL_START_LEVEL, estimateElo, moveAccuracy, type CalMove } from '../calibration';
import { Engine } from '../engine/engine';
import { levelConfig } from '../engine/levels';
import { getStatus, parseUci } from '../game/game';
import { useI18n } from '../i18n';
import { Board } from './Board';

interface Props {
  /** Receives the estimated Elo once the player accepts it. */
  onDone: (elo: number) => void;
  onSkip: () => void;
}

/** One real game against Stockfish whose strength follows the player; the Elo comes from accuracy and blunders. */
export function CalibrationView({ onDone, onSkip }: Props) {
  const { t } = useI18n();
  const chessRef = useRef(new Chess());
  const engineRef = useRef<Engine | null>(null);
  const analyzerRef = useRef<Analyzer | null>(null);
  const levelRef = useRef(CAL_START_LEVEL);
  const gameId = useRef(0);
  const [version, setVersion] = useState(0);
  const [busy, setBusy] = useState(false);
  const [moves, setMoves] = useState<CalMove[]>([]);
  const [finished, setFinished] = useState(false);
  const [error, setError] = useState(false);
  const chess = chessRef.current;
  const status = getStatus(chess);
  const over = status.kind !== 'playing';

  useEffect(() => {
    try {
      engineRef.current = new Engine();
      analyzerRef.current = new Analyzer();
    } catch {
      setError(true);
    }
    return () => {
      engineRef.current?.terminate();
      analyzerRef.current?.terminate();
    };
  }, []);

  const engineMove = useCallback(async (id: number) => {
    const engine = engineRef.current;
    const c = chessRef.current;
    if (!engine || getStatus(c).kind !== 'playing') return;
    const cfg = levelConfig(levelRef.current);
    let move: { from: string; to: string; promotion?: string };
    if (Math.random() < cfg.randomMoveProb) {
      const all = c.moves({ verbose: true });
      const m = all[Math.floor(Math.random() * all.length)];
      move = { from: m.from, to: m.to, promotion: m.promotion };
    } else {
      await engine.setLevel(levelRef.current);
      move = parseUci(await engine.bestMove(c.fen(), cfg.depth));
    }
    if (id !== gameId.current) return;
    c.move(move);
  }, []);

  async function onMove(from: string, to: string, promotion?: string) {
    const a = analyzerRef.current;
    if (!a) return;
    const id = gameId.current;
    const move = chess.move({ from, to, promotion });
    setBusy(true);
    setVersion((v) => v + 1);
    const [before, after] = [await a.evaluate(move.before), await a.evaluate(move.after)];
    if (id !== gameId.current) return;
    const played = -after.cp;
    const loss = cpLoss(before.cp, played);
    levelRef.current = adaptLevel(levelRef.current, loss);
    setMoves((m) => [...m, { loss, accuracy: moveAccuracy(before.cp, played) }]);
    await engineMove(id);
    if (id !== gameId.current) return;
    setBusy(false);
    setVersion((v) => v + 1);
  }

  function restart() {
    gameId.current++;
    chessRef.current = new Chess();
    levelRef.current = CAL_START_LEVEL;
    engineRef.current?.newGame();
    setMoves([]);
    setFinished(false);
    setBusy(false);
    setVersion((v) => v + 1);
  }

  const estimate = estimateElo(moves);
  const canFinish = moves.length >= CAL_MIN_MOVES || (over && !busy);
  const liveAcc = moves.length ? Math.round(moves.reduce((s, m) => s + m.accuracy, 0) / moves.length) : null;

  if (finished)
    return (
      <div className="panel controls setup">
        <h2>{t('calTitle')}</h2>
        {estimate ? (
          <>
            <p className="big">
              ~{estimate.elo} <span className="muted">± {estimate.margin}</span>
            </p>
            <p>{t('calSummary', { acc: estimate.accuracy, acpl: estimate.acpl, blunders: estimate.blunders, moves: estimate.moves })}</p>
            <p className="muted small">{t('calNote')}</p>
            <div className="row">
              <button className="primary" onClick={() => onDone(estimate.elo)}>{t('calUse')}</button>
              <button onClick={restart}>{t('calAgain')}</button>
            </div>
          </>
        ) : (
          <>
            <p>{t('calTooShort')}</p>
            <div className="row">
              <button className="primary" onClick={restart}>{t('calAgain')}</button>
              <button onClick={onSkip}>{t('calSkip')}</button>
            </div>
          </>
        )}
      </div>
    );

  return (
    <section className="play">
      <div className="status">
        {t('calTitle')} · {error ? t('engineError') : busy ? t('thinking') : over ? t('calOver') : t('yourTurn')}
      </div>
      <p className="muted small">{t('calIntro')}</p>
      <div className="row between small muted">
        <span>{t('calMoves', { n: moves.length, min: CAL_MIN_MOVES })}</span>
        {liveAcc !== null && <span>{t('calAccuracy')}: {liveAcc}%</span>}
      </div>
      <div className="bar"><div style={{ width: `${Math.min(100, (moves.length / CAL_MIN_MOVES) * 100)}%` }} /></div>
      <div className="board-row"><Board chess={chess} version={version} orientation="w" disabled={over || busy || error} onMove={onMove} /></div>
      <div className="row actions">
        <button className="primary" disabled={!canFinish} onClick={() => setFinished(true)}>{t('calFinish')}</button>
        <button onClick={onSkip}>{t('calSkip')}</button>
      </div>
    </section>
  );
}
