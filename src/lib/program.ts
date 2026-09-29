import { isAvailable } from './equipment';
import { EXERCISES, exerciseById } from './exercises';
import { uid } from './db';
import { addDays, startOfWeek, todayKey, weekdayMon0 } from './format';
import type {
  EquipmentKey,
  Exercise,
  Goal,
  Level,
  Program,
  ProgramDay,
  ProgramExercise,
  SplitKey,
  WorkoutSession,
} from './types';

// Génération déterministe d'un programme à partir du split, du nombre de séances
// et du matériel du profil de salle.

type SlotKind = 'main' | 'compound' | 'isolation';

interface Slot {
  label: string;
  kind: SlotKind;
  muscles: string[]; // muscles free-exercise-db (repli)
  candidates: string[];
}

const SLOTS: Record<string, Slot> = {
  squat: {
    label: 'Squat',
    kind: 'main',
    muscles: ['quadriceps'],
    candidates: ['Barbell_Squat', 'Smith_Machine_Squat', 'Hack_Squat', 'Leg_Press', 'Goblet_Squat', 'Dumbbell_Squat', 'Bodyweight_Squat'],
  },
  hinge: {
    label: 'Charnière de hanche',
    kind: 'main',
    muscles: ['hamstrings'],
    candidates: [
      'Romanian_Deadlift',
      'Stiff-Legged_Dumbbell_Deadlift',
      'Smith_Machine_Stiff-Legged_Deadlift',
      'Kettlebell_One-Legged_Deadlift',
      'Single_Leg_Glute_Bridge',
    ],
  },
  deadlift: {
    label: 'Soulevé de terre',
    kind: 'main',
    muscles: ['lower back', 'hamstrings'],
    candidates: ['Barbell_Deadlift', 'Trap_Bar_Deadlift', 'Romanian_Deadlift', 'Stiff-Legged_Dumbbell_Deadlift'],
  },
  legpress: {
    label: 'Presse / fentes',
    kind: 'compound',
    muscles: ['quadriceps'],
    candidates: ['Leg_Press', 'Hack_Squat', 'Smith_Machine_Leg_Press', 'Dumbbell_Lunges', 'Split_Squat_with_Dumbbells', 'Bodyweight_Walking_Lunge'],
  },
  lunge: {
    label: 'Fentes',
    kind: 'compound',
    muscles: ['quadriceps'],
    candidates: ['Dumbbell_Lunges', 'Barbell_Walking_Lunge', 'Split_Squat_with_Dumbbells', 'Smith_Single-Leg_Split_Squat', 'Bodyweight_Walking_Lunge'],
  },
  legext: {
    label: 'Leg extension',
    kind: 'isolation',
    muscles: ['quadriceps'],
    candidates: ['Leg_Extensions', 'Single-Leg_Leg_Extension', 'Split_Squat_with_Dumbbells', 'Bodyweight_Squat'],
  },
  legcurl: {
    label: 'Leg curl',
    kind: 'isolation',
    muscles: ['hamstrings'],
    candidates: ['Lying_Leg_Curls', 'Seated_Leg_Curl', 'Standing_Leg_Curl', 'Ball_Leg_Curl', 'Stiff-Legged_Dumbbell_Deadlift', 'Single_Leg_Glute_Bridge'],
  },
  glute: {
    label: 'Fessiers',
    kind: 'compound',
    muscles: ['glutes'],
    candidates: ['Barbell_Hip_Thrust', 'Barbell_Glute_Bridge', 'Single_Leg_Glute_Bridge'],
  },
  calves: {
    label: 'Mollets',
    kind: 'isolation',
    muscles: ['calves'],
    candidates: [
      'Standing_Calf_Raises',
      'Seated_Calf_Raise',
      'Smith_Machine_Calf_Raise',
      'Calf_Press_On_The_Leg_Press_Machine',
      'Standing_Dumbbell_Calf_Raise',
      'Standing_Barbell_Calf_Raise',
      'Calf_Raises_-_With_Bands',
    ],
  },
  bench: {
    label: 'Développé couché',
    kind: 'main',
    muscles: ['chest'],
    candidates: ['Barbell_Bench_Press_-_Medium_Grip', 'Dumbbell_Bench_Press', 'Smith_Machine_Bench_Press', 'Machine_Bench_Press', 'Pushups'],
  },
  incline: {
    label: 'Développé incliné',
    kind: 'compound',
    muscles: ['chest'],
    candidates: [
      'Incline_Dumbbell_Press',
      'Barbell_Incline_Bench_Press_-_Medium_Grip',
      'Hammer_Grip_Incline_DB_Bench_Press',
      'Smith_Machine_Incline_Bench_Press',
      'Push-Ups_With_Feet_Elevated',
    ],
  },
  dips: {
    label: 'Dips',
    kind: 'compound',
    muscles: ['chest', 'triceps'],
    candidates: ['Dips_-_Chest_Version', 'Parallel_Bar_Dip', 'Dip_Machine', 'Decline_Dumbbell_Bench_Press', 'Push-Up_Wide'],
  },
  fly: {
    label: 'Écarté',
    kind: 'isolation',
    muscles: ['chest'],
    candidates: ['Cable_Crossover', 'Butterfly', 'Dumbbell_Flyes', 'Low_Cable_Crossover', 'Incline_Dumbbell_Flyes'],
  },
  ohp: {
    label: 'Développé épaules',
    kind: 'main',
    muscles: ['shoulders'],
    candidates: [
      'Standing_Military_Press',
      'Dumbbell_Shoulder_Press',
      'Machine_Shoulder_Military_Press',
      'Seated_Barbell_Military_Press',
      'Smith_Machine_Overhead_Shoulder_Press',
      'Shoulder_Press_-_With_Bands',
    ],
  },
  lateral: {
    label: 'Élévations latérales',
    kind: 'isolation',
    muscles: ['shoulders'],
    candidates: ['Side_Lateral_Raise', 'Cable_Seated_Lateral_Raise', 'Seated_Side_Lateral_Raise', 'Lateral_Raise_-_With_Bands'],
  },
  reardelt: {
    label: 'Arrière d’épaule',
    kind: 'isolation',
    muscles: ['shoulders'],
    candidates: ['Face_Pull', 'Reverse_Machine_Flyes', 'Reverse_Flyes', 'Cable_Rear_Delt_Fly', 'Back_Flyes_-_With_Bands'],
  },
  row: {
    label: 'Rowing',
    kind: 'main',
    muscles: ['middle back', 'lats'],
    candidates: [
      'Bent_Over_Barbell_Row',
      'One-Arm_Dumbbell_Row',
      'Seated_Cable_Rows',
      'Leverage_High_Row',
      'T-Bar_Row_with_Handle',
      'Bent_Over_Two-Dumbbell_Row',
      'Inverted_Row',
    ],
  },
  cablerow: {
    label: 'Tirage horizontal',
    kind: 'compound',
    muscles: ['middle back', 'lats'],
    candidates: ['Seated_Cable_Rows', 'Leverage_Iso_Row', 'One-Arm_Dumbbell_Row', 'Inverted_Row'],
  },
  vpull: {
    label: 'Tirage vertical',
    kind: 'main',
    muscles: ['lats'],
    candidates: ['Wide-Grip_Lat_Pulldown', 'Pullups', 'Close-Grip_Front_Lat_Pulldown', 'Chin-Up', 'Band_Assisted_Pull-Up', 'Inverted_Row'],
  },
  curl: {
    label: 'Curl',
    kind: 'isolation',
    muscles: ['biceps'],
    candidates: ['Barbell_Curl', 'Dumbbell_Bicep_Curl', 'EZ-Bar_Curl', 'Standing_Biceps_Cable_Curl', 'Machine_Bicep_Curl'],
  },
  hammer: {
    label: 'Curl marteau',
    kind: 'isolation',
    muscles: ['biceps'],
    candidates: ['Hammer_Curls', 'Cable_Hammer_Curls_-_Rope_Attachment', 'Alternate_Hammer_Curl', 'Incline_Dumbbell_Curl'],
  },
  triceps: {
    label: 'Triceps',
    kind: 'isolation',
    muscles: ['triceps'],
    candidates: [
      'Triceps_Pushdown',
      'Triceps_Pushdown_-_Rope_Attachment',
      'EZ-Bar_Skullcrusher',
      'Standing_Dumbbell_Triceps_Extension',
      'Dips_-_Triceps_Version',
      'Bench_Dips',
      'Push-Ups_-_Close_Triceps_Position',
      'Band_Skull_Crusher',
    ],
  },
  overheadtri: {
    label: 'Triceps au-dessus de la tête',
    kind: 'isolation',
    muscles: ['triceps'],
    candidates: [
      'Cable_Rope_Overhead_Triceps_Extension',
      'Triceps_Overhead_Extension_with_Rope',
      'Standing_Dumbbell_Triceps_Extension',
      'Standing_Overhead_Barbell_Triceps_Extension',
      'Bench_Dips',
    ],
  },
  shrug: {
    label: 'Trapèzes',
    kind: 'isolation',
    muscles: ['traps'],
    candidates: ['Barbell_Shrug', 'Dumbbell_Shrug', 'Smith_Machine_Behind_the_Back_Shrug', 'Cable_Shrugs', 'Leverage_Shrug'],
  },
  abs: {
    label: 'Abdos',
    kind: 'isolation',
    muscles: ['abdominals'],
    candidates: ['Cable_Crunch', 'Ab_Crunch_Machine', 'Ab_Roller', 'Plank', 'Crunches', 'Reverse_Crunch'],
  },
  lowerback: {
    label: 'Lombaires',
    kind: 'isolation',
    muscles: ['lower back'],
    candidates: ['Hyperextensions_Back_Extensions', 'Hyperextensions_With_No_Hyperextension_Bench'],
  },
  forearm: {
    label: 'Avant-bras',
    kind: 'isolation',
    muscles: ['forearms'],
    candidates: ['Palms-Up_Barbell_Wrist_Curl_Over_A_Bench', 'Seated_Dumbbell_Palms-Up_Wrist_Curl', 'Cable_Wrist_Curl'],
  },
};

const DAYS: Record<string, { name: string; slots: string[] }> = {
  fullA: { name: 'Full body A', slots: ['squat', 'bench', 'row', 'lateral', 'curl', 'abs'] },
  fullB: { name: 'Full body B', slots: ['hinge', 'ohp', 'vpull', 'lunge', 'triceps', 'calves'] },
  fullC: { name: 'Full body C', slots: ['legpress', 'incline', 'cablerow', 'legcurl', 'reardelt', 'abs'] },
  upper1: { name: 'Haut du corps A', slots: ['bench', 'row', 'ohp', 'vpull', 'curl', 'triceps'] },
  lower1: { name: 'Bas du corps A', slots: ['squat', 'hinge', 'legpress', 'legcurl', 'calves', 'abs'] },
  upper2: { name: 'Haut du corps B', slots: ['incline', 'vpull', 'lateral', 'cablerow', 'hammer', 'overheadtri'] },
  lower2: { name: 'Bas du corps B', slots: ['deadlift', 'lunge', 'legext', 'legcurl', 'glute', 'calves'] },
  push: { name: 'Push', slots: ['bench', 'incline', 'ohp', 'lateral', 'triceps', 'overheadtri'] },
  pull: { name: 'Pull', slots: ['vpull', 'row', 'cablerow', 'reardelt', 'curl', 'hammer'] },
  legs: { name: 'Legs', slots: ['squat', 'hinge', 'legpress', 'legext', 'legcurl', 'calves'] },
  chest: { name: 'Pectoraux', slots: ['bench', 'incline', 'dips', 'fly', 'abs'] },
  back: { name: 'Dos', slots: ['vpull', 'row', 'cablerow', 'shrug', 'lowerback'] },
  shoulders: { name: 'Épaules', slots: ['ohp', 'lateral', 'reardelt', 'shrug', 'abs'] },
  arms: { name: 'Bras', slots: ['curl', 'triceps', 'hammer', 'overheadtri', 'forearm'] },
  legsBro: { name: 'Jambes', slots: ['squat', 'legpress', 'hinge', 'legext', 'legcurl', 'calves'] },
  chestTri: { name: 'Pectoraux · Triceps', slots: ['bench', 'incline', 'fly', 'triceps', 'overheadtri'] },
  backBi: { name: 'Dos · Biceps', slots: ['vpull', 'row', 'cablerow', 'curl', 'hammer'] },
  legsShoulders: { name: 'Jambes · Épaules', slots: ['squat', 'hinge', 'legcurl', 'ohp', 'lateral', 'calves'] },
  shouldersArms: { name: 'Épaules · Bras', slots: ['ohp', 'lateral', 'reardelt', 'curl', 'triceps'] },
  quadsDay: { name: 'Quadriceps', slots: ['squat', 'legpress', 'lunge', 'legext', 'calves'] },
  hamsGlutes: { name: 'Ischios · Fessiers', slots: ['hinge', 'glute', 'legcurl', 'lowerback', 'abs'] },
};

export const SPLITS: Record<SplitKey, { label: string; hint: string; minDays: number; maxDays: number }> = {
  fullbody: { label: 'Full body', hint: 'Tout le corps à chaque séance · idéal 2-3 j', minDays: 2, maxDays: 4 },
  upperlower: { label: 'Upper / Lower', hint: 'Haut et bas du corps en alternance · 2-4 j', minDays: 2, maxDays: 6 },
  ppl: { label: 'Push / Pull / Legs', hint: 'Poussée, tirage, jambes · 3 ou 6 j', minDays: 3, maxDays: 6 },
  bro: { label: 'Un muscle par séance', hint: 'Split classique · 3 à 6 j', minDays: 3, maxDays: 6 },
};

export const SPLIT_ORDER: SplitKey[] = ['fullbody', 'upperlower', 'ppl', 'bro'];

function dayKeys(split: SplitKey, daysPerWeek: number): string[] {
  switch (split) {
    case 'fullbody':
      return ['fullA', 'fullB', 'fullC'];
    case 'upperlower':
      return ['upper1', 'lower1', 'upper2', 'lower2'];
    case 'ppl':
      return ['push', 'pull', 'legs'];
    case 'bro':
      if (daysPerWeek <= 3) return ['chestTri', 'backBi', 'legsShoulders'];
      if (daysPerWeek === 4) return ['chestTri', 'backBi', 'legsBro', 'shouldersArms'];
      if (daysPerWeek === 5) return ['chest', 'back', 'shoulders', 'arms', 'legsBro'];
      return ['chest', 'back', 'quadsDay', 'shoulders', 'arms', 'hamsGlutes'];
  }
}

export const DEFAULT_WEEKDAYS: Record<number, number[]> = {
  1: [0],
  2: [0, 3],
  3: [0, 2, 4],
  4: [0, 1, 3, 4],
  5: [0, 1, 2, 4, 5],
  6: [0, 1, 2, 3, 4, 5],
  7: [0, 1, 2, 3, 4, 5, 6],
};

const LEVEL_RANK: Record<Level, number> = { debutant: 0, intermediaire: 1, avance: 2 };
const EX_LEVEL_RANK = { b: 0, i: 1, e: 2 } as const;

function pickExercise(slot: Slot, available: Set<EquipmentKey>, used: Set<string>, level: Level): Exercise | undefined {
  for (const id of slot.candidates) {
    const e = exerciseById(id);
    if (e && !used.has(id) && isAvailable(e.requires, available) && EX_LEVEL_RANK[e.level] <= LEVEL_RANK[level] + 1) return e;
  }
  const wantIso = slot.kind === 'isolation';
  const pool = EXERCISES.filter(
    (e) =>
      (e.category === 'strength' || e.category === 'powerlifting') &&
      !used.has(e.id) &&
      isAvailable(e.requires, available) &&
      e.primary.some((m) => slot.muscles.includes(m)) &&
      EX_LEVEL_RANK[e.level] <= LEVEL_RANK[level] + 1,
  );
  pool.sort((a, b) => {
    const ma = (a.mechanic === 'isolation') === wantIso ? 0 : 1;
    const mb = (b.mechanic === 'isolation') === wantIso ? 0 : 1;
    if (ma !== mb) return ma - mb;
    return EX_LEVEL_RANK[a.level] - EX_LEVEL_RANK[b.level];
  });
  return pool[0];
}

export interface RepScheme {
  sets: number;
  repMin: number;
  repMax: number;
  restSec: number;
}

export function repScheme(kind: SlotKind | 'custom', goal: Goal, ex?: Exercise): RepScheme {
  const perf = goal === 'performance';
  const k: SlotKind = kind === 'custom' ? (ex?.mechanic === 'isolation' ? 'isolation' : 'compound') : kind;
  if (ex?.mainMuscle === 'abs') return { sets: 3, repMin: 10, repMax: 20, restSec: 60 };
  if (k === 'main') return perf ? { sets: 4, repMin: 4, repMax: 6, restSec: 180 } : { sets: 3, repMin: 6, repMax: 10, restSec: 150 };
  if (k === 'compound') return perf ? { sets: 3, repMin: 6, repMax: 10, restSec: 150 } : { sets: 3, repMin: 8, repMax: 12, restSec: 120 };
  return perf ? { sets: 3, repMin: 8, repMax: 12, restSec: 90 } : { sets: 3, repMin: 10, repMax: 15, restSec: 90 };
}

export function generateProgram(opts: {
  split: SplitKey;
  daysPerWeek: number;
  equipment: EquipmentKey[];
  gymId: string | null;
  goal: Goal;
  level: Level;
}): Program {
  const available = new Set<EquipmentKey>([...opts.equipment, 'poids_du_corps']);
  const days: ProgramDay[] = dayKeys(opts.split, opts.daysPerWeek).map((key) => {
    const tpl = DAYS[key];
    const used = new Set<string>();
    const exercises: ProgramExercise[] = [];
    for (const slotKey of tpl.slots) {
      const slot = SLOTS[slotKey];
      const ex = pickExercise(slot, available, used, opts.level);
      if (!ex) continue;
      used.add(ex.id);
      exercises.push({ uid: uid(), exerciseId: ex.id, ...repScheme(slot.kind, opts.goal, ex) });
    }
    return { uid: uid(), name: tpl.name, exercises };
  });
  const now = Date.now();
  return {
    id: uid(),
    name: `${SPLITS[opts.split].label} · ${opts.daysPerWeek} j/sem`,
    split: opts.split,
    daysPerWeek: opts.daysPerWeek,
    weekdays: DEFAULT_WEEKDAYS[opts.daysPerWeek] ?? [0, 2, 4],
    gymId: opts.gymId,
    days,
    createdAt: now,
    updatedAt: now,
  };
}

// ---- Planning ----

/** Index du prochain jour du programme (rotation après la dernière séance terminée). */
export function nextDayIndex(program: Program, sessions: WorkoutSession[]): number {
  const last = sessions
    .filter((s) => s.status === 'done' && s.programId === program.id)
    .sort((a, b) => (b.endedAt ?? 0) - (a.endedAt ?? 0))[0];
  if (!last || !program.days.length) return 0;
  const idx = program.days.findIndex((d) => d.uid === last.dayUid);
  const base = idx >= 0 ? idx : last.dayIndex;
  return (base + 1) % program.days.length;
}

export type DayStatus = 'done' | 'plan' | 'rest' | 'missed';

export interface WeekDay {
  date: Date;
  key: string;
  status: DayStatus;
  isToday: boolean;
}

export function weekStrip(program: Program | undefined, sessions: WorkoutSession[], now = new Date()): WeekDay[] {
  const start = startOfWeek(now);
  const today = todayKey(now);
  const doneDates = new Set(sessions.filter((s) => s.status === 'done').map((s) => s.date));
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(start, i);
    const key = todayKey(date);
    const planned = program?.weekdays.includes(i) ?? false;
    let status: DayStatus = 'rest';
    if (doneDates.has(key)) status = 'done';
    else if (planned) status = key < today ? 'missed' : 'plan';
    return { date, key, status, isToday: key === today };
  });
}

/** Date de la prochaine séance prévue (aujourd'hui inclus si rien n'a été fait). */
export function nextSessionDate(program: Program, sessions: WorkoutSession[], now = new Date()): Date | null {
  if (!program.weekdays.length) return null;
  const doneToday = sessions.some((s) => s.status === 'done' && s.date === todayKey(now));
  for (let i = doneToday ? 1 : 0; i < 14; i++) {
    const d = addDays(new Date(now.getFullYear(), now.getMonth(), now.getDate()), i);
    if (program.weekdays.includes(weekdayMon0(d))) return d;
  }
  return null;
}

export function estimateMinutes(day: ProgramDay): number {
  let sec = 0;
  for (const e of day.exercises) sec += e.sets * (45 + e.restSec);
  return Math.max(10, Math.round(sec / 60 / 5) * 5);
}

export function dayMuscles(day: ProgramDay): string[] {
  const score = new Map<string, number>();
  for (const pe of day.exercises) {
    const ex = exerciseById(pe.exerciseId);
    if (!ex) continue;
    for (const [k, w] of Object.entries(ex.weights)) score.set(k, (score.get(k) ?? 0) + (w ?? 0) * pe.sets);
  }
  return [...score.entries()]
    .filter(([, v]) => v >= 3)
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => k);
}
