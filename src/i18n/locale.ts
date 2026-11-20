export type Locale = 'pt-BR' | 'en';

export const SUPPORTED: Locale[] = ['pt-BR', 'en'];

/** Picks the best supported locale for a list of BCP-47 tags (e.g. navigator.languages). Defaults to pt-BR. */
export function detectLocale(langs: readonly string[]): Locale {
  for (const l of langs) {
    const lower = l.toLowerCase();
    if (lower.startsWith('pt')) return 'pt-BR';
    if (lower.startsWith('en')) return 'en';
  }
  return 'pt-BR';
}
