import { useMemo, useState } from 'react';
import { Chess } from 'chess.js';
import { detailOf, addToRepertoire, dueLines, removeFromRepertoire, reviewLine, type Profile } from '../profile/model';
import { STUDIES, studyById, suggestedStudies, type Study } from '../openings/studies';
import { useOpeningDb } from '../openings/useOpenings';
import { useI18n } from '../i18n';
import type { MessageKey } from '../i18n/messages';
import { Board } from './Board';
import { OpeningTrainer } from './OpeningTrainer';

interface Props {
  profile: Profile;
  onProfile: (fn: (p: Profile) => Profile) => void;
}

export function OpeningsView({ profile, onProfile }: Props) {
  const { t } = useI18n();
  const db = useOpeningDb();
  const chess = useMemo(() => new Chess(), []);
  const [version, setVersion] = useState(0);
  const [study, setStudy] = useState<Study | null>(null);
  const [training, setTraining] = useState<Study | null>(null);

  const bump = () => setVersion((v) => v + 1);
  const sans = chess.history();
  const here = db?.identify(sans) ?? null;
  const next = db?.next(sans) ?? [];
  const rep = profile.repertoire ?? {};
  const inRep = Object.keys(rep);
  const due = dueLines(profile);
  const suggestions = suggestedStudies(profile.elo, inRep);
  const detail = detailOf(profile);

  if (training)
    return (
      <OpeningTrainer
        study={training}
        onResult={(ok) => onProfile((p) => reviewLine(p, training.id, ok))}
        onClose={() => setTraining(null)}
      />
    );

  const play = (san: string) => {
    chess.move(san);
    bump();
  };
  const name = (s: Study) => t(`op_${s.id}_n` as MessageKey);
  const text = (s: Study, k: 'idea' | 'plan' | 'err') => t(`op_${s.id}_${k}` as MessageKey);

  const row = (s: Study) => (
    <div className="row between item" key={s.id}>
      <button className="link" onClick={() => setStudy(s)}>{name(s)} <span className="badge">{t(s.side === 'w' ? 'white' : 'black')}</span></button>
      {rep[s.id] ? (
        <button className={due.includes(s.id) ? 'primary' : ''} onClick={() => setTraining(s)}>{t('trainLine')}{due.includes(s.id) ? ` · ${t('due')}` : ''}</button>
      ) : (
        <button onClick={() => onProfile((p) => addToRepertoire(p, s.id))}>＋ {t('addRepertoire')}</button>
      )}
    </div>
  );

  return (
    <div className="learn">
      <div className="panel">
        <h2>{t('myRepertoire')}</h2>
        {inRep.length === 0 && <p className="muted">{t('emptyRepertoire')}</p>}
        {inRep.map((id) => (
          <div key={id}>
            {row(studyById(id))}
            <div className="muted small">
              {t('lineStats', { ok: rep[id].ok, fail: rep[id].fail })} · {rep[id].due <= Date.now() ? t('due') : new Date(rep[id].due).toLocaleDateString()}
              {' '}<button className="link" onClick={() => onProfile((p) => removeFromRepertoire(p, id))}>{t('remove')}</button>
            </div>
          </div>
        ))}
      </div>

      {suggestions.length > 0 && (
        <div className="panel">
          <h2>{t('suggested')}</h2>
          {suggestions.map(row)}
        </div>
      )}

      {study && (
        <div className="panel">
          <h2>{name(study)}</h2>
          <p><b>{t('opIdea')}:</b> {text(study, 'idea')}</p>
          {detail === 'intermediate' && <p><b>{t('opPlan')}:</b> {text(study, 'plan')}</p>}
          <p><b>{t('opErr')}:</b> {text(study, 'err')}</p>
          <p className="muted">{study.moves.join(' ')}</p>
          <button onClick={() => { chess.reset(); study.moves.forEach((m) => chess.move(m)); bump(); }}>{t('showOnBoard')}</button>
        </div>
      )}

      <div className="panel wide">
        <h2>{t('explorer')}</h2>
        <div className="status">{here ? `${here.eco} · ${here.name}` : db ? t('noOpening') : t('loading')}</div>
        <div className="board-row"><Board chess={chess} version={version} orientation="w" disabled={false} onMove={(f, to, pr) => { chess.move({ from: f, to, promotion: pr }); bump(); }} /></div>
        <div className="row wrap actions">
          <button disabled={sans.length === 0} onClick={() => { chess.undo(); bump(); }}>{t('undo')}</button>
          <button disabled={sans.length === 0} onClick={() => { chess.reset(); bump(); }}>{t('reset')}</button>
          {STUDIES.filter((s) => s.moves.join(' ').startsWith(sans.join(' ')) && sans.length > 0 && sans.length <= s.moves.length).slice(0, 2).map((s) => (
            <button key={s.id} onClick={() => setStudy(s)}>{t('study')}: {name(s)}</button>
          ))}
        </div>
        {next.map((n) => (
          <div className="row between item" key={n.san}>
            <button className="link" onClick={() => play(n.san)}><b>{n.san}</b></button>
            <span className="muted small">{n.name ? `${n.eco} ${n.name}` : `${n.count}×`}</span>
          </div>
        ))}
        <p className="muted small">{t('opSource')}</p>
      </div>
    </div>
  );
}
