import { useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import type { Study } from '../openings/studies';
import { useI18n } from '../i18n';
import type { MessageKey } from '../i18n/messages';
import { Board } from './Board';

interface Props {
  study: Study;
  onResult: (ok: boolean) => void;
  onClose: () => void;
}

/** The user plays their side of the line from memory; the app answers for the opponent and corrects mistakes. */
export function OpeningTrainer({ study, onResult, onClose }: Props) {
  const { t } = useI18n();
  const chess = useMemo(() => new Chess(), [study]);
  const [ply, setPly] = useState(0);
  const [wrong, setWrong] = useState<string | null>(null);
  const failed = useRef(false);
  const reported = useRef(false);
  const done = ply >= study.moves.length;

  useEffect(() => {
    if (done) {
      if (!reported.current) {
        reported.current = true;
        onResult(!failed.current);
      }
      return;
    }
    if (chess.turn() === study.side) return;
    const id = setTimeout(() => {
      chess.move(study.moves[ply]);
      setPly(ply + 1);
    }, 450);
    return () => clearTimeout(id);
  }, [ply, done, chess, study, onResult]);

  function onMove(from: string, to: string, promotion?: string) {
    const probe = new Chess(chess.fen());
    const m = probe.move({ from, to, promotion });
    if (m.san !== study.moves[ply]) {
      failed.current = true;
      setWrong(study.moves[ply]);
      return;
    }
    setWrong(null);
    chess.move(m.san);
    setPly(ply + 1);
  }

  return (
    <section className="play">
      <div className="status">{t(`op_${study.id}_n` as MessageKey)} · {t('trainLine')}</div>
      <div className={`status ${done ? 'over' : ''}`}>
        {done ? (failed.current ? t('lineDoneMiss') : t('lineDoneOk')) : wrong ? t('lineWrong', { move: wrong }) : t('lineYourMove')}
      </div>
      <Board chess={chess} version={ply} orientation={study.side} disabled={done || chess.turn() !== study.side} onMove={onMove} />
      <div className="row actions">
        <button onClick={onClose}>{t('close')}</button>
      </div>
    </section>
  );
}
