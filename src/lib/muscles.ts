import type { MuscleKey, MuscleWeights } from './types';

export interface MuscleInfo {
  label: string;
  /** Fenêtre de récupération utilisée pour la décroissance de la « chaleur » (heures) */
  recoveryH: number;
}

export const MUSCLES: Record<MuscleKey, MuscleInfo> = {
  chest: { label: 'Pectoraux', recoveryH: 72 },
  shoulders: { label: 'Épaules', recoveryH: 48 },
  biceps: { label: 'Biceps', recoveryH: 48 },
  triceps: { label: 'Triceps', recoveryH: 48 },
  forearms: { label: 'Avant-bras', recoveryH: 48 },
  abs: { label: 'Abdos', recoveryH: 48 },
  upperBack: { label: 'Dos (haut)', recoveryH: 72 },
  lowerBack: { label: 'Lombaires', recoveryH: 72 },
  traps: { label: 'Trapèzes', recoveryH: 48 },
  glutes: { label: 'Fessiers', recoveryH: 72 },
  quads: { label: 'Quadriceps', recoveryH: 72 },
  hamstrings: { label: 'Ischios', recoveryH: 72 },
  calves: { label: 'Mollets', recoveryH: 48 },
};

export const MUSCLE_KEYS = Object.keys(MUSCLES) as MuscleKey[];

/** Muscles de free-exercise-db → zones d'Altius */
export const DB_MUSCLE_MAP: Record<string, MuscleKey> = {
  chest: 'chest',
  shoulders: 'shoulders',
  biceps: 'biceps',
  triceps: 'triceps',
  forearms: 'forearms',
  abdominals: 'abs',
  lats: 'upperBack',
  'middle back': 'upperBack',
  'lower back': 'lowerBack',
  traps: 'traps',
  neck: 'traps',
  glutes: 'glutes',
  abductors: 'glutes',
  quadriceps: 'quads',
  adductors: 'quads',
  hamstrings: 'hamstrings',
  calves: 'calves',
};

export const DB_MUSCLE_LABELS: Record<string, string> = {
  chest: 'Pectoraux',
  shoulders: 'Épaules',
  biceps: 'Biceps',
  triceps: 'Triceps',
  forearms: 'Avant-bras',
  abdominals: 'Abdos',
  lats: 'Grand dorsal',
  'middle back': 'Milieu du dos',
  'lower back': 'Lombaires',
  traps: 'Trapèzes',
  neck: 'Cou',
  glutes: 'Fessiers',
  abductors: 'Abducteurs',
  quadriceps: 'Quadriceps',
  adductors: 'Adducteurs',
  hamstrings: 'Ischios',
  calves: 'Mollets',
};

/**
 * Poids par muscle d'un exercice : principal = 1,0 ; secondaire = 0,3 à 0,5.
 * Ex. développé couché → pectoraux 1,0 · triceps 0,4 · épaules 0,3.
 */
export function computeWeights(
  primary: string[],
  secondary: string[],
  force: string | null,
  category: string,
): MuscleWeights {
  const w: MuscleWeights = {};
  const put = (k: MuscleKey | undefined, v: number) => {
    if (!k) return;
    w[k] = Math.max(w[k] ?? 0, v);
  };
  for (const m of primary) put(DB_MUSCLE_MAP[m], 1);
  const pressing = force === 'push' && primary.some((m) => m === 'chest' || m === 'triceps');
  for (const m of secondary) {
    const k = DB_MUSCLE_MAP[m];
    if (!k || w[k] === 1) continue;
    let v = 0.4;
    if (k === 'shoulders' && pressing) v = 0.3;
    else if (k === 'forearms') v = 0.3;
    else if (k === 'calves' || k === 'lowerBack') v = 0.3;
    else if (k === 'biceps' || k === 'triceps') v = 0.4;
    else if (k === 'glutes' || k === 'hamstrings' || k === 'quads') v = 0.5;
    put(k, v);
  }
  // Les étirements / le cardio ne « chargent » presque pas les muscles.
  const factor = category === 'stretching' ? 0.1 : category === 'cardio' ? 0.3 : 1;
  if (factor !== 1) for (const k of Object.keys(w) as MuscleKey[]) w[k] = +(w[k]! * factor).toFixed(2);
  return w;
}
