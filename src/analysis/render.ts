import type { MessageKey } from '../i18n/messages';
import { applyDetail, type Detail, type ExplainItem } from './explain';

type T = (key: MessageKey, params?: Record<string, string | number>) => string;

/** Renders explanation items as localized sentences, translating piece codes. */
export function renderItems(t: T, items: ExplainItem[], detail: Detail): string[] {
  return applyDetail(items, detail).map((i) => {
    const params = { ...i.params };
    for (const k of ['piece', 'captured']) if (params[k]) params[k] = t(`piece_${params[k]}` as MessageKey);
    return t(i.key, params);
  });
}
