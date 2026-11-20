import { useState, type CSSProperties } from 'react';
import type { Chess, Square } from 'chess.js';
import { useI18n } from '../i18n';
import { Piece } from '../pieces';

const FILES = 'abcdefgh';
const ORDER = [0, 1, 2, 3, 4, 5, 6, 7];

interface Props {
  chess: Chess;
  /** bumps whenever the position changes so the board re-renders */
  version: number;
  orientation: 'w' | 'b';
  disabled: boolean;
  hint?: { from: string; to: string } | null;
  onMove: (from: string, to: string, promotion?: string) => void;
}

const fileOf = (sq: string) => FILES.indexOf(sq[0]);
const rankOf = (sq: string) => Number(sq[1]);

export function Board({ chess, orientation, disabled, hint, onMove }: Props) {
  const { t } = useI18n();
  const [selected, setSelected] = useState<Square | null>(null);
  const [pending, setPending] = useState<{ from: string; to: string } | null>(null);

  const board = chess.board();
  const history = chess.history({ verbose: true });
  const last = history.at(-1);
  const targets = selected ? chess.moves({ square: selected, verbose: true }) : [];
  const kingInCheck = chess.inCheck() ? chess.turn() : null;
  const flip = orientation === 'b';
  const ranks = flip ? [...ORDER].reverse() : ORDER;
  const files = flip ? [...ORDER].reverse() : ORDER;
  const sign = flip ? -1 : 1;
  // Square centre in board units (0..8) for the hint arrow.
  const centre = (sq: string) => ({ x: (flip ? 7 - fileOf(sq) : fileOf(sq)) + 0.5, y: (flip ? rankOf(sq) - 1 : 8 - rankOf(sq)) + 0.5 });

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

  const a = hint ? centre(hint.from) : null;
  const b = hint ? centre(hint.to) : null;

  return (
    <div className="board-wrap">
      <div className="board" role="grid">
        {ranks.map((r, ri) =>
          files.map((f, fi) => {
            const sq = (FILES[f] + (8 - r)) as Square;
            const p = board[r][f];
            const cls = [
              'sq',
              (r + f) % 2 === 1 ? 'dark' : 'light',
              selected === sq && 'selected',
              last && (last.from === sq || last.to === sq) && 'last',
              p && p.type === 'k' && p.color === kingInCheck && 'check',
            ]
              .filter(Boolean)
              .join(' ');
            // The piece that just moved glides in from its origin square.
            const slide: CSSProperties | undefined =
              last && last.to === sq
                ? ({ '--dx': (fileOf(last.from) - fileOf(sq)) * sign, '--dy': (rankOf(sq) - rankOf(last.from)) * sign } as CSSProperties)
                : undefined;
            return (
              <button key={sq} className={cls} onClick={() => click(sq)} aria-label={sq}>
                {fi === 0 && <span className="coord rank">{8 - r}</span>}
                {ri === 7 && <span className="coord file">{FILES[f]}</span>}
                {targets.some((m) => m.to === sq) && <span className={p ? 'ring' : 'dot'} />}
                {p && <Piece key={`${history.length}${sq}`} color={p.color} type={p.type} className={slide ? 'slide' : ''} style={slide} />}
              </button>
            );
          }),
        )}
        {a && b && (
          <svg className="arrows" viewBox="0 0 8 8" aria-hidden="true">
            <defs>
              <marker id="arrowhead" markerWidth="4" markerHeight="4" refX="2.5" refY="2" orient="auto">
                <path d="M0,0 L4,2 L0,4 z" fill="var(--arrow)" />
              </marker>
            </defs>
            <circle cx={a.x} cy={a.y} r="0.45" fill="none" stroke="var(--arrow)" strokeWidth="0.08" opacity="0.8" />
            {hint!.from !== hint!.to && <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--arrow)" strokeWidth="0.2" strokeLinecap="round" markerEnd="url(#arrowhead)" opacity="0.85" />}
          </svg>
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
                  <Piece color={chess.turn()} type={k} />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
