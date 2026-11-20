import { useEffect, useState } from 'react';
import { LearnView } from './components/LearnView';
import { PlayView } from './components/PlayView';
import { ProfileSetup } from './components/ProfileSetup';
import { useI18n } from './i18n';
import { SUPPORTED, type Locale } from './i18n/locale';
import { useProfiles } from './profile/useProfiles';

export function App() {
  const { t, locale, setLocale } = useI18n();
  const { profiles, active, add, select, remove, update } = useProfiles();
  const [tab, setTab] = useState<'play' | 'learn'>('play');
  const [adding, setAdding] = useState(false);

  const theme = active?.prefs.theme ?? 'auto';
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // Each profile remembers its own language.
  const profileLocale = active?.prefs.locale;
  useEffect(() => {
    if (profileLocale) setLocale(profileLocale);
  }, [active?.id, profileLocale, setLocale]);

  if (!active || adding)
    return (
      <div className="app">
        <ProfileSetup onCreate={(p) => { add(p); setAdding(false); setTab('play'); }} onCancel={active ? () => setAdding(false) : undefined} />
      </div>
    );

  return (
    <div className="app">
      <header>
        <h1>♞ {t('title')}</h1>
        <div className="row wrap">
          <select aria-label={t('profile')} value={active.id} onChange={(e) => select(e.target.value)}>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>{p.name} · {p.elo}</option>
            ))}
          </select>
          <button title={t('newProfile')} onClick={() => setAdding(true)}>＋</button>
          <button title={t('deleteProfile')} onClick={() => window.confirm(t('confirmDelete')) && remove(active.id)}>🗑</button>
          <select aria-label={t('language')} value={locale} onChange={(e) => { setLocale(e.target.value as Locale); update((p) => ({ ...p, prefs: { ...p.prefs, locale: e.target.value as Locale } })); }}>
            {SUPPORTED.map((l) => <option key={l}>{l}</option>)}
          </select>
          <select aria-label={t('theme')} value={theme} onChange={(e) => update((p) => ({ ...p, prefs: { ...p.prefs, theme: e.target.value as typeof theme } }))}>
            <option value="auto">{t('auto')}</option>
            <option value="light">{t('light')}</option>
            <option value="dark">{t('dark')}</option>
          </select>
        </div>
      </header>
      <nav className="tabs">
        <button className={tab === 'play' ? 'primary' : ''} onClick={() => setTab('play')}>{t('tabPlay')}</button>
        <button className={tab === 'learn' ? 'primary' : ''} onClick={() => setTab('learn')}>{t('tabLearn')}</button>
      </nav>
      <div hidden={tab !== 'play'}>
        <PlayView key={active.id} profile={active} onProfile={update} />
      </div>
      <div hidden={tab !== 'learn'}>
        <LearnView key={active.id} profile={active} onProfile={update} onPlay={() => setTab('play')} />
      </div>
    </div>
  );
}
