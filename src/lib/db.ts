import Dexie, { type EntityTable } from 'dexie';
import type {
  CoachMessage,
  ExerciseState,
  Food,
  GymProfile,
  MealEntry,
  Profile,
  Program,
  SettingRow,
  WeightEntry,
  WorkoutSession,
} from './types';

// Base locale IndexedDB. Rien ne quitte le téléphone (sauf les appels explicites
// à Open Food Facts et au coach IA).
export class AltiusDB extends Dexie {
  profile!: EntityTable<Profile, 'id'>;
  weights!: EntityTable<WeightEntry, 'id'>;
  gyms!: EntityTable<GymProfile, 'id'>;
  programs!: EntityTable<Program, 'id'>;
  exerciseStates!: EntityTable<ExerciseState, 'exerciseId'>;
  sessions!: EntityTable<WorkoutSession, 'id'>;
  foods!: EntityTable<Food, 'id'>;
  meals!: EntityTable<MealEntry, 'id'>;
  coachMessages!: EntityTable<CoachMessage, 'id'>;
  settings!: EntityTable<SettingRow, 'key'>;

  constructor() {
    super('altius');
    this.version(1).stores({
      profile: 'id',
      weights: '++id, date',
      gyms: 'id',
      programs: 'id',
      exerciseStates: 'exerciseId',
      sessions: 'id, date, status, startedAt',
      foods: 'id, name, lastUsedAt, barcode',
      meals: '++id, date, meal',
      coachMessages: '++id, createdAt',
      settings: 'key',
    });
  }
}

export const db = new AltiusDB();

export const TABLES = [
  'profile',
  'weights',
  'gyms',
  'programs',
  'exerciseStates',
  'sessions',
  'foods',
  'meals',
  'coachMessages',
  'settings',
] as const;

export type TableName = (typeof TABLES)[number];

export function uid(): string {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await db.settings.get(key);
  return row ? ({ ...(fallback as object), ...(row.value as object) } as T) : fallback;
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await db.settings.put({ key, value });
}

/** Demande au navigateur de ne pas effacer les données (utile sur iPhone). */
export async function requestPersistence(): Promise<boolean> {
  try {
    if (navigator.storage?.persisted && (await navigator.storage.persisted())) return true;
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}
