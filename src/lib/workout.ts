import { db, uid } from './db';
import { exerciseById } from './exercises';
import { todayKey } from './format';
import { evaluateExercise, targetLoadFor } from './progression';
import type { ExerciseState, Profile, Program, ProgressionResult, SessionExercise, WorkoutSession } from './types';

export async function createSession(program: Program, dayIndex: number, profile: Profile): Promise<WorkoutSession> {
  const day = program.days[dayIndex];
  const states = await db.exerciseStates.bulkGet(day.exercises.map((e) => e.exerciseId));
  const exercises: SessionExercise[] = day.exercises.map((pe, i) => {
    const ex = exerciseById(pe.exerciseId);
    const load = ex ? targetLoadFor(ex, states[i] ?? undefined, profile) : 0;
    return {
      uid: uid(),
      exerciseId: pe.exerciseId,
      targetSets: pe.sets,
      repMin: pe.repMin,
      repMax: pe.repMax,
      restSec: pe.restSec,
      targetLoad: load,
      sets: Array.from({ length: pe.sets }, () => ({ reps: null, load, rpe: null, done: false })),
    };
  });
  const session: WorkoutSession = {
    id: uid(),
    programId: program.id,
    dayUid: day.uid,
    dayIndex,
    name: day.name,
    date: todayKey(),
    startedAt: null,
    endedAt: null,
    accumulatedMs: 0,
    runningSince: null,
    status: 'active',
    exercises,
  };
  await db.sessions.put(session);
  return session;
}

export function elapsedMs(s: WorkoutSession, now = Date.now()): number {
  return s.accumulatedMs + (s.runningSince ? now - s.runningSince : 0);
}

export async function startOrResume(s: WorkoutSession): Promise<void> {
  if (s.runningSince) return;
  const now = Date.now();
  await db.sessions.update(s.id, { runningSince: now, startedAt: s.startedAt ?? now });
}

export async function pause(s: WorkoutSession): Promise<void> {
  if (!s.runningSince) return;
  await db.sessions.update(s.id, { accumulatedMs: elapsedMs(s), runningSince: null });
}

export async function saveExercises(s: WorkoutSession, exercises: SessionExercise[]): Promise<void> {
  await db.sessions.update(s.id, { exercises });
}

/** Termine la séance et applique la progression automatique. */
export async function finishSession(s: WorkoutSession): Promise<ProgressionResult[]> {
  const now = Date.now();
  const states = await db.exerciseStates.bulkGet(s.exercises.map((e) => e.exerciseId));
  const results: ProgressionResult[] = [];
  const updates: ExerciseState[] = [];
  for (let i = 0; i < s.exercises.length; i++) {
    const se = s.exercises[i];
    const ex = exerciseById(se.exerciseId);
    if (!ex) continue;
    const { result, next } = evaluateExercise(se, ex, states[i] ?? undefined);
    results.push(result);
    if (next) updates.push(next);
  }
  await db.transaction('rw', db.sessions, db.exerciseStates, async () => {
    if (updates.length) await db.exerciseStates.bulkPut(updates);
    await db.sessions.update(s.id, {
      exercises: s.exercises,
      status: 'done',
      endedAt: now,
      accumulatedMs: elapsedMs(s, now),
      runningSince: null,
      startedAt: s.startedAt ?? now,
      progression: results,
    });
  });
  return results;
}

export async function discardSession(s: WorkoutSession): Promise<void> {
  await db.sessions.delete(s.id);
}

export function setsProgress(s: WorkoutSession): { done: number; total: number } {
  let done = 0;
  let total = 0;
  for (const e of s.exercises) {
    total += e.sets.length;
    done += e.sets.filter((x) => x.done).length;
  }
  return { done, total };
}

export function sessionVolume(s: WorkoutSession): number {
  let v = 0;
  for (const e of s.exercises) for (const x of e.sets) if (x.done) v += (x.reps ?? 0) * (x.load ?? 0);
  return v;
}
