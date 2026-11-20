import { winPct } from '../calibration';

/** Vertical evaluation bar; `cp` is from white's point of view. */
export function EvalBar({ cp, orientation }: { cp: number | null; orientation: 'w' | 'b' }) {
  const pct = cp === null ? 50 : winPct(Math.max(-1500, Math.min(1500, cp)));
  const mate = cp !== null && Math.abs(cp) >= 9000;
  const label = cp === null ? '' : mate ? 'M' : (Math.abs(cp) / 100).toFixed(1);
  const whiteLeads = cp === null || cp >= 0;
  return (
    <div className={`evalbar ${orientation === 'b' ? 'flip' : ''}`} role="img" aria-label={`eval ${cp ?? 0}`}>
      <div className="evalbar-white" style={{ height: `${pct}%` }} />
      <span className={`evalbar-label ${whiteLeads ? 'at-white' : 'at-black'}`}>{label}</span>
    </div>
  );
}
