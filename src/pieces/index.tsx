// Piece set "cburnett" by Colin M.L. Burnett (GPLv2+ / BSD / CC BY-SA 3.0), as shipped by Lichess.
const urls = import.meta.glob('./*.svg', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

import type { CSSProperties } from 'react';

/** `key` is color + uppercase type, e.g. "wN" or "bQ". */
export const pieceUrl = (key: string) => urls[`./${key}.svg`];

export function Piece({ color, type, className, style }: { color: 'w' | 'b'; type: string; className?: string; style?: CSSProperties }) {
  return <img className={`piece ${className ?? ''}`} style={style} src={pieceUrl(color + type.toUpperCase())} alt="" draggable={false} />;
}
