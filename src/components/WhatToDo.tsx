import { useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import { Analyzer } from '../analysis/analyzer';
import { hint } from '../analysis/explain';
import { renderItems } from '../analysis/render';
import { isValidFen } from '../challenges/custom';
import { EXERCISES } from '../learn/exercises';
import type { Detail } from '../analysis/explain';
import { useI18n } from '../i18n';
import { Board } from './Board';

const EXAMPLES = ['f1', 'h3', 'm3'].map((id) => EXERCISES.find((e) => e.id === id)!.fen);

interface Props {
  detail: Detail;
  onClose: () => void;
}

/** "What should I do here?": best move of the engine plus a rule-based explanation. */
export function WhatToDo({ detail, onClose }: Props) {
  const { t } = useI18n();
  const analyzer = useRef<Analyzer | null>(null);
  const [text, setText] = useState(EXAMPLES[0]);
  const [result, setResult] = useState<{ fen: string; from: string; to: string; lines: string[]; cp: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const valid = isValidFen(text);

  useEffect(() => () => analyzer.current?.terminate(), []);
  const board = useMemo(() => new Chess(result?.fen ?? (valid ? text.trim() : undefined)), [result, text, valid]);

  async function analyze() {
    const fen = text.trim();
    if (!valid || new Chess(fen).isGameOver()) return;
    analyzer.current ??= new Analyzer();
    setBusy(true);
    const ev = await analyzer.current.evaluate(fen);
    const h = hint(fen, ev.best, 2);
    setResult({ fen, from: h.from, to: h.to, lines: renderItems(t, h.items, detail), cp: new Chess(fen).turn() === 'w' ? ev.cp : -ev.cp });
    setBusy(false);
  }

  const evalText = result ? (Math.abs(result.cp) > 9000 ? t('evalMate') : `${result.cp >= 0 ? '+' : ''}${(result.cp / 100).toFixed(1)}`) : '';
  return (
    <div className="panel">
      <div className="row between">
        <h2>{t('whatToDo')}</h2>
        <button onClick={onClose}>{t('close')}</button>
      </div>
      <p className="muted small">{t('whatToDoHelp')}</p>
      <input className="fen" value={text} onChange={(e) => { setText(e.target.value); setResult(null); }} aria-label="FEN" />
      <div className="row wrap actions">
        {EXAMPLES.map((f, i) => <button key={f} onClick={() => { setText(f); setResult(null); }}>{t('example')} {i + 1}</button>)}
        <button className="primary" disabled={!valid || busy} onClick={analyze}>{busy ? t('analyzing') : t('analyze')}</button>
      </div>
      {!valid && <p className="status">{t('invalidFen')}</p>}
      {valid && <div className="board-row"><Board chess={board} version={0} orientation={board.turn()} disabled hint={result} onMove={() => {}} /></div>}
      {result && (
        <div className="hint">
          <b>{t('evalWhite')}: {evalText}</b>
          <div>{result.lines.join(' ')}</div>
        </div>
      )}
    </div>
  );
}
