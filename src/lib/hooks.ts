import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { db } from './db';
import { todayKey } from './format';
import type { CoachSettings, GymProfile, Profile, Program, WorkoutSession } from './types';

export const DEFAULT_PROFILE: Profile = {
  id: 'me',
  name: '',
  sex: 'homme',
  birthYear: new Date().getFullYear() - 28,
  heightCm: 178,
  weightKg: 74.2,
  startWeightKg: 70,
  targetWeightKg: 78,
  goal: 'masse',
  level: 'intermediaire',
  activity: 'modere',
  diet: 'equilibree',
  pace: 'modere',
  calorieOverride: null,
  activeGymId: null,
  activeProgramId: null,
  onboarded: false,
  createdAt: 0,
  updatedAt: 0,
};

export const DEFAULT_COACH: CoachSettings = {
  mode: 'claude',
  apiKey: '',
  model: 'claude-opus-5-5',
  proxyUrl: '',
  localModelId: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
  localAccepted: false,
};

/** Profil courant (undefined pendant le chargement). */
export function useProfile(): Profile | undefined {
  return useLiveQuery(async () => (await db.profile.get('me')) ?? { ...DEFAULT_PROFILE }, []);
}

export async function updateProfile(patch: Partial<Profile>): Promise<void> {
  const cur = (await db.profile.get('me')) ?? { ...DEFAULT_PROFILE, createdAt: Date.now() };
  await db.profile.put({ ...cur, ...patch, id: 'me', updatedAt: Date.now() });
}

/** Enregistre un nouveau poids (profil + historique du jour). */
export async function logWeight(kg: number): Promise<void> {
  const date = todayKey();
  await db.transaction('rw', db.weights, db.profile, async () => {
    const existing = await db.weights.where('date').equals(date).first();
    if (existing?.id) await db.weights.update(existing.id, { kg });
    else await db.weights.add({ date, kg });
    await updateProfile({ weightKg: kg });
  });
}

export function useActiveProgram(profile: Profile | undefined): Program | undefined {
  return useLiveQuery(
    async () => (profile?.activeProgramId ? await db.programs.get(profile.activeProgramId) : undefined),
    [profile?.activeProgramId],
  );
}

export function useActiveGym(profile: Profile | undefined): GymProfile | undefined {
  return useLiveQuery(
    async () => (profile?.activeGymId ? await db.gyms.get(profile.activeGymId) : undefined),
    [profile?.activeGymId],
  );
}

export function useSessions(): WorkoutSession[] | undefined {
  return useLiveQuery(() => db.sessions.orderBy('date').toArray(), []);
}

export function useCoachSettings(): CoachSettings | undefined {
  return useLiveQuery(async () => {
    const row = await db.settings.get('coach');
    return { ...DEFAULT_COACH, ...((row?.value as Partial<CoachSettings>) ?? {}) };
  }, []);
}

export async function saveCoachSettings(patch: Partial<CoachSettings>): Promise<void> {
  const row = await db.settings.get('coach');
  const cur = { ...DEFAULT_COACH, ...((row?.value as Partial<CoachSettings>) ?? {}) };
  await db.settings.put({ key: 'coach', value: { ...cur, ...patch } });
}

/** Horloge qui se met à jour toutes les `ms` millisecondes. */
export function useNow(ms = 1000, enabled = true): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!enabled) return;
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms, enabled]);
  return now;
}

export function useOnline(): boolean {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}
