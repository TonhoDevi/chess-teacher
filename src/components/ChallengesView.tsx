import { useState } from 'react';
import { dailyPuzzle, nextPuzzles, PUZZLE_THEMES, todayKey, type Puzzle } from '../challenges/puzzles';
import { ENDGAMES } from '../challenges/endgames';
import type { GameSetup } from '../challenges/custom';
import { detailOf, recordDaily, recordTheme, weaknessRates, type Profile } from '../profile/model';
import { useI18n } from '../i18n';
import type { MessageKey } from '../i18n/messages';
import { CustomGame } from './CustomGame';
import { PuzzleSession } from './PuzzleSession';
import { WhatToDo } from './WhatToDo';

interface Props {
  profile: Profile;
  onProfile: (fn: (p: Profile) => Profile) => void;
  onLaunch: (setup: Omit<GameSetup, 'nonce'>) => void;
}

export function ChallengesView({ profile, onProfile, onLaunch }: Props) {
  const { t } = useI18n();
  const [view, setView] = useState<'menu' | 'what' | 'custom'>('menu');
  const [session, setSession] = useState<{ title: string; list: Puzzle[]; daily?: boolean } | null>(null);
  const [score, setScore] = useState<string | null>(null);
  const today = todayKey();
  const dailyDone = profile.daily?.date === today;

  if (session)
    return (
      <PuzzleSession
        title={session.title}
        list={session.list}
        onResult={(pz, ok) => onProfile((p) => (session.daily ? recordDaily(recordTheme(p, pz.theme, pz.rating, ok, pz.id), today, ok) : recordTheme(p, pz.theme, pz.rating, ok, pz.id)))}
        onFinish={(ok) => {
          setScore(t('exScore', { ok, total: session.list.length }));
          setSession(null);
        }}
      />
    );
  if (view === 'what') return <WhatToDo detail={detailOf(profile)} onClose={() => setView('menu')} />;
  if (view === 'custom') return <div><button onClick={() => setView('menu')}>← {t('close')}</button><CustomGame onStart={(s) => { setView('menu'); onLaunch(s); }} /></div>;

  const rates = weaknessRates(profile);
  const start = (title: string, list: Puzzle[]) => {
    setScore(null);
    setSession({ title, list });
  };
  return (
    <div className="learn">
      <div className="panel">
        <h2>{t('daily')} · 🔥 {profile.daily?.streak ?? 0}</h2>
        {score && <p className="status over">{score}</p>}
        {dailyDone ? (
          <p className="muted">{profile.daily!.ok ? t('dailyOk') : t('dailyMiss')}</p>
        ) : (
          <button className="primary" onClick={() => { setScore(null); setSession({ title: t('daily'), list: [dailyPuzzle(profile.id, profile.elo, today)], daily: true }); }}>▶ {t('dailyStart')}</button>
        )}
      </div>

      <div className="panel">
        <h2>{t('puzzles')}</h2>
        <button className="primary" onClick={() => start(t('recommended'), nextPuzzles(profile.elo, profile.puzzles, rates, 5))}>▶ {t('recommended')}</button>
        <div className="row wrap actions">
          {PUZZLE_THEMES.map((th) => (
            <button key={th} onClick={() => start(t(`th_${th}` as MessageKey), nextPuzzles(profile.elo, profile.puzzles, rates, 5, th))}>{t(`th_${th}` as MessageKey)}</button>
          ))}
        </div>
        <p className="muted small">{t('puzzleSource')}</p>
      </div>

      <div className="panel">
        <h2>{t('endgames')}</h2>
        {ENDGAMES.map((e) => (
          <div className="item" key={e.id}>
            <div className="row between">
              <b>{t(`end_${e.id}_t` as MessageKey)} <span className="badge">{t(e.goal === 'win' ? 'goalWin' : 'goalDraw')}</span></b>
              <button onClick={() => onLaunch({ fen: e.fen, color: e.color, goal: { win: e.goal === 'win', rating: e.rating } })}>{t('startGame')}</button>
            </div>
            <div className="muted small">{t(`end_${e.id}_b` as MessageKey)}</div>
          </div>
        ))}
      </div>

      <div className="panel">
        <div className="row wrap actions">
          <button onClick={() => setView('what')}>🔎 {t('whatToDo')}</button>
          <button onClick={() => setView('custom')}>⚙ {t('customGame')}</button>
        </div>
      </div>
    </div>
  );
}
