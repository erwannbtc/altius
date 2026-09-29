import { MUSCLES, MUSCLE_KEYS } from './muscles';
import type { Exercise, MuscleKey, WorkoutSession } from './types';

/** Nombre de séries pondérées récentes qui donnent 100 % de chaleur. */
export const HEAT_SATURATION = 8;

export interface MuscleHeat {
  intensity: number; // 0 → 1
  lastAt: number | null;
  load: number; // séries pondérées (avant normalisation)
}

export type HeatMap = Record<MuscleKey, MuscleHeat>;

export function emptyHeat(): HeatMap {
  const h = {} as HeatMap;
  for (const k of MUSCLE_KEYS) h[k] = { intensity: 0, lastAt: null, load: 0 };
  return h;
}

/**
 * Chaleur d'un muscle = Σ (séries validées × poids du muscle dans l'exercice)
 * avec décroissance linéaire sur la fenêtre de récupération (48 h ou 72 h).
 */
export function computeHeat(
  sessions: WorkoutSession[],
  exerciseById: (id: string) => Exercise | undefined,
  now = Date.now(),
): HeatMap {
  const heat = emptyHeat();
  for (const s of sessions) {
    for (const se of s.exercises) {
      const ex = exerciseById(se.exerciseId);
      if (!ex) continue;
      for (const set of se.sets) {
        if (!set.done) continue;
        const t = set.doneAt ?? s.endedAt ?? s.startedAt ?? now;
        const hours = (now - t) / 3_600_000;
        if (hours < 0) continue;
        for (const [k, w] of Object.entries(ex.weights) as [MuscleKey, number][]) {
          const window = MUSCLES[k].recoveryH;
          if (hours > window) continue;
          const decay = 1 - hours / window;
          heat[k].load += w * decay;
          if (w >= 0.3 && (heat[k].lastAt === null || t > heat[k].lastAt!)) heat[k].lastAt = t;
        }
      }
    }
  }
  for (const k of MUSCLE_KEYS) heat[k].intensity = Math.min(1, heat[k].load / HEAT_SATURATION);
  return heat;
}

/** Dernière date où chaque muscle a été travaillé (sur tout l'historique fourni). */
export function lastTrained(
  sessions: WorkoutSession[],
  exerciseById: (id: string) => Exercise | undefined,
): Partial<Record<MuscleKey, number>> {
  const out: Partial<Record<MuscleKey, number>> = {};
  for (const s of sessions) {
    for (const se of s.exercises) {
      const ex = exerciseById(se.exerciseId);
      if (!ex) continue;
      const doneSets = se.sets.filter((x) => x.done);
      if (!doneSets.length) continue;
      const t = Math.max(...doneSets.map((x) => x.doneAt ?? s.endedAt ?? s.startedAt ?? 0));
      for (const [k, w] of Object.entries(ex.weights) as [MuscleKey, number][]) {
        if (w < 0.3) continue;
        if (!out[k] || t > out[k]!) out[k] = t;
      }
    }
  }
  return out;
}

// ---- Couleurs (maquette §5.3) ----

const COLD = [38, 38, 44];
const HOT = [255, 45, 62];

export function heatRgb(i: number): [number, number, number] {
  const t = Math.pow(Math.min(1, Math.max(0, i)), 0.8);
  return COLD.map((v, j) => Math.round(v + (HOT[j] - v) * t)) as [number, number, number];
}

export function heatColor(i: number): string {
  return `rgb(${heatRgb(i).join(',')})`;
}

export function glowLevel(i: number): { blur: number; alpha: number } {
  if (i > 0.75) return { blur: 7, alpha: 0.95 };
  if (i > 0.45) return { blur: 4, alpha: 0.7 };
  if (i > 0.2) return { blur: 2, alpha: 0.45 };
  return { blur: 0, alpha: 0 };
}
