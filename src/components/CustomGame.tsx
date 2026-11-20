import { useState } from 'react';
import { Chess } from 'chess.js';
import { handicapFen, isValidFen, type GameSetup, type Handicap } from '../challenges/custom';
import { LEVELS } from '../engine/levels';
import { useI18n } from '../i18n';
import type { MessageKey } from '../i18n/messages';

const GLYPH: Record<string, string> = { K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙', k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
const PALETTE = ['K', 'Q', 'R', 'B', 'N', 'P', 'k', 'q', 'r', 'b', 'n', 'p', ''];

const parse = (fen: string): string[][] =>
  fen.split(' ')[0].split('/').map((row) => [...row].flatMap((ch) => (/\d/.test(ch) ? Array<string>(Number(ch)).fill('') : [ch])));
const stringify = (grid: string[][], turn: 'w' | 'b') =>
  grid.map((row) => row.reduce((acc, ch) => (ch ? acc + ch : /\d$/.test(acc) ? acc.slice(0, -1) + (Number(acc.slice(-1)) + 1) : acc + '1'), '')).join('/') + ` ${turn} - - 0 1`;

interface Props {
  onStart: (setup: Omit<GameSetup, 'nonce'>) => void;
}

export function CustomGame({ onStart }: Props) {
  const { t } = useI18n();
  const [grid, setGrid] = useState(() => parse(new Chess().fen()));
  const [turn, setTurn] = useState<'w' | 'b'>('w');
  const [brush, setBrush] = useState('Q');
  const [fenText, setFenText] = useState('');
  const [handicap, setHandicap] = useState<[Handicap, Handicap]>(['', '']);
  const [color, setColor] = useState<'w' | 'b'>('w');
  const [level, setLevel] = useState<'auto' | number>('auto');
  const [base, setBase] = useState(0);
  const [inc, setInc] = useState(0);
  const [editing, setEditing] = useState(false);

  const fen = editing ? stringify(grid, turn) : handicap[0] || handicap[1] ? handicapFen(handicap[0], handicap[1]) : 'startpos';
  const valid = fen === 'startpos' || isValidFen(fen);
  const edit = (r: number, f: number) => {
    setEditing(true);
    setGrid(grid.map((row, i) => row.map((ch, j) => (i === r && j === f ? brush : ch))));
  };
  const loadFen = () => {
    if (!isValidFen(fenText)) return;
    setGrid(parse(fenText.trim()));
    setTurn(fenText.trim().split(' ')[1] === 'b' ? 'b' : 'w');
    setEditing(true);
  };
  const handicapSelect = (side: 0 | 1) => (
    <label>
      {t(side === 0 ? 'handicapW' : 'handicapB')}
      <select value={handicap[side]} onChange={(e) => { setEditing(false); setHandicap(side === 0 ? [e.target.value as Handicap, handicap[1]] : [handicap[0], e.target.value as Handicap]); }}>
        <option value="">—</option>
        {(['q', 'r', 'b', 'n'] as const).map((k) => <option key={k} value={k}>{t(`no_${k}` as MessageKey)}</option>)}
      </select>
    </label>
  );

  return (
    <div className="panel controls">
      <h2>{t('customGame')}</h2>
      <div className="editor" role="grid">
        {grid.map((row, r) => row.map((ch, f) => (
          <button key={`${r}${f}`} className={`sq ${(r + f) % 2 ? 'dark' : 'light'}`} onClick={() => edit(r, f)} aria-label={`${r}${f}`}>
            {ch && <span className={`piece ${ch === ch.toUpperCase() ? 'w' : 'b'}`}>{GLYPH[ch]}</span>}
          </button>
        )))}
      </div>
      <div className="row wrap palette">
        {PALETTE.map((p) => <button key={p || 'x'} className={brush === p ? 'primary' : ''} onClick={() => setBrush(p)}>{p ? GLYPH[p] : '✕'}</button>)}
        <button onClick={() => { setGrid(parse(new Chess().fen())); setEditing(true); }}>{t('startPos')}</button>
        <button onClick={() => { setGrid(Array.from({ length: 8 }, () => Array<string>(8).fill(''))); setEditing(true); }}>{t('clearBoard')}</button>
      </div>
      <div className="row wrap">
        <input className="fen" placeholder="FEN" value={fenText} onChange={(e) => setFenText(e.target.value)} />
        <button onClick={loadFen} disabled={!isValidFen(fenText)}>{t('loadFen')}</button>
      </div>
      <label>{t('sideToMove')}<select value={turn} onChange={(e) => { setEditing(true); setTurn(e.target.value as 'w' | 'b'); }}><option value="w">{t('white')}</option><option value="b">{t('black')}</option></select></label>
      {handicapSelect(0)}
      {handicapSelect(1)}
      <label>{t('yourColor')}<select value={color} onChange={(e) => setColor(e.target.value as 'w' | 'b')}><option value="w">{t('white')}</option><option value="b">{t('black')}</option></select></label>
      <label>{t('level')}<select value={level} onChange={(e) => setLevel(e.target.value === 'auto' ? 'auto' : Number(e.target.value))}><option value="auto">{t('auto')}</option>{LEVELS.map((l) => <option key={l} value={l}>~{l}</option>)}</select></label>
      <label>{t('clockBase')}<select value={base} onChange={(e) => setBase(Number(e.target.value))}>{[0, 1, 3, 5, 10, 15].map((m) => <option key={m} value={m}>{m ? `${m} min` : t('noClock')}</option>)}</select></label>
      {base > 0 && <label>{t('clockInc')}<select value={inc} onChange={(e) => setInc(Number(e.target.value))}>{[0, 2, 5, 10].map((s) => <option key={s} value={s}>+{s}s</option>)}</select></label>}
      {!valid && <p className="status">{t('invalidFen')}</p>}
      <button className="primary" disabled={!valid} onClick={() => onStart({ fen: fen === 'startpos' ? undefined : fen, color, level: level === 'auto' ? undefined : level, clock: base ? { base: base * 60, inc } : undefined })}>
        {t('startGame')}
      </button>
    </div>
  );
}
