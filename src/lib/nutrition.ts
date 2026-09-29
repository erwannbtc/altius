import { addDays } from './format';
import type { ActivityLevel, DietType, Goal, MealEntry, Pace, Profile, Sex } from './types';

// Tous les calculs nutritionnels sont faits ici, de façon déterministe.
// Le coach IA ne recalcule jamais ces valeurs : il les cite.

export const KCAL_PER_KG = 7700;

export const ACTIVITY: Record<ActivityLevel, { label: string; factor: number; hint: string }> = {
  sedentaire: { label: 'Sédentaire', factor: 1.2, hint: 'Bureau, peu de marche' },
  leger: { label: 'Légèrement actif', factor: 1.375, hint: '1 à 3 entraînements / semaine' },
  modere: { label: 'Modérément actif', factor: 1.55, hint: '3 à 5 entraînements / semaine' },
  actif: { label: 'Très actif', factor: 1.725, hint: '6 à 7 entraînements / semaine' },
  tres_actif: { label: 'Extrêmement actif', factor: 1.9, hint: 'Métier physique + sport' },
};

export const DIETS: Record<DietType, { label: string; p: number; c: number; f: number; hint: string }> = {
  equilibree: { label: 'Équilibrée', p: 25, c: 50, f: 25, hint: 'Glucidique classique' },
  hyperproteinee: { label: 'Hyperprotéinée', p: 35, c: 40, f: 25, hint: 'Priorité aux protéines' },
  vegetarienne: { label: 'Végétarienne', p: 20, c: 55, f: 25, hint: 'Sans viande ni poisson' },
  mediterraneenne: { label: 'Méditerranéenne', p: 20, c: 45, f: 35, hint: 'Huile d’olive, poissons' },
  cetogene: { label: 'Cétogène', p: 25, c: 5, f: 70, hint: 'Glucides très bas' },
};

export const DIET_ORDER: DietType[] = ['equilibree', 'hyperproteinee', 'vegetarienne', 'mediterraneenne', 'cetogene'];

/** Plafond de glucides en cétogène (g/jour) */
export const KETO_CARB_CAP = 30;

export const GOALS: Record<Goal, { label: string; hint: string }> = {
  masse: { label: 'Prise de masse', hint: 'Surplus calorique léger' },
  seche: { label: 'Sèche', hint: 'Déficit calorique' },
  maintien: { label: 'Maintien', hint: 'Calories d’équilibre' },
  performance: { label: 'Performance', hint: 'Records (PR) et force' },
};

export const GOAL_ORDER: Goal[] = ['masse', 'seche', 'maintien', 'performance'];

/** Rythme hebdomadaire en % du poids du corps */
export const PACES: Record<Pace, { label: string; loss: number; gain: number }> = {
  doux: { label: 'Progressif', loss: 0.5, gain: 0.25 },
  modere: { label: 'Modéré', loss: 0.75, gain: 0.35 },
  rapide: { label: 'Rapide', loss: 1.0, gain: 0.5 },
};

export function ageOf(p: Pick<Profile, 'birthYear'>, now = new Date()): number {
  return now.getFullYear() - p.birthYear;
}

export function bmi(weightKg: number, heightCm: number): number {
  const m = heightCm / 100;
  return weightKg / (m * m);
}

/** Métabolisme de base — équation de Mifflin-St Jeor */
export function mifflinStJeor(sex: Sex, weightKg: number, heightCm: number, age: number): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === 'homme' ? base + 5 : base - 161;
}

export interface Warning {
  level: 'danger' | 'warning' | 'info';
  text: string;
}

export interface Macros {
  protein: number;
  carbs: number;
  fat: number;
}

export interface NutritionPlan {
  age: number;
  bmr: number;
  tdee: number;
  direction: 'perte' | 'prise' | 'maintien';
  diffKg: number;
  weeklyRatePct: number;
  weeklyRateKg: number;
  dailyDelta: number;
  recommendedKcal: number;
  minKcal: number;
  targetKcal: number;
  isOverride: boolean;
  macros: Macros;
  split: { p: number; c: number; f: number };
  proteinPerKg: number;
  weeksToGoal: number | null;
  eta: Date | null;
  targetBmi: number;
  currentBmi: number;
  warnings: Warning[];
}

export function macrosFor(kcal: number, diet: DietType): { macros: Macros; split: { p: number; c: number; f: number } } {
  const d = DIETS[diet];
  let protein = (kcal * d.p) / 100 / 4;
  let carbs = (kcal * d.c) / 100 / 4;
  let fat = (kcal * d.f) / 100 / 9;
  if (diet === 'cetogene' && carbs > KETO_CARB_CAP) {
    const extra = (carbs - KETO_CARB_CAP) * 4;
    carbs = KETO_CARB_CAP;
    fat += extra / 9;
  }
  protein = Math.round(protein);
  carbs = Math.round(carbs);
  fat = Math.round(fat);
  const total = protein * 4 + carbs * 4 + fat * 9 || 1;
  return {
    macros: { protein, carbs, fat },
    split: {
      p: Math.round(((protein * 4) / total) * 100),
      c: Math.round(((carbs * 4) / total) * 100),
      f: Math.round(((fat * 9) / total) * 100),
    },
  };
}

const round10 = (n: number) => Math.round(n / 10) * 10;

export function computePlan(p: Profile, now = new Date()): NutritionPlan {
  const age = ageOf(p, now);
  const bmr = mifflinStJeor(p.sex, p.weightKg, p.heightCm, age);
  const tdee = bmr * ACTIVITY[p.activity].factor;
  const diffKg = +(p.targetWeightKg - p.weightKg).toFixed(1);
  const direction: NutritionPlan['direction'] = Math.abs(diffKg) < 0.5 ? 'maintien' : diffKg < 0 ? 'perte' : 'prise';
  const pace = PACES[p.pace];
  const weeklyRatePct = direction === 'perte' ? pace.loss : direction === 'prise' ? pace.gain : 0;
  const weeklyRateKg = (p.weightKg * weeklyRatePct) / 100;
  const sign = direction === 'perte' ? -1 : direction === 'prise' ? 1 : 0;
  const dailyDelta = (sign * weeklyRateKg * KCAL_PER_KG) / 7;
  const minKcal = Math.max(Math.round(bmr), p.sex === 'femme' ? 1200 : 1500);
  const warnings: Warning[] = [];

  let recommendedKcal = round10(tdee + dailyDelta);
  if (recommendedKcal < minKcal) {
    warnings.push({
      level: 'warning',
      text: `Le rythme choisi ferait descendre sous ${minKcal.toLocaleString('fr-FR')} kcal (ton métabolisme de base). L'objectif est bloqué à ce plancher : choisis un rythme plus doux.`,
    });
    recommendedKcal = round10(minKcal);
  }

  const isOverride = p.calorieOverride !== null;
  const targetKcal = isOverride ? p.calorieOverride! : recommendedKcal;
  const { macros, split } = macrosFor(targetKcal, p.diet);

  const weeksToGoal = direction === 'maintien' || weeklyRateKg === 0 ? null : Math.abs(diffKg) / weeklyRateKg;
  const eta = weeksToGoal === null ? null : addDays(now, Math.ceil(weeksToGoal * 7));
  const targetBmi = bmi(p.targetWeightKg, p.heightCm);
  const currentBmi = bmi(p.weightKg, p.heightCm);

  // ---- Garde-fous ----
  if (targetBmi < 18.5) {
    warnings.push({
      level: 'danger',
      text: `Poids cible sous un IMC de 18,5 (${targetBmi.toFixed(1).replace('.', ',')}) : objectif potentiellement dangereux. Parles-en à un médecin avant de le viser.`,
    });
  } else if (direction === 'prise' && targetBmi > 27) {
    warnings.push({
      level: 'warning',
      text: 'Au-delà d’un IMC de 27, une prise de poids ajoute surtout de la masse grasse. Vise plutôt une recomposition.',
    });
  }
  if (Math.abs(diffKg) / p.weightKg > 0.2) {
    warnings.push({
      level: 'warning',
      text: 'Changement de plus de 20 % du poids du corps : objectif très ambitieux. Découpe-le en paliers.',
    });
  }
  if (weeksToGoal !== null && weeksToGoal > 78) {
    warnings.push({ level: 'info', text: 'Plus de 18 mois au rythme choisi : fixe-toi des étapes intermédiaires.' });
  }
  if (p.goal === 'seche' && direction === 'prise') {
    warnings.push({ level: 'warning', text: 'Objectif « Sèche » mais poids cible supérieur à ton poids : vérifie ton poids cible.' });
  }
  if (p.goal === 'masse' && direction === 'perte') {
    warnings.push({ level: 'warning', text: 'Objectif « Prise de masse » mais poids cible inférieur à ton poids : vérifie ton poids cible.' });
  }
  if (age < 18) {
    warnings.push({ level: 'warning', text: 'Ces calculs sont conçus pour les adultes. Avant 18 ans, demande conseil à un professionnel de santé.' });
  }
  if (isOverride && targetKcal < minKcal) {
    warnings.push({
      level: 'danger',
      text: `Ton objectif manuel (${targetKcal.toLocaleString('fr-FR')} kcal) est sous ton plancher (${minKcal.toLocaleString('fr-FR')} kcal). Risqué pour ta santé et ta masse musculaire.`,
    });
  } else if (isOverride && Math.abs(targetKcal - recommendedKcal) >= 400) {
    warnings.push({
      level: 'info',
      text: `Objectif manuel éloigné de la recommandation (${recommendedKcal.toLocaleString('fr-FR')} kcal).`,
    });
  }
  if (p.diet === 'cetogene') {
    warnings.push({
      level: 'info',
      text: 'Cétogène : prévois 2 à 4 semaines d’adaptation, sale bien tes plats et surveille potassium et magnésium.',
    });
  }

  return {
    age,
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    direction,
    diffKg,
    weeklyRatePct,
    weeklyRateKg,
    dailyDelta: Math.round(dailyDelta),
    recommendedKcal,
    minKcal,
    targetKcal,
    isOverride,
    macros,
    split,
    proteinPerKg: macros.protein / p.weightKg,
    weeksToGoal,
    eta,
    targetBmi,
    currentBmi,
    warnings,
  };
}

export interface DayTotals {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export function sumEntries(entries: MealEntry[]): DayTotals {
  return entries.reduce(
    (a, e) => ({
      kcal: a.kcal + e.kcal,
      protein: a.protein + e.protein,
      carbs: a.carbs + e.carbs,
      fat: a.fat + e.fat,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

export function portionValues(food: { kcal: number; protein: number; carbs: number; fat: number }, grams: number) {
  const f = grams / 100;
  return {
    kcal: Math.round(food.kcal * f),
    protein: +(food.protein * f).toFixed(1),
    carbs: +(food.carbs * f).toFixed(1),
    fat: +(food.fat * f).toFixed(1),
  };
}
