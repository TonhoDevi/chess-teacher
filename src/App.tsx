import { useEffect, useState } from 'react';
import { CalibrationView } from './components/CalibrationView';
import { LearnView } from './components/LearnView';
import { ChallengesView } from './components/ChallengesView';
import { Icon, type IconName } from './components/Icon';
import type { GameSetup } from './challenges/custom';
import { OpeningsView } from './components/OpeningsView';
import { PlayView } from './components/PlayView';
import { ProfileSetup } from './components/ProfileSetup';
import { useI18n } from './i18n';
import type { MessageKey } from './i18n/messages';
import { SUPPORTED, type Locale } from './i18n/locale';
import { bandOf } from './learn/curriculum';
import { useProfiles } from './profile/useProfiles';

type Tab = 'play' | 'learn' | 'openings' | 'challenges' | 'calibrate';
const TABS: { id: Tab; icon: IconName; label: MessageKey; file: string }[] = [
  { id: 'play', icon: 'play', label: 'tabPlay', file: 'partida.pgn' },
  { id: 'learn', icon: 'learn', label: 'tabLearn', file: 'curriculo.md' },
  { id: 'openings', icon: 'book', label: 'tabOpenings', file: 'aberturas.eco' },
  { id: 'challenges', icon: 'target', label: 'tabChallenges', file: 'desafios.fen' },
];

export function App() {
  const { t, locale, setLocale } = useI18n();
  const { profiles, active, add, select, remove, update } = useProfiles();
  const [tab, setTab] = useState<Tab>('play');
  const [open, setOpen] = useState<Tab[]>(['play']);
  const [adding, setAdding] = useState(false);
  const [menu, setMenu] = useState(false);
  const [setup, setSetup] = useState<GameSetup | null>(null);

  const theme = active?.prefs.theme ?? 'auto';
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // Each profile remembers its own language.
  const profileLocale = active?.prefs.locale;
  useEffect(() => {
    if (profileLocale) setLocale(profileLocale);
  }, [active?.id, profileLocale, setLocale]);

  const go = (id: Tab) => {
    setTab(id);
    setOpen((o) => (o.includes(id) ? o : [...o, id]));
  };
  const close = (id: Tab) => {
    const rest = open.filter((x) => x !== id);
    if (rest.length === 0) return;
    setOpen(rest);
    if (tab === id) setTab(rest[rest.length - 1]);
  };

  if (!active || adding)
    return (
      <div className="ide">
        <div className="titlebar"><span className="brand">♞ {t('title')}</span></div>
        <div className="content setup-wrap">
          <ProfileSetup onCreate={(p) => { add(p); setAdding(false); go('play'); }} onCancel={active ? () => setAdding(false) : undefined} />
        </div>
      </div>
    );

  const calibrated = (elo: number) => {
    update((p) => {
      const w = p.history.length < 3 ? 1 : 0.5;
      return { ...p, elo: Math.round(w * elo + (1 - w) * p.elo) };
    });
    go('learn');
  };
  const tabs = TABS.filter((x) => open.includes(x.id));

  return (
    <div className="ide">
      <header className="titlebar">
        <span className="brand">♞ {t('title')}</span>
        <span className="crumb">{active.name} <span className="muted">/ {t(TABS.find((x) => x.id === tab)?.label ?? 'tabLearn')}</span></span>
        <div className="spacer" />
        <select aria-label={t('profile')} value={active.id} onChange={(e) => select(e.target.value)}>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>{p.name} · {p.elo}</option>
          ))}
        </select>
        <button className="icon-btn" title={t('settings')} aria-expanded={menu} onClick={() => setMenu(!menu)}><Icon name="settings" /></button>
        {menu && (
          <div className="popover panel controls">
            <label>
              {t('language')}
              <select value={locale} onChange={(e) => { setLocale(e.target.value as Locale); update((p) => ({ ...p, prefs: { ...p.prefs, locale: e.target.value as Locale } })); }}>
                {SUPPORTED.map((l) => <option key={l}>{l}</option>)}
              </select>
            </label>
            <label>
              {t('theme')}
              <select value={theme} onChange={(e) => update((p) => ({ ...p, prefs: { ...p.prefs, theme: e.target.value as typeof theme } }))}>
                <option value="auto">{t('auto')}</option>
                <option value="light">{t('themeLight')}</option>
                <option value="dark">{t('themeDark')}</option>
              </select>
            </label>
            <div className="row">
              <button onClick={() => { setMenu(false); setAdding(true); }}><Icon name="plus" size={15} /> {t('newProfile')}</button>
              <button onClick={() => window.confirm(t('confirmDelete')) && remove(active.id)}><Icon name="trash" size={15} /> {t('deleteProfile')}</button>
            </div>
          </div>
        )}
      </header>

      <div className="workspace">
        <nav className="toolstrip" aria-label="navigation">
          {TABS.map((x) => (
            <button key={x.id} className={tab === x.id ? 'active' : ''} onClick={() => go(x.id)} title={t(x.label)}>
              <Icon name={x.icon} size={20} />
              <span>{t(x.label)}</span>
            </button>
          ))}
        </nav>

        <div className="editor-area">
          <div className="editor-tabs" role="tablist">
            {tabs.map((x) => (
              <div key={x.id} role="tab" aria-selected={tab === x.id} className={`etab ${tab === x.id ? 'active' : ''}`}>
                <button className="etab-label" onClick={() => setTab(x.id)}><Icon name={x.icon} size={14} /> {x.file}</button>
                {tabs.length > 1 && <button className="etab-close" aria-label={t('close')} onClick={() => close(x.id)}><Icon name="close" size={12} /></button>}
              </div>
            ))}
          </div>
          <div className="content">
            <div hidden={tab !== 'play'}>
              <PlayView key={active.id} profile={active} onProfile={update} setup={setup} />
            </div>
            <div hidden={tab !== 'learn'}>
              <LearnView key={active.id} profile={active} onProfile={update} onPlay={() => go('play')} onOpenings={() => go('openings')} onChallenges={() => go('challenges')} onCalibrate={() => setTab('calibrate')} />
            </div>
            <div hidden={tab !== 'challenges'}>
              <ChallengesView key={active.id} profile={active} onProfile={update} onLaunch={(s) => { setSetup({ ...s, nonce: Date.now() }); go('play'); }} />
            </div>
            <div hidden={tab !== 'openings'}>
              <OpeningsView key={active.id} profile={active} onProfile={update} />
            </div>
            {tab === 'calibrate' && (
              <div className="setup-wrap">
                <CalibrationView key={active.id} onDone={calibrated} onSkip={() => go('learn')} />
              </div>
            )}
          </div>
        </div>
      </div>

      <footer className="statusbar">
        <span>{active.name}</span>
        <span>Elo {active.elo}</span>
        <span className="hide-sm">{t(`band_${bandOf(active.elo)}` as MessageKey)}</span>
        <div className="spacer" />
        <span className="hide-sm">Stockfish 19 · {t('offline')}</span>
        <span>{locale}</span>
        <span>{theme === 'light' ? 'IntelliJ Light' : theme === 'dark' ? 'Darcula' : t('auto')}</span>
      </footer>
    </div>
  );
}
