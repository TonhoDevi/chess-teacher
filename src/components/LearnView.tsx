import { useState } from 'react';
import { bandOf, curriculumFor, lessonProgress, nextExercises, type Lesson } from '../learn/curriculum';
import { EXERCISES, exerciseById, type Exercise, type Theme } from '../learn/exercises';
import { recordExercise, weakThemes, weaknessRates, type Profile } from '../profile/model';
import { useI18n } from '../i18n';
import type { MessageKey } from '../i18n/messages';
import { suggestedStudies } from '../openings/studies';
import { ExerciseSession, type Result } from './ExerciseSession';

interface Props {
  profile: Profile;
  onProfile: (fn: (p: Profile) => Profile) => void;
  onPlay: () => void;
  onOpenings: () => void;
  onChallenges: () => void;
}

export function LearnView({ profile, onProfile, onPlay, onOpenings, onChallenges }: Props) {
  const { t } = useI18n();
  const [session, setSession] = useState<{ title: string; list: Exercise[] } | null>(null);
  const [summary, setSummary] = useState<Result[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  if (session)
    return (
      <ExerciseSession
        title={session.title}
        getNext={(done) => session.list[done.length] ?? null}
        onResult={(ex, ok) => onProfile((p) => recordExercise(p, ex, ok))}
        onFinish={(done) => {
          setSession(null);
          setSummary(done);
        }}
      />
    );

  const weak = weakThemes(profile);
  const rates = weaknessRates(profile);
  const lessons = curriculumFor(profile.elo, weak);
  const start = (title: string, list: Exercise[]) => {
    setSummary(null);
    setSession({ title, list });
  };
  const lessonTitle = (l: Lesson) => t(`les_${l.id}_t` as MessageKey);

  return (
    <div className="learn">
      <div className="panel">
        <h2>{profile.name} · {t('yourLevel')}: {profile.elo}</h2>
        <p className="muted">{t(`band_${bandOf(profile.elo)}` as MessageKey)}</p>
        {summary && <p className="status over">{t('exScore', { ok: summary.filter((r) => r.ok).length, total: summary.length })}</p>}
        <button className="primary" onClick={() => start(t('recommended'), nextExercises(profile.elo, profile.exercises, rates, 5))}>
          ▶ {t('recommended')}
        </button>
      </div>

      <div className="panel">
        <h2>{t('suggestOpenings')}</h2>
        <p>{suggestedStudies(profile.elo, Object.keys(profile.repertoire ?? {})).map((s) => t(`op_${s.id}_n` as MessageKey)).join(' · ')}</p>
        <button onClick={onOpenings}>{t('seeOpenings')}</button>
      </div>

      <div className="panel">
        <h2>{t('weaknesses')}</h2>
        {weak.length === 0 && <p className="muted">{t('noWeaknesses')}</p>}
        {weak.map((th: Theme) => (
          <div className="row between item" key={th}>
            <span>{t(`th_${th}` as MessageKey)} ({Math.round(rates[th] * 100)}%)</span>
            <button onClick={() => (EXERCISES.some((e) => e.theme === th) ? start(t(`th_${th}` as MessageKey), nextExercises(profile.elo, profile.exercises, rates, 4, th)) : onChallenges())}>{t('train')}</button>
          </div>
        ))}
      </div>

      <div className="panel">
        <h2>{t('lessons')}</h2>
        {lessons.map((l) => {
          const pct = Math.round(lessonProgress(l, profile.exercises) * 100);
          return (
            <div className="lesson" key={l.id}>
              <button className="link" onClick={() => setOpen(open === l.id ? null : l.id)}>
                {lessonTitle(l)} {l.band !== bandOf(profile.elo) && <span className="badge">{t('reinforce')}</span>}
              </button>
              {l.exercises.length > 0 && <div className="bar"><div style={{ width: `${pct}%` }} /></div>}
              {open === l.id && (
                <div>
                  <p>{t(`les_${l.id}_b` as MessageKey)}</p>
                  {l.exercises.length > 0 ? (
                    <button onClick={() => start(lessonTitle(l), l.exercises.map(exerciseById))}>{t('train')}</button>
                  ) : (
                    <button onClick={onPlay}>{t('playGame')}</button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="panel">
        <h2>{t('recentGames')}</h2>
        {profile.history.length === 0 && <p className="muted">{t('noGames')}</p>}
        {profile.history.slice(-5).reverse().map((g) => (
          <div className="row between item" key={g.date}>
            <span>{t(g.result)} · ~{g.oppElo}</span>
            <span className="muted">{g.eloBefore} → {g.eloAfter}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
