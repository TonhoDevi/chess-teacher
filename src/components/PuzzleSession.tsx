import { useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import type { Puzzle } from '../challenges/puzzles';
import { useI18n } from '../i18n';
import type { MessageKey } from '../i18n/messages';
import { Board } from './Board';

interface Props {
  title: string;
  list: Puzzle[];
  onResult: (puzzle: Puzzle, ok: boolean) => void;
  onFinish: (okCount: number) => void;
}

const play = (c: Chess, uci: string) => c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });

export function PuzzleSession({ title, list, onResult, onFinish }: Props) {
  const { t } = useI18n();
  const [n, setN] = useState(0);
  const [okCount, setOkCount] = useState(0);
  const puzzle = list[n];
  const chess = useMemo(() => {
    const c = new Chess(puzzle.fen);
    play(c, puzzle.moves[0]);
    return c;
  }, [puzzle]);
  const [idx, setIdx] = useState(1); // index of the next move the solver must find
  const [version, setVersion] = useState(0);
  const [state, setState] = useState<'solving' | 'wrong' | 'solved' | 'revealed'>('solving');
  const failed = useRef(false);
  const side = useMemo(() => chess.turn(), [chess]);
  const isMate = puzzle.theme.startsWith('mate');

  useEffect(() => {
    setIdx(1);
    setState('solving');
    failed.current = false;
  }, [puzzle]);

  const fail = () => {
    if (!failed.current) onResult(puzzle, false);
    failed.current = true;
  };

  function onMove(from: string, to: string, promotion?: string) {
    const uci = from + to + (promotion ?? '');
    const probe = new Chess(chess.fen());
    probe.move({ from, to, promotion });
    if (uci !== puzzle.moves[idx] && !(isMate && probe.isCheckmate())) {
      fail();
      setState('wrong');
      return;
    }
    chess.move({ from, to, promotion });
    setVersion((v) => v + 1);
    if (idx + 1 >= puzzle.moves.length || chess.isCheckmate()) {
      if (!failed.current) {
        onResult(puzzle, true);
        setOkCount((c) => c + 1);
      }
      setState('solved');
      return;
    }
    setState('solving');
    setTimeout(() => {
      play(chess, puzzle.moves[idx + 1]);
      setIdx(idx + 2);
      setVersion((v) => v + 1);
    }, 400);
  }

  function reveal() {
    fail();
    const m = puzzle.moves[idx];
    setState('revealed');
    chess.move({ from: m.slice(0, 2), to: m.slice(2, 4), promotion: m[4] });
    setVersion((v) => v + 1);
  }

  const finished = state === 'solved' || state === 'revealed';
  const last = n + 1 >= list.length;
  function next() {
    if (last) onFinish(okCount);
    else setN(n + 1);
  }

  return (
    <section className="play">
      <div className="status">{title} · {t('exProgress', { n: n + 1 })} · {t(`th_${puzzle.theme}` as MessageKey)} · ~{puzzle.rating}</div>
      <div className={`status ${state === 'solved' ? 'over' : ''}`}>
        {state === 'solved' ? t('exCorrect') : state === 'wrong' ? t('exWrong') : state === 'revealed' ? chess.history().at(-1) : t(side === 'w' ? 'exWhite' : 'exBlack')}
      </div>
      <Board chess={chess} version={version} orientation={side === 'w' ? 'w' : 'b'} disabled={finished || chess.turn() !== side} onMove={onMove} />
      <div className="row actions">
        {!finished && <button onClick={reveal}>{t('exShow')}</button>}
        {finished && <button className="primary" onClick={next}>{last ? t('exFinish') : t('exNext')}</button>}
      </div>
    </section>
  );
}
