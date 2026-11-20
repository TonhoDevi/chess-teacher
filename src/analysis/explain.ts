import { Chess, type PieceSymbol } from 'chess.js';
import type { MessageKey } from '../i18n/messages';
import { findTactic, hangingPieces, VALUE } from './tactics';
import type { MoveClass } from './classify';

/** Level of detail for explanations; later chosen from the player profile (beginner ~450, intermediate ~950). */
export type Detail = 'beginner' | 'intermediate';

export interface ExplainItem {
  key: MessageKey;
  params?: Record<string, string>;
}

type Idea = { kind: 'mate' | 'capture' | 'fork' | 'pin' | 'skewer'; captured?: PieceSymbol } | null;

function apply(fen: string, uci: string) {
  const c = new Chess(fen);
  const m = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
  return { c, m };
}

/** What a move accomplishes tactically. */
export function describeMove(fen: string, uci: string): Idea {
  const { c, m } = apply(fen, uci);
  if (c.isCheckmate()) return { kind: 'mate' };
  const t = findTactic(c, m.to);
  if (t) return { kind: t };
  if (m.captured && (VALUE[m.captured] >= VALUE[m.piece] || c.attackers(m.to, m.color === 'w' ? 'b' : 'w').length === 0))
    return { kind: 'capture', captured: m.captured };
  return null;
}

const cap = (i: Idea) => ({ captured: i?.captured ?? 'p' });

/** All reasons (most important first) why the played move was good or bad. Use applyDetail() to trim. */
export function explainMove(fenBefore: string, uci: string, bestUci: string, bestSan: string, cls: MoveClass, loss: number): ExplainItem[] {
  const items: ExplainItem[] = [];
  const played = describeMove(fenBefore, uci);

  if (cls === 'brilliant' || cls === 'best' || cls === 'good') {
    if (cls === 'brilliant') items.push({ key: 'x_brilliant' });
    else if (played?.kind === 'mate') items.push({ key: 'x_goodMate' });
    else if (played?.kind === 'capture') items.push({ key: 'x_goodCapture', params: cap(played) });
    else if (played) items.push({ key: ({ fork: 'x_goodFork', pin: 'x_goodPin', skewer: 'x_goodSkewer' } as const)[played.kind] });
    else items.push({ key: cls === 'best' ? 'x_goodBest' : 'x_goodOk' });
    return items;
  }

  const { c: after, m } = apply(fenBefore, uci);
  if (after.moves().some((s) => s.endsWith('#'))) items.push({ key: 'x_allowsMate' });
  const hung = hangingPieces(after, m.color)[0];
  if (hung) items.push({ key: 'x_hangsPiece', params: { piece: hung.type, square: hung.square } });

  if (bestUci && bestUci !== uci) {
    const idea = describeMove(fenBefore, bestUci);
    if (idea) {
      const key = ({ mate: 'x_missedMate', capture: 'x_missedCapture', fork: 'x_missedFork', pin: 'x_missedPin', skewer: 'x_missedSkewer' } as const)[idea.kind];
      items.push({ key, params: cap(idea) });
    }
  }
  if (items.length === 0) items.push({ key: 'x_betterMove' });
  items.push({ key: 'x_bestMove', params: { san: bestSan, loss: (loss / 100).toFixed(1) } });
  return items;
}

/** Beginners get the single most important reason in plain words; intermediates get everything plus the best move. */
export function applyDetail(items: ExplainItem[], detail: Detail): ExplainItem[] {
  if (detail === 'intermediate') return items;
  return items.filter((i) => i.key !== 'x_bestMove').slice(0, 1);
}

/** Hints in two steps: 1 = vague (which piece), 2 = the move and why. */
export function hint(fen: string, bestUci: string, level: 1 | 2): { items: ExplainItem[]; from: string; to: string } {
  const c = new Chess(fen);
  const from = bestUci.slice(0, 2);
  const to = bestUci.slice(2, 4);
  if (level === 1) {
    const items: ExplainItem[] = [{ key: 'x_hintPiece', params: { piece: c.get(from as never)?.type ?? 'p' } }];
    if (hangingPieces(c, c.turn()).length > 0) items.push({ key: 'x_hintThreat' });
    return { items, from, to };
  }
  const idea = describeMove(fen, bestUci);
  const san = apply(fen, bestUci).m.san;
  const items: ExplainItem[] = [{ key: 'x_hintMove', params: { san } }];
  if (idea) {
    const key = ({ mate: 'x_whyMate', capture: 'x_whyCapture', fork: 'x_whyFork', pin: 'x_whyPin', skewer: 'x_whySkewer' } as const)[idea.kind];
    items.push({ key, params: cap(idea) });
  }
  return { items, from, to };
}
