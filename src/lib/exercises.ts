import raw from '../data/exercises.json';
import { EXERCISE_NAMES_FR } from '../data/exercise-names-fr';
import { isAvailable, mainEquipment, requiredEquipment } from './equipment';
import { computeWeights, DB_MUSCLE_MAP } from './muscles';
import type { EquipmentKey, Exercise, ExerciseLevel, MuscleKey } from './types';

interface RawExercise {
  id: string;
  n: string;
  eq: string | null;
  lv: string;
  me: string | null;
  fo: string | null;
  ca: string;
  pm: string[];
  sm: string[];
  in: string[];
  im: string[];
}

export const IMAGE_BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';

function build(r: RawExercise): Exercise {
  const equipment = mainEquipment(r.eq, r.n);
  const weights = computeWeights(r.pm, r.sm, r.fo, r.ca);
  const mainMuscle = (r.pm.map((m) => DB_MUSCLE_MAP[m]).find(Boolean) ?? null) as MuscleKey | null;
  return {
    id: r.id,
    name: r.n,
    nameFr: EXERCISE_NAMES_FR[r.id] ?? r.n,
    equipment,
    requires: requiredEquipment(equipment, r.n),
    level: r.lv as ExerciseLevel,
    mechanic: r.me === 'compound' || r.me === 'isolation' ? r.me : null,
    force: r.fo === 'push' || r.fo === 'pull' || r.fo === 'static' ? r.fo : null,
    category: r.ca,
    primary: r.pm,
    secondary: r.sm,
    weights,
    mainMuscle,
    instructions: r.in,
    images: r.im,
  };
}

export const EXERCISES: Exercise[] = (raw as RawExercise[]).map(build);

const BY_ID = new Map(EXERCISES.map((e) => [e.id, e]));

export function exerciseById(id: string): Exercise | undefined {
  return BY_ID.get(id);
}

export function exerciseName(id: string): string {
  return BY_ID.get(id)?.nameFr ?? id.replace(/_/g, ' ');
}

export const CATEGORY_LABEL: Record<string, string> = {
  strength: 'Musculation',
  powerlifting: 'Force athlétique',
  'olympic weightlifting': 'Haltérophilie',
  strongman: 'Strongman',
  plyometrics: 'Pliométrie',
  cardio: 'Cardio',
  stretching: 'Étirements',
};

export const LEVEL_LABEL: Record<ExerciseLevel, string> = {
  b: 'Débutant',
  i: 'Intermédiaire',
  e: 'Avancé',
};

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export interface ExerciseFilter {
  equipment?: Set<EquipmentKey> | null;
  muscle?: MuscleKey | null;
  query?: string;
  categories?: string[];
}

export function filterExercises(f: ExerciseFilter): Exercise[] {
  const q = f.query ? normalize(f.query) : '';
  const words = q ? q.split(' ') : [];
  return EXERCISES.filter((e) => {
    if (f.categories && !f.categories.includes(e.category)) return false;
    if (f.equipment && !isAvailable(e.requires, f.equipment)) return false;
    if (f.muscle && (e.weights[f.muscle] ?? 0) < 1) return false;
    if (words.length) {
      const hay = normalize(`${e.nameFr} ${e.name}`);
      if (!words.every((w) => hay.includes(w))) return false;
    }
    return true;
  });
}

/** Meilleure correspondance d'un nom libre (utilisé par le coach IA). */
export function findExerciseByName(query: string, available?: Set<EquipmentKey> | null): Exercise | undefined {
  const exact = BY_ID.get(query);
  if (exact) return exact;
  const q = normalize(query);
  if (!q) return undefined;
  const words = q.split(' ').filter((w) => w.length > 1);
  let best: { e: Exercise; score: number } | undefined;
  for (const e of EXERCISES) {
    if (available && !isAvailable(e.requires, available)) continue;
    const fr = normalize(e.nameFr);
    const en = normalize(e.name);
    let score = 0;
    if (fr === q || en === q) score += 100;
    for (const w of words) {
      if (fr.includes(w)) score += 3;
      if (en.includes(w)) score += 2;
    }
    if (e.category === 'strength') score += 1;
    if (e.level === 'b') score += 0.5;
    score -= (fr.split(' ').length - words.length) * 0.2;
    if (score > 0 && (!best || score > best.score)) best = { e, score };
  }
  return best?.e;
}
