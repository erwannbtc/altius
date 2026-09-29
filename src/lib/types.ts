// Modèles de données d'Altius (stockés localement dans IndexedDB via Dexie).

export type Sex = 'homme' | 'femme';
export type Goal = 'masse' | 'seche' | 'maintien' | 'performance';
export type Level = 'debutant' | 'intermediaire' | 'avance';
export type ActivityLevel = 'sedentaire' | 'leger' | 'modere' | 'actif' | 'tres_actif';
export type DietType = 'equilibree' | 'hyperproteinee' | 'vegetarienne' | 'mediterraneenne' | 'cetogene';
export type Pace = 'doux' | 'modere' | 'rapide';

export type MuscleKey =
  | 'chest'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'abs'
  | 'upperBack'
  | 'lowerBack'
  | 'traps'
  | 'glutes'
  | 'quads'
  | 'hamstrings'
  | 'calves';

export type MuscleWeights = Partial<Record<MuscleKey, number>>;

export interface Profile {
  id: 'me';
  name: string;
  sex: Sex;
  birthYear: number;
  heightCm: number;
  weightKg: number;
  startWeightKg: number;
  targetWeightKg: number;
  goal: Goal;
  level: Level;
  activity: ActivityLevel;
  diet: DietType;
  pace: Pace;
  /** Objectif calorique ajusté à la main (stepper). null = valeur recommandée. */
  calorieOverride: number | null;
  activeGymId: string | null;
  activeProgramId: string | null;
  onboarded: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface WeightEntry {
  id?: number;
  date: string; // AAAA-MM-JJ
  kg: number;
}

// ---- Matériel & exercices ----

export type EquipmentKey =
  | 'poids_du_corps'
  | 'barre'
  | 'barre_ez'
  | 'halteres'
  | 'kettlebells'
  | 'poulies'
  | 'machines'
  | 'smith'
  | 'elastiques'
  | 'medecine_ball'
  | 'swiss_ball'
  | 'rouleau'
  | 'barre_traction'
  | 'banc'
  | 'barres_paralleles'
  | 'autre';

export interface GymProfile {
  id: string;
  name: string;
  kind: 'salle' | 'maison';
  equipment: EquipmentKey[];
  createdAt: number;
}

export type ExerciseLevel = 'b' | 'i' | 'e';

export interface Exercise {
  id: string;
  name: string; // anglais (source)
  nameFr: string;
  equipment: EquipmentKey;
  requires: EquipmentKey[];
  level: ExerciseLevel;
  mechanic: 'compound' | 'isolation' | null;
  force: 'push' | 'pull' | 'static' | null;
  category: string;
  primary: string[];
  secondary: string[];
  weights: MuscleWeights;
  mainMuscle: MuscleKey | null;
  instructions: string[];
  images: string[];
}

// ---- Programme ----

export type SplitKey = 'fullbody' | 'upperlower' | 'ppl' | 'bro';

export interface ProgramExercise {
  uid: string;
  exerciseId: string;
  sets: number;
  repMin: number;
  repMax: number;
  restSec: number;
}

export interface ProgramDay {
  uid: string;
  name: string;
  exercises: ProgramExercise[];
}

export interface Program {
  id: string;
  name: string;
  split: SplitKey;
  daysPerWeek: number;
  /** Jours d'entraînement dans la semaine : 0 = lundi … 6 = dimanche */
  weekdays: number[];
  gymId: string | null;
  days: ProgramDay[];
  createdAt: number;
  updatedAt: number;
}

// ---- Séances & séries ----

export interface SetLog {
  reps: number | null;
  load: number | null;
  rpe: number | null;
  done: boolean;
  doneAt?: number;
}

export interface SessionExercise {
  uid: string;
  exerciseId: string;
  targetSets: number;
  repMin: number;
  repMax: number;
  restSec: number;
  targetLoad: number;
  sets: SetLog[];
}

export type ProgressionOutcome = 'up' | 'hold' | 'fail' | 'deload' | 'skip' | 'reps';

export interface ProgressionResult {
  exerciseId: string;
  outcome: ProgressionOutcome;
  fromLoad: number;
  toLoad: number;
  failures: number;
  message: string;
}

export interface WorkoutSession {
  id: string;
  programId: string | null;
  dayUid: string | null;
  dayIndex: number;
  name: string;
  date: string; // AAAA-MM-JJ
  startedAt: number | null;
  endedAt: number | null;
  /** Temps cumulé du chrono (ms), hors période en cours */
  accumulatedMs: number;
  /** Horodatage de reprise si le chrono tourne */
  runningSince: number | null;
  status: 'active' | 'done';
  exercises: SessionExercise[];
  progression?: ProgressionResult[];
}

export interface ExerciseState {
  exerciseId: string;
  load: number;
  failures: number;
  updatedAt: number;
}

// ---- Alimentation ----

export type MealKey = 'petit_dejeuner' | 'dejeuner' | 'collation' | 'diner';

export interface Food {
  id: string;
  name: string;
  brand?: string;
  source: 'off' | 'manual' | 'generic';
  barcode?: string;
  kcal: number; // pour 100 g
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  portion?: { label: string; grams: number };
  imageUrl?: string;
  lastUsedAt?: number;
  useCount?: number;
}

export interface MealEntry {
  id?: number;
  date: string;
  meal: MealKey;
  foodId: string;
  name: string;
  grams: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  createdAt: number;
}

// ---- Coach ----

export interface ProgramChange {
  action: 'remplacer' | 'ajouter' | 'retirer' | 'modifier_series';
  dayIndex: number;
  /** Exercice concerné (retirer / remplacer / modifier) */
  targetExerciseId?: string;
  /** Nouvel exercice (ajouter / remplacer) */
  newExerciseId?: string;
  sets?: number;
  repMin?: number;
  repMax?: number;
  label: string;
}

export interface ProgramProposal {
  summary: string;
  changes: ProgramChange[];
  applied?: boolean;
}

export interface CoachMessage {
  id?: number;
  role: 'user' | 'assistant';
  text: string;
  createdAt: number;
  mode: 'claude' | 'local';
  proposal?: ProgramProposal;
  error?: boolean;
}

export type CoachMode = 'claude' | 'local';
export type ClaudeModel = 'claude-opus-5-5' | 'claude-sonnet-5-5' | 'claude-haiku-4-5';

export interface CoachSettings {
  mode: CoachMode;
  apiKey: string;
  model: ClaudeModel;
  proxyUrl: string;
  localModelId: string;
  localAccepted: boolean;
}

export interface SettingRow {
  key: string;
  value: unknown;
}
