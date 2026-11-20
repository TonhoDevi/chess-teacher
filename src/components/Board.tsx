import { useState } from 'react';
import type { Chess, Square } from 'chess.js';
import { useI18n } from '../i18n';

const GLYPH: Record<string, string> = {
  wk: '♔', wq: '♕', wr: '♖', wb: '♗', wn: '♘', wp: '♙',
  bk: '♚', bq: '♛', br: '♜', bb: '♝', bn: '♞', bp: '♟',
};
const FILES = 'abcdefgh';

interface Props {
  chess: Chess;
  /** bumps whenever the position changes so the board re-renders */
  version: number;
  orientation: 'w' | 'b';
  disabled: boolean;
  hint?: { from: string; to: string } | null;
  onMove: (from: string, to: string, promotion?: string) => void;
}

export function Board({ chess, orientation, disabled, hint, onMove }: Props) {
  const { t } = useI18n();
  const [selected, setSelected] = useState<Square | null>(null);
  const [pending, setPending] = useState<{ from: string; to: string } | null>(null);

  const board = chess.board();
  const last = chess.history({ verbose: true }).at(-1);
  const targets = selected ? chess.moves({ square: selected, verbose: true }) : [];
  const kingInCheck = chess.inCheck() ? chess.turn() : null;

  const ranks = orientation === 'w' ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];
  const files = orientation === 'w' ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];

  function click(sq: Square) {
    if (disabled) return;
    const move = targets.find((m) => m.to === sq);
    if (move) {
      setSelected(null);
      if (move.promotion) setPending({ from: move.from, to: move.to });
      else onMove(move.from, move.to);
      return;
    }
    const piece = chess.get(sq);
    setSelected(piece && piece.color === chess.turn() ? sq : null);
  }

  return (
    <div className="board-wrap">
      <div className="board" role="grid">
        {ranks.map((r) =>
          files.map((f) => {
            const sq = (FILES[f] + (8 - r)) as Square;
            const p = board[r][f];
            const dark = (r + f) % 2 === 1;
            const isTarget = targets.some((m) => m.to === sq);
            const cls = [
              'sq',
              dark ? 'dark' : 'light',
              selected === sq && 'selected',
              last && (last.from === sq || last.to === sq) && 'last',
              hint && (hint.from === sq || hint.to === sq) && 'hint',
              p && p.type === 'k' && p.color === kingInCheck && 'check',
            ]
              .filter(Boolean)
              .join(' ');
            return (
              <button key={sq} className={cls} onClick={() => click(sq)} aria-label={sq}>
                {isTarget && <span className={p ? 'ring' : 'dot'} />}
                {p && <span className={`piece ${p.color}`}>{GLYPH[p.color + p.type]}</span>}
              </button>
            );
          }),
        )}
      </div>
      {pending && (
        <div className="modal" onClick={() => setPending(null)}>
          <div className="card" onClick={(e) => e.stopPropagation()}>
            <p>{t('promote')}</p>
            <div className="promo">
              {(['q', 'r', 'b', 'n'] as const).map((k) => (
                <button
                  key={k}
                  title={t(({ q: 'queen', r: 'rook', b: 'bishop', n: 'knight' } as const)[k])}
                  onClick={() => {
                    onMove(pending.from, pending.to, k);
                    setPending(null);
                  }}
                >
                  <span className={`piece ${chess.turn()}`}>{GLYPH[chess.turn() + k]}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
