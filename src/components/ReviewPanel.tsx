import { countByClass, isCritical, type GameReview } from '../analysis/review';
import { renderItems } from '../analysis/render';
import type { Detail } from '../analysis/explain';
import { useI18n } from '../i18n';
import { useOpeningDb } from '../openings/useOpenings';
import type { MessageKey } from '../i18n/messages';

const CLS_ORDER = ['brilliant', 'best', 'good', 'inaccuracy', 'mistake', 'blunder'] as const;

function Graph({ review }: { review: GameReview }) {
  const pts = [review.startCp, ...review.moves.map((m) => m.cpWhite)].map((v) => Math.max(-800, Math.min(800, v)));
  const w = 300;
  const h = 80;
  const x = (i: number) => (pts.length < 2 ? 0 : (i / (pts.length - 1)) * w);
  const y = (v: number) => h / 2 - (v / 800) * (h / 2);
  const line = pts.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="graph" role="img">
      <line x1="0" x2={w} y1={h / 2} y2={h / 2} className="axis" />
      <polygon points={`0,${h / 2} ${line} ${w},${h / 2}`} className="area" />
      <polyline points={line} className="curve" />
      {review.moves.filter(isCritical).map((m) => (
        <circle key={m.ply} cx={x(m.ply + 1)} cy={y(pts[m.ply + 1])} r="3" className={`dot-${m.cls}`} />
      ))}
    </svg>
  );
}

interface Props {
  review: GameReview | null;
  progress: [number, number] | null;
  human: 'w' | 'b';
  detail: Detail;
  onClose: () => void;
}

export function ReviewPanel({ review, progress, human, detail, onClose }: Props) {
  const { t } = useI18n();
  const critical = review?.moves.filter(isCritical) ?? [];
  const db = useOpeningDb();
  const sans = review?.moves.map((m) => m.san) ?? [];
  const opening = db?.identify(sans);
  const book = db ? db.bookDepth(sans) : 0;
  return (
    <div className="modal fixed" onClick={onClose}>
      <div className="card review" onClick={(e) => e.stopPropagation()}>
        <div className="row between">
          <h2>{t('reviewTitle')}</h2>
          <button onClick={onClose}>{t('close')}</button>
        </div>
        {!review && <p className="muted">{t('analyzing')} {progress ? `${progress[0]}/${progress[1]}` : ''}</p>}
        {review && (
          <>
            {opening && (
              <p><b>{t('openingLabel')}:</b> {opening.eco} · {opening.name}
                {book < sans.length && <span className="muted"> — {t('leftBook', { n: Math.floor(book / 2) + 1 })}</span>}
              </p>
            )}
            <p className="muted small">{t('evalGraph')}</p>
            <Graph review={review} />
            <h3>{t('accuracy')}</h3>
            <table className="summary">
              <thead>
                <tr><th />{CLS_ORDER.map((c) => <th key={c} className={`cls-${c}`}>{t(`cls_${c}` as MessageKey)}</th>)}</tr>
              </thead>
              <tbody>
                {(['w', 'b'] as const).map((color) => (
                  <tr key={color}>
                    <th>{color === human ? t('you') : t('opponent')} ({t(color === 'w' ? 'white' : 'black')})</th>
                    {CLS_ORDER.map((c) => <td key={c}>{countByClass(review.moves, color)[c]}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
            <h3>{t('critical')}</h3>
            {critical.length === 0 && <p className="muted">{t('noCritical')}</p>}
            <ul className="critical">
              {critical.map((m) => (
                <li key={m.ply}>
                  <b>{Math.floor(m.ply / 2) + 1}{m.color === 'w' ? '.' : '...'} {m.san}</b>{' '}
                  <span className={`badge cls-${m.cls}`}>{t(`cls_${m.cls}` as MessageKey)}</span>
                  <div className="muted">{renderItems(t, m.items, detail).join(' ')}</div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
