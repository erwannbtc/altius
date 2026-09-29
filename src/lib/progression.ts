import type { EquipmentKey, Exercise, ExerciseState, MuscleKey, Profile, ProgressionResult, SessionExercise } from './types';

// Progression automatique — logique déterministe (aucune IA) :
// double progression. Haut de fourchette sur toutes les séries → la charge monte.
// Une série sous le bas de fourchette → échec, charge conservée.
// 3 séances en échec d'affilée → la charge baisse de 10 %.

export const FAILURES_BEFORE_DELOAD = 3;
export const DELOAD_FACTOR = 0.9;

const LOWER_BODY: MuscleKey[] = ['quads', 'glutes', 'hamstrings', 'lowerBack', 'calves'];

const NO_LOAD: EquipmentKey[] = ['poids_du_corps', 'elastiques', 'swiss_ball', 'rouleau', 'medecine_ball'];

export function isBodyweight(ex: Exercise): boolean {
  return NO_LOAD.includes(ex.equipment);
}

function isLower(ex: Exercise): boolean {
  return !!ex.mainMuscle && LOWER_BODY.includes(ex.mainMuscle);
}

/** Pas d'augmentation de charge selon le matériel */
export function incrementFor(ex: Exercise): number {
  switch (ex.equipment) {
    case 'barre':
    case 'smith':
      return isLower(ex) && ex.mechanic !== 'isolation' ? 5 : 2.5;
    case 'barre_ez':
      return 2.5;
    case 'halteres':
      return 2;
    case 'kettlebells':
      return 4;
    case 'machines':
      return isLower(ex) ? 5 : 2.5;
    case 'poulies':
      return 2.5;
    case 'autre':
      return 2.5;
    default:
      return 2.5; // lest éventuel sur un exercice au poids du corps
  }
}

function minLoad(ex: Exercise): number {
  switch (ex.equipment) {
    case 'barre':
      return ex.mechanic === 'isolation' ? 10 : 20;
    case 'barre_ez':
      return 10;
    case 'kettlebells':
      return 8;
    case 'halteres':
      return 2;
    default:
      return incrementFor(ex);
  }
}

export function roundLoad(load: number, ex: Exercise): number {
  const step = ex.equipment === 'halteres' ? 1 : ex.equipment === 'kettlebells' ? 4 : incrementFor(ex);
  const r = Math.round(load / step) * step;
  return Math.max(minLoad(ex), +r.toFixed(2));
}

// Charge de référence (kg) pour un homme intermédiaire de 75 kg, sur 8-10 reps,
// exprimée pour une barre / une machine (charge totale).
const COMPOUND_BASE: Record<MuscleKey, number> = {
  quads: 70,
  glutes: 70,
  hamstrings: 60,
  lowerBack: 80,
  chest: 55,
  upperBack: 50,
  shoulders: 35,
  triceps: 45,
  biceps: 30,
  traps: 60,
  calves: 60,
  forearms: 20,
  abs: 10,
};

const ISOLATION_BASE: Record<MuscleKey, number> = {
  quads: 40,
  glutes: 30,
  hamstrings: 35,
  lowerBack: 10,
  chest: 20,
  upperBack: 25,
  shoulders: 10,
  triceps: 25,
  biceps: 25,
  traps: 60,
  calves: 60,
  forearms: 15,
  abs: 15,
};

const LEVEL_FACTOR = { debutant: 0.6, intermediaire: 1, avance: 1.3 } as const;

/** Charge de départ suggérée selon le poids, le sexe et le niveau. À ajuster dès la 1re séance. */
export function startingLoad(ex: Exercise, p: Pick<Profile, 'weightKg' | 'sex' | 'level'>): number {
  if (isBodyweight(ex)) return 0;
  const muscle = ex.mainMuscle ?? 'chest';
  const iso = ex.mechanic === 'isolation';
  let base = (iso ? ISOLATION_BASE : COMPOUND_BASE)[muscle];
  let eq = 1;
  switch (ex.equipment) {
    case 'halteres':
    case 'kettlebells':
      eq = iso ? 0.4 : 0.35; // par main
      break;
    case 'poulies':
      eq = iso ? 0.7 : 0.8;
      break;
    case 'machines':
      eq = /leg press|hack squat/i.test(ex.name) ? 2.2 : iso ? 1 : 1.1;
      break;
    case 'smith':
      eq = 0.9;
      break;
    case 'barre_ez':
      eq = 0.9;
      break;
  }
  if (/deadlift/i.test(ex.name) && !/romanian|stiff/i.test(ex.name)) base = Math.max(base, 80);
  const load = base * eq * (p.weightKg / 75) * LEVEL_FACTOR[p.level] * (p.sex === 'femme' ? 0.65 : 1);
  return roundLoad(load, ex);
}

export function targetLoadFor(ex: Exercise, state: ExerciseState | undefined, p: Profile): number {
  return state ? state.load : startingLoad(ex, p);
}

/** Évalue un exercice d'une séance terminée et calcule la charge de la prochaine séance. */
export function evaluateExercise(
  se: SessionExercise,
  ex: Exercise,
  state: ExerciseState | undefined,
): { result: ProgressionResult; next: ExerciseState | null } {
  const done = se.sets.filter((s) => s.done && s.reps !== null);
  const prevFailures = state?.failures ?? 0;
  const loads = done.map((s) => s.load ?? se.targetLoad);
  const working = loads.length ? Math.min(...loads) : se.targetLoad;
  const fmtKg = (n: number) => `${n.toLocaleString('fr-FR')} kg`;

  if (!done.length) {
    return {
      result: {
        exerciseId: se.exerciseId,
        outcome: 'skip',
        fromLoad: se.targetLoad,
        toLoad: se.targetLoad,
        failures: prevFailures,
        message: 'Non réalisé : charge inchangée.',
      },
      next: null,
    };
  }

  const complete = done.length >= se.targetSets;
  const allTop = complete && done.every((s) => (s.reps ?? 0) >= se.repMax);
  const anyBelow = !complete || done.some((s) => (s.reps ?? 0) < se.repMin);
  const now = Date.now();

  if (isBodyweight(ex) && working === 0) {
    const outcome = allTop ? 'reps' : anyBelow ? 'fail' : 'hold';
    return {
      result: {
        exerciseId: se.exerciseId,
        outcome,
        fromLoad: 0,
        toLoad: 0,
        failures: anyBelow ? prevFailures + 1 : 0,
        message: allTop
          ? 'Haut de fourchette atteint : ajoute du lest ou passe à une variante plus dure.'
          : anyBelow
            ? 'Sous la fourchette : on garde la même cible.'
            : 'Dans la fourchette : vise une répétition de plus par série.',
      },
      next: { exerciseId: se.exerciseId, load: 0, failures: anyBelow ? prevFailures + 1 : 0, updatedAt: now },
    };
  }

  if (allTop) {
    const toLoad = roundLoad(working + incrementFor(ex), ex);
    return {
      result: {
        exerciseId: se.exerciseId,
        outcome: 'up',
        fromLoad: working,
        toLoad,
        failures: 0,
        message: `Haut de fourchette sur toutes les séries : ${fmtKg(working)} → ${fmtKg(toLoad)}.`,
      },
      next: { exerciseId: se.exerciseId, load: toLoad, failures: 0, updatedAt: now },
    };
  }

  if (anyBelow) {
    const failures = prevFailures + 1;
    if (failures >= FAILURES_BEFORE_DELOAD) {
      const toLoad = roundLoad(working * DELOAD_FACTOR, ex);
      return {
        result: {
          exerciseId: se.exerciseId,
          outcome: 'deload',
          fromLoad: working,
          toLoad,
          failures: 0,
          message: `${FAILURES_BEFORE_DELOAD} échecs d'affilée : on redescend à ${fmtKg(toLoad)} pour repartir.`,
        },
        next: { exerciseId: se.exerciseId, load: toLoad, failures: 0, updatedAt: now },
      };
    }
    return {
      result: {
        exerciseId: se.exerciseId,
        outcome: 'fail',
        fromLoad: working,
        toLoad: working,
        failures,
        message: `Cible manquée (${failures}/${FAILURES_BEFORE_DELOAD}) : on garde ${fmtKg(working)}.`,
      },
      next: { exerciseId: se.exerciseId, load: working, failures, updatedAt: now },
    };
  }

  return {
    result: {
      exerciseId: se.exerciseId,
      outcome: 'hold',
      fromLoad: working,
      toLoad: working,
      failures: 0,
      message: `Dans la fourchette : on garde ${fmtKg(working)} et on vise plus de répétitions.`,
    },
    next: { exerciseId: se.exerciseId, load: working, failures: 0, updatedAt: now },
  };
}
