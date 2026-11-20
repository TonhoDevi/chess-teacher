import { createContext, createElement, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { detectLocale, type Locale } from './locale';
import { messages, type MessageKey } from './messages';

type T = (key: MessageKey) => string;
const Ctx = createContext<{ locale: Locale; setLocale: (l: Locale) => void; t: T } | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(
    () => (localStorage.getItem('locale') as Locale | null) ?? detectLocale(navigator.languages ?? [navigator.language]),
  );
  const setLocale = useCallback((l: Locale) => {
    localStorage.setItem('locale', l);
    setLocaleState(l);
  }, []);
  const value = useMemo(() => ({ locale, setLocale, t: ((k) => messages[locale][k]) as T }), [locale, setLocale]);
  return createElement(Ctx.Provider, { value }, children);
}

export function useI18n() {
  const v = useContext(Ctx);
  if (!v) throw new Error('I18nProvider missing');
  return v;
}
