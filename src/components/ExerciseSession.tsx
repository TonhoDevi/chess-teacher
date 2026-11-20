import { useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import type { Exercise } from '../learn/exercises';
import { useI18n } from '../i18n';
import { Board } from './Board';

export interface Result {
  ex: Exercise;
  ok: boolean;
}

interface Props {
  title: string;
  /** Returns the next exercise given the results so far, or null to finish. */
  getNext: (done: Result[]) => Exercise | null;
  onResult: (ex: Exercise, ok: boolean) => void;
  onFinish: (done: Result[]) => void;
}

export function ExerciseSession({ title, getNext, onResult, onFinish }: Props) {
  const { t } = useI18n();
  const [done, setDone] = useState<Result[]>([]);
  const [ex, setEx] = useState<Exercise | null>(() => getNext([]));
  const [state, setState] = useState<'solving' | 'wrong' | 'solved' | 'revealed'>('solving');
  const [version, setVersion] = useState(0);
  const failed = useRef(false);
  const chess = useMemo(() => (ex ? new Chess(ex.fen) : new Chess()), [ex]);

  if (!ex) return null;

  function onMove(from: string, to: string, promotion?: string) {
    const uci = from + to + (promotion ?? '');
    const probe = new Chess(chess.fen());
    probe.move({ from, to, promotion });
    // Any checkmate is accepted for mate exercises even if it is not the listed move.
    const correct = ex!.solutions.includes(uci) || (ex!.theme === 'mate1' && probe.isCheckmate());
    if (!correct) {
      if (!failed.current) onResult(ex!, false);
      failed.current = true;
      setState('wrong');
      return;
    }
    chess.move({ from, to, promotion });
    if (!failed.current) onResult(ex!, true);
    setState('solved');
    setVersion((v) => v + 1);
  }

  function reveal() {
    const s = ex!.solutions[0];
    if (!failed.current) onResult(ex!, false);
    failed.current = true;
    chess.move({ from: s.slice(0, 2), to: s.slice(2, 4), promotion: s[4] });
    setState('revealed');
    setVersion((v) => v + 1);
  }

  function next() {
    const results = [...done, { ex: ex!, ok: !failed.current }];
    failed.current = false;
    setDone(results);
    setState('solving');
    const n = getNext(results);
    if (n) setEx(n);
    else onFinish(results);
  }

  const side = new Chess(ex.fen).turn();
  const finished = state === 'solved' || state === 'revealed';
  return (
    <section className="play">
      <div className="status">
        {title} · {t('exProgress', { n: done.length + 1 })}
      </div>
      <div className={`status ${state === 'solved' ? 'over' : ''}`}>
        {state === 'solved' ? t('exCorrect') : state === 'wrong' ? t('exWrong') : state === 'revealed' ? chess.history().at(-1) : t(side === 'w' ? 'exWhite' : 'exBlack')}
      </div>
      <Board chess={chess} version={version} orientation={side} disabled={finished} onMove={onMove} />
      <div className="row actions">
        {!finished && <button onClick={reveal}>{t('exShow')}</button>}
        {finished && (
          <button className="primary" onClick={next}>
            {getNext([...done, { ex, ok: !failed.current }]) ? t('exNext') : t('exFinish')}
          </button>
        )}
      </div>
    </section>
  );
}
