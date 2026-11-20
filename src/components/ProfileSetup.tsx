import { useState } from 'react';
import { createProfile, ELO_MAX, ELO_MIN, type Profile } from '../profile/model';
import { useI18n } from '../i18n';
import { CalibrationView } from './CalibrationView';

interface Props {
  onCreate: (p: Profile) => void;
  onCancel?: () => void;
}

export function ProfileSetup({ onCreate, onCancel }: Props) {
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [elo, setElo] = useState(800);
  const [testing, setTesting] = useState(false);
  const [measured, setMeasured] = useState(false);

  if (testing)
    return (
      <CalibrationView
        onDone={(e) => {
          setElo(e);
          setMeasured(true);
          setTesting(false);
        }}
        onSkip={() => setTesting(false)}
      />
    );

  return (
    <div className="panel controls setup">
      <h2>{t('newProfile')}</h2>
      <p className="muted">{t('welcome')}</p>
      <label>
        {t('nameLabel')}
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={24} />
      </label>
      <label>
        {t('eloLabel')}
        <input type="number" min={ELO_MIN} max={ELO_MAX} step={50} value={elo} onChange={(e) => setElo(Number(e.target.value) || 800)} />
      </label>
      {measured && <p className="muted">{t('measured', { elo })}</p>}
      <button onClick={() => setTesting(true)}>♟ {t('measure')}</button>
      <div className="row">
        <button className="primary" onClick={() => onCreate(createProfile(name, elo))}>{t('create')}</button>
        {onCancel && <button onClick={onCancel}>{t('cancel')}</button>}
      </div>
    </div>
  );
}
