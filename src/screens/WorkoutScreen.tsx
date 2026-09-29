import { useLiveQuery } from 'dexie-react-hooks';
import { BookOpen, CalendarDays, ClipboardList, History, Pause, Play, Settings2, Warehouse } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ExerciseDetail, ExerciseLibrarySheet } from '../components/workout/ExerciseLibrary';
import { GymSheet } from '../components/workout/GymSheet';
import { HistorySheet } from '../components/workout/HistorySheet';
import { ProgramBuilderSheet } from '../components/workout/ProgramBuilder';
import { ExerciseCard, RestTimer, SessionSummarySheet, WeekStrip } from '../components/workout/SessionParts';
import { BackgroundGlow, Chip, GlassCard, LargeHeader, ProgressBar, Sheet, useToast } from '../components/ui';
import { db } from '../lib/db';
import { beep, haptic, keepScreenOn, unlockAudio } from '../lib/device';
import { PRESETS } from '../lib/equipment';
import { exerciseById } from '../lib/exercises';
import { capitalize, chrono, fmtMax, isoWeek, todayKey, WEEKDAY_NAMES, weekdayMon0 } from '../lib/format';
import { useActiveGym, useActiveProgram, useNow, useSessions } from '../lib/hooks';
import { MUSCLES } from '../lib/muscles';
import { dayMuscles, estimateMinutes, nextDayIndex, nextSessionDate, weekStrip } from '../lib/program';
import { targetLoadFor } from '../lib/progression';
import type { Exercise, MuscleKey, Profile, ProgressionResult, SessionExercise, WorkoutSession } from '../lib/types';
import { createSession, discardSession, elapsedMs, finishSession, pause, saveExercises, setsProgress, startOrResume } from '../lib/workout';

const HALOS = [
  { size: 380, right: -150, top: 80, color: 'rgba(255,40,60,0.40)' },
  { size: 300, left: -160, top: 600, color: 'rgba(180,20,40,0.30)' },
];

export function WorkoutScreen({ profile }: { profile: Profile }) {
  const toast = useToast();
  const sessions = useSessions();
  const program = useActiveProgram(profile);
  const gym = useActiveGym(profile);
  const dbActive = useMemo(() => (sessions ?? []).find((s) => s.status === 'active'), [sessions]);

  // Séance en cours : état local (saisie instantanée) recopié en base à chaque modification.
  const [active, setActive] = useState<WorkoutSession | undefined>(undefined);
  const activeRef = useRef<WorkoutSession | undefined>(undefined);
  useEffect(() => {
    const prev = activeRef.current;
    const next = dbActive && prev && prev.id === dbActive.id ? { ...dbActive, exercises: prev.exercises } : dbActive;
    activeRef.current = next;
    setActive(next);
  }, [dbActive]);

  function commitExercises(exercises: SessionExercise[]) {
    const cur = activeRef.current;
    if (!cur) return;
    const next = { ...cur, exercises };
    activeRef.current = next;
    setActive(next);
    void saveExercises(cur, exercises);
  }

  const [dayIdx, setDayIdx] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [rest, setRest] = useState<{ endsAt: number; total: number } | null>(null);
  const [summary, setSummary] = useState<{ results: ProgressionResult[]; durationMs: number; sets: number } | null>(null);
  const [sheet, setSheet] = useState<'gym' | 'program' | 'library' | 'history' | null>(null);
  const [swapUid, setSwapUid] = useState<string | null>(null);
  const [info, setInfo] = useState<Exercise | null>(null);

  const running = !!active?.runningSince;
  const now = useNow(rest ? 250 : 1000, running || !!rest);

  const plannedIdx = program ? nextDayIndex(program, sessions ?? []) : 0;
  const currentIdx = active ? active.dayIndex : (dayIdx ?? plannedIdx);
  const day = program?.days[currentIdx];

  // Écran allumé pendant la séance
  useEffect(() => {
    void keepScreenOn(running);
  }, [running]);
  useEffect(() => () => void keepScreenOn(false), []);

  // Fin du repos : bip + vibration
  const restDone = useRef(false);
  useEffect(() => {
    if (!rest) {
      restDone.current = false;
      return;
    }
    if (now >= rest.endsAt && !restDone.current) {
      restDone.current = true;
      beep();
      toast('Repos terminé — série suivante');
      setRest(null);
    }
  }, [now, rest, toast]);

  const states = useLiveQuery(
    async () => (day ? await db.exerciseStates.bulkGet(day.exercises.map((e) => e.exerciseId)) : []),
    [day],
  );

  const previousById = useMemo(() => {
    const map = new Map<string, string>();
    const done = (sessions ?? []).filter((s) => s.status === 'done').sort((a, b) => (b.endedAt ?? 0) - (a.endedAt ?? 0));
    for (const s of done) {
      for (const se of s.exercises) {
        if (map.has(se.exerciseId)) continue;
        const sets = se.sets.filter((x) => x.done);
        if (!sets.length) continue;
        const loads = [...new Set(sets.map((x) => x.load ?? 0))];
        map.set(
          se.exerciseId,
          `${sets.map((x) => x.reps ?? '?').join(' / ')} reps${loads.length === 1 && loads[0] > 0 ? ` à ${fmtMax(loads[0])} kg` : ''}`,
        );
      }
    }
    return map;
  }, [sessions]);

  const strip = weekStrip(program, sessions ?? []);
  const nextDate = program ? nextSessionDate(program, sessions ?? []) : null;
  const plannedToday = program?.weekdays.includes(weekdayMon0(new Date())) ?? false;
  const doneToday = (sessions ?? []).some((s) => s.status === 'done' && s.date === todayKey());

  const kicker = active
    ? running
      ? 'En cours'
      : 'En pause'
    : plannedToday && !doneToday
      ? "Aujourd'hui"
      : nextDate
        ? `Prochaine · ${capitalize(WEEKDAY_NAMES[weekdayMon0(nextDate)])}`
        : 'Séance libre';

  const progress = active ? setsProgress(active) : { done: 0, total: day?.exercises.reduce((a, e) => a + e.sets, 0) ?? 0 };
  const muscles = day ? (dayMuscles(day) as MuscleKey[]).slice(0, 5) : [];

  async function ensureSession(): Promise<WorkoutSession | undefined> {
    if (active) return active;
    if (!program || !day) return undefined;
    unlockAudio();
    const s = await createSession(program, currentIdx, profile);
    await startOrResume(s);
    return (await db.sessions.get(s.id)) ?? s;
  }

  async function onMainButton() {
    unlockAudio();
    haptic();
    if (!active) {
      const s = await ensureSession();
      if (s) setExpanded(s.exercises[0]?.uid ?? null);
      return;
    }
    if (running) await pause(active);
    else await startOrResume(active);
  }

  function updateExercise(next: SessionExercise) {
    const cur = activeRef.current;
    if (!cur) return;
    commitExercises(cur.exercises.map((e) => (e.uid === next.uid ? next : e)));
  }

  async function validateSet(se: SessionExercise, setIdx: number) {
    unlockAudio();
    haptic(15);
    const s = activeRef.current;
    if (!s) return;
    const current = s.exercises.find((e) => e.uid === se.uid) ?? se;
    const sets = current.sets.map((x, i) =>
      i === setIdx
        ? {
            ...x,
            reps: x.reps ?? se.repMin,
            load: x.load ?? se.targetLoad,
            done: true,
            doneAt: Date.now(),
          }
        : x,
    );
    updateExercise({ ...current, sets });
    if (!s.runningSince) await startOrResume(s);
    const isLast = s.exercises.every((e) => (e.uid === se.uid ? sets : e.sets).every((x) => x.done));
    if (!isLast) setRest({ endsAt: Date.now() + se.restSec * 1000, total: se.restSec * 1000 });
    else {
      setRest(null);
      toast('Toutes les séries sont validées. Termine la séance !');
    }
  }

  async function onFinish() {
    const active = activeRef.current;
    if (!active) return;
    const p = setsProgress(active);
    if (p.done === 0) {
      if (window.confirm('Aucune série validée. Abandonner cette séance ?')) {
        await discardSession(active);
        setRest(null);
      }
      return;
    }
    if (p.done < p.total && !window.confirm(`${p.total - p.done} série(s) non validée(s). Terminer quand même ?`)) return;
    const results = await finishSession(active);
    setRest(null);
    setExpanded(null);
    setDayIdx(null);
    setSummary({ results, durationMs: elapsedMs(active), sets: p.done });
  }

  async function onDiscard() {
    if (!active) return;
    if (!window.confirm('Abandonner la séance en cours ? Les séries saisies seront perdues.')) return;
    await discardSession(active);
    setRest(null);
  }

  async function onSwapPicked(ex: Exercise) {
    if (!active || !swapUid) return;
    const state = await db.exerciseStates.get(ex.id);
    const load = targetLoadFor(ex, state, profile);
    const cur = activeRef.current ?? active;
    const next = cur.exercises.map((e) =>
      e.uid === swapUid
        ? { ...e, exerciseId: ex.id, targetLoad: load, sets: e.sets.map(() => ({ reps: null, load, rpe: null, done: false })) }
        : e,
    );
    commitExercises(next);
    setSwapUid(null);
    toast('Exercice remplacé pour cette séance');
  }

  const needsSetup = !program;

  return (
    <>
      <BackgroundGlow halos={HALOS} />
      <div className="screen">
        <div className="screen-content">
          <LargeHeader
            eyebrow={`Semaine ${isoWeek()}`}
            title="Séance"
            right={
              <button className="glass icon-btn" aria-label="Programme" onClick={() => setSheet('program')}>
                <Settings2 size={20} />
              </button>
            }
          />

          <WeekStrip days={strip} />

          {needsSetup ? (
            <GlassCard className="card card-lg" style={{ padding: 20, gap: 16 }}>
              <div className="session-kicker">Pour commencer</div>
              <div className="session-title">Ton programme</div>
              <p className="muted" style={{ margin: 0, fontSize: 14 }}>
                1. Indique le matériel de ta salle (ou de chez toi).
                <br />
                2. Choisis ton organisation et le nombre de séances : Altius génère une proposition modifiable.
              </p>
              <button className="btn-secondary full" onClick={() => setSheet('gym')}>
                <Warehouse size={18} /> {gym ? `Salle : ${gym.name}` : 'Mon matériel'}
              </button>
              <button className="btn-primary" onClick={() => setSheet('program')}>
                <ClipboardList size={18} /> Créer mon programme
              </button>
            </GlassCard>
          ) : (
            day && (
              <GlassCard className="card card-lg" style={{ padding: 20, gap: 16 }}>
                <div className="row-between" style={{ alignItems: 'flex-start' }}>
                  <div className="grow">
                    <div className="session-kicker">{kicker}</div>
                    <div className="session-title">{active?.name ?? day.name}</div>
                    <div className="muted" style={{ fontSize: 14 }}>
                      {(active?.exercises.length ?? day.exercises.length)} exercices · ~{estimateMinutes(day)} min
                    </div>
                  </div>
                  <div>
                    <div className="chrono">{chrono(active ? elapsedMs(active, now) : 0)}</div>
                    <div className="caption" style={{ textAlign: 'right' }}>
                      Durée
                    </div>
                  </div>
                </div>
                {muscles.length > 0 && (
                  <div className="chips">
                    {muscles.map((m) => (
                      <span key={m} className="tag">
                        {MUSCLES[m].label}
                      </span>
                    ))}
                  </div>
                )}
                <div className="stack-sm">
                  <div className="row-between" style={{ fontSize: 14 }}>
                    <span className="muted">Progression</span>
                    <span className="num">
                      <strong>{progress.done}</strong>
                      <span className="muted"> / {progress.total} séries</span>
                    </span>
                  </div>
                  <ProgressBar value={progress.total ? progress.done / progress.total : 0} gradient />
                </div>
                <button className={`btn-primary ${running ? 'is-glass' : ''}`} onClick={() => void onMainButton()}>
                  {running ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
                  {!active ? 'Démarrer la séance' : running ? 'Mettre en pause' : 'Reprendre la séance'}
                </button>
                {active && (
                  <div className="row-between">
                    <button className="btn-link" style={{ color: 'var(--text-2)' }} onClick={() => void onDiscard()}>
                      Abandonner
                    </button>
                    <button className="btn-secondary" onClick={() => void onFinish()}>
                      Terminer la séance
                    </button>
                  </div>
                )}
                {!active && program && program.days.length > 1 && (
                  <div className="chips">
                    {program.days.map((d, i) => (
                      <Chip key={d.uid} small active={i === currentIdx} onClick={() => setDayIdx(i)}>
                        {d.name}
                        {i === plannedIdx ? ' ·  prévue' : ''}
                      </Chip>
                    ))}
                  </div>
                )}
              </GlassCard>
            )
          )}

          {day && (
            <>
              <div className="section-title">
                <h2 className="h2-large">Exercices</h2>
                <span className="muted" style={{ fontSize: 13 }}>
                  {active ? 'Touchez pour saisir vos séries' : 'Aperçu de la séance'}
                </span>
              </div>
              {active
                ? active.exercises.map((se, i) => (
                    <ExerciseCard
                      key={se.uid}
                      index={i}
                      se={se}
                      expanded={expanded === se.uid}
                      onToggle={() => setExpanded(expanded === se.uid ? null : se.uid)}
                      onChange={(next) => void updateExercise(next)}
                      onValidate={(idx) => void validateSet(se, idx)}
                      onSwap={() => setSwapUid(se.uid)}
                      onInfo={() => setInfo(exerciseById(se.exerciseId) ?? null)}
                      previous={previousById.get(se.exerciseId)}
                    />
                  ))
                : day.exercises.map((pe, i) => {
                    const ex = exerciseById(pe.exerciseId);
                    const load = ex ? targetLoadFor(ex, states?.[i] ?? undefined, profile) : 0;
                    const reps = pe.repMin === pe.repMax ? `${pe.repMin}` : `${pe.repMin}–${pe.repMax}`;
                    return (
                      <GlassCard key={pe.uid} as="button" className="glass-row" onClick={() => ex && setInfo(ex)}>
                        <span className="num-badge">{i + 1}</span>
                        <span className="grow">
                          <span className="ellipsis" style={{ display: 'block', fontSize: 16, fontWeight: 600 }}>
                            {ex?.nameFr ?? pe.exerciseId}
                          </span>
                          <span className="caption ellipsis" style={{ display: 'block', fontSize: 13 }}>
                            {pe.sets} × {reps}
                            {load > 0 ? ` · ${fmtMax(load)} kg` : ''}
                            {previousById.get(pe.exerciseId) ? ` · dernière : ${previousById.get(pe.exerciseId)}` : ''}
                          </span>
                        </span>
                        <span className="set-dots">
                          {Array.from({ length: pe.sets }, (_, k) => (
                            <span key={k} className="set-dot" />
                          ))}
                        </span>
                      </GlassCard>
                    );
                  })}
            </>
          )}

          <div className="grid-2" style={{ marginTop: 6 }}>
            <GlassCard as="button" className="tile" onClick={() => setSheet('library')}>
              <BookOpen size={20} className="icon" />
              <span className="body">Bibliothèque</span>
              <span className="caption">Exercices & muscles</span>
            </GlassCard>
            <GlassCard as="button" className="tile" onClick={() => setSheet('history')}>
              <History size={20} className="icon" />
              <span className="body">Historique</span>
              <span className="caption">Séances passées</span>
            </GlassCard>
            <GlassCard as="button" className="tile" onClick={() => setSheet('gym')}>
              <Warehouse size={20} className="icon" />
              <span className="body">Profils de salle</span>
              <span className="caption ellipsis">{gym ? gym.name : 'Matériel disponible'}</span>
            </GlassCard>
            <GlassCard as="button" className="tile" onClick={() => setSheet('program')}>
              <CalendarDays size={20} className="icon" />
              <span className="body">Programme</span>
              <span className="caption ellipsis">{program ? program.name : 'À créer'}</span>
            </GlassCard>
          </div>
        </div>
      </div>

      {rest && (
        <RestTimer
          endsAt={rest.endsAt}
          total={rest.total}
          now={now}
          onAdd={(sec) => setRest({ ...rest, endsAt: Math.max(Date.now() + 1000, rest.endsAt + sec * 1000), total: rest.total + sec * 1000 })}
          onSkip={() => setRest(null)}
        />
      )}

      <GymSheet open={sheet === 'gym'} onClose={() => setSheet(null)} profile={profile} />
      <ProgramBuilderSheet open={sheet === 'program'} onClose={() => setSheet(null)} profile={profile} program={program} />
      <ExerciseLibrarySheet open={sheet === 'library'} onClose={() => setSheet(null)} equipment={gym?.equipment ?? null} />
      <HistorySheet open={sheet === 'history'} onClose={() => setSheet(null)} />
      <ExerciseLibrarySheet
        open={swapUid !== null}
        onClose={() => setSwapUid(null)}
        equipment={gym?.equipment ?? PRESETS.salle}
        onPick={(ex) => void onSwapPicked(ex)}
        initialMuscle={exerciseById(active?.exercises.find((e) => e.uid === swapUid)?.exerciseId ?? '')?.mainMuscle ?? null}
        title="Remplacer l’exercice"
      />
      <Sheet open={info !== null} onClose={() => setInfo(null)} full title="Exercice">
        {info && <ExerciseDetail exercise={info} />}
      </Sheet>
      <SessionSummarySheet
        open={summary !== null}
        onClose={() => setSummary(null)}
        results={summary?.results ?? []}
        durationMs={summary?.durationMs ?? 0}
        sets={summary?.sets ?? 0}
      />
    </>
  );
}
