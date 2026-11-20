import { useState } from 'react';
import { useI18n } from '../i18n';

interface Props {
  initial: string;
  onLoad: (pgn: string) => boolean;
  onClose: () => void;
}

export function PgnDialog({ initial, onLoad, onClose }: Props) {
  const { t } = useI18n();
  const [text, setText] = useState(initial);
  const [error, setError] = useState(false);

  function download() {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/x-chess-pgn' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'partida.pgn';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="modal fixed" onClick={onClose}>
      <div className="card review" onClick={(e) => e.stopPropagation()}>
        <div className="row between">
          <h2>{t('pgn')}</h2>
          <button onClick={onClose}>{t('close')}</button>
        </div>
        <textarea value={text} placeholder={t('pgnHelp')} onChange={(e) => { setText(e.target.value); setError(false); }} rows={10} />
        {error && <p className="error">{t('pgnInvalid')}</p>}
        <div className="row">
          <button onClick={download} disabled={!text.trim()}>{t('pgnDownload')}</button>
          <button className="primary" onClick={() => (onLoad(text) ? onClose() : setError(true))} disabled={!text.trim()}>{t('pgnLoad')}</button>
        </div>
      </div>
    </div>
  );
}
