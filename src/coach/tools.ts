import type Anthropic from '@anthropic-ai/sdk';
import { db, uid } from '../lib/db';
import { PRESETS } from '../lib/equipment';
import { exerciseById, exerciseName, findExerciseByName } from '../lib/exercises';
import { repScheme } from '../lib/program';
import type { EquipmentKey, Profile, Program, ProgramChange, ProgramProposal } from '../lib/types';

// Outil que le coach peut appeler pour PROPOSER une modification du programme.
// Rien n'est appliqué sans le bouton « Appliquer » de l'utilisateur.

export const PROGRAM_TOOL_NAME = 'proposer_modification_programme';

export const PROGRAM_TOOL = {
  name: PROGRAM_TOOL_NAME,
  description:
    "Propose à l'utilisateur une ou plusieurs modifications de son programme d'entraînement (remplacer, ajouter ou retirer un exercice, ou changer séries/répétitions). L'app affiche la proposition avec un bouton « Appliquer » : l'utilisateur décide. N'utilise cet outil que si l'utilisateur demande d'ajuster son programme ou l'accepte.",
  eager_input_streaming: true,
  input_schema: {
    type: 'object' as const,
    properties: {
      resume: { type: 'string', description: 'Résumé en une phrase de la proposition, en français.' },
      modifications: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            action: { type: 'string', enum: ['remplacer', 'ajouter', 'retirer', 'modifier_series'] },
            jour: { type: 'integer', description: 'Index du jour dans le programme (voir « Jour N » dans le contexte, 0 = premier).' },
            exercice_actuel: {
              type: 'string',
              description: "ID exact (entre crochets dans le contexte) de l'exercice à remplacer, retirer ou modifier.",
            },
            nouvel_exercice: {
              type: 'string',
              description: "Nom de l'exercice à ajouter ou à mettre à la place (français ou anglais). L'app cherche la meilleure correspondance compatible avec le matériel.",
            },
            series: { type: 'integer', minimum: 1, maximum: 10 },
            reps_min: { type: 'integer', minimum: 1, maximum: 50 },
            reps_max: { type: 'integer', minimum: 1, maximum: 60 },
          },
          required: ['action', 'jour'],
          additionalProperties: false,
        },
      },
    },
    required: ['resume', 'modifications'],
    additionalProperties: false,
  },
};

interface RawChange {
  action?: unknown;
  jour?: unknown;
  exercice_actuel?: unknown;
  nouvel_exercice?: unknown;
  series?: unknown;
  reps_min?: unknown;
  reps_max?: unknown;
}

const int = (v: unknown, min: number, max: number): number | undefined =>
  typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max ? v : undefined;

/** Valide l'entrée de l'outil et la transforme en proposition applicable. */
export async function buildProposal(
  input: unknown,
  profile: Profile,
  program: Program | undefined,
): Promise<{ proposal: ProgramProposal | null; report: string }> {
  if (!program) return { proposal: null, report: "Erreur : l'utilisateur n'a pas encore de programme. Invite-le à en créer un dans l'onglet Séance." };
  const obj = input as { resume?: unknown; modifications?: unknown };
  if (!obj || typeof obj.resume !== 'string' || !Array.isArray(obj.modifications)) {
    return { proposal: null, report: 'Erreur : entrée invalide (resume et modifications requis).' };
  }
  const gym = profile.activeGymId ? await db.gyms.get(profile.activeGymId) : undefined;
  const available = new Set<EquipmentKey>([...(gym?.equipment ?? PRESETS.salle), 'poids_du_corps']);
  const changes: ProgramChange[] = [];
  const notes: string[] = [];

  for (const raw of obj.modifications as RawChange[]) {
    const action = raw.action;
    const dayIndex = int(raw.jour, 0, program.days.length - 1);
    if (dayIndex === undefined || !['remplacer', 'ajouter', 'retirer', 'modifier_series'].includes(String(action))) {
      notes.push(`ignorée (jour ou action invalide) : ${JSON.stringify(raw)}`);
      continue;
    }
    const day = program.days[dayIndex];
    const target = typeof raw.exercice_actuel === 'string' ? raw.exercice_actuel : undefined;
    const inDay = target ? day.exercises.find((e) => e.exerciseId === target) : undefined;
    let newId: string | undefined;
    if (action === 'ajouter' || action === 'remplacer') {
      const found = typeof raw.nouvel_exercice === 'string' ? findExerciseByName(raw.nouvel_exercice, available) : undefined;
      if (!found) {
        notes.push(`« ${String(raw.nouvel_exercice)} » introuvable avec le matériel disponible`);
        continue;
      }
      newId = found.id;
    }
    if ((action === 'remplacer' || action === 'retirer' || action === 'modifier_series') && !inDay) {
      notes.push(`exercice « ${String(target)} » absent du jour ${dayIndex}`);
      continue;
    }
    const sets = int(raw.series, 1, 10);
    const repMin = int(raw.reps_min, 1, 50);
    const repMax = int(raw.reps_max, 1, 60);
    let label = '';
    if (action === 'remplacer') label = `${day.name} : ${exerciseName(target!)} → ${exerciseName(newId!)}`;
    if (action === 'ajouter') label = `${day.name} : + ${exerciseName(newId!)}`;
    if (action === 'retirer') label = `${day.name} : − ${exerciseName(target!)}`;
    if (action === 'modifier_series')
      label = `${day.name} : ${exerciseName(target!)} en ${sets ?? inDay!.sets} × ${repMin ?? inDay!.repMin}–${repMax ?? inDay!.repMax}`;
    changes.push({
      action: action as ProgramChange['action'],
      dayIndex,
      targetExerciseId: target,
      newExerciseId: newId,
      sets,
      repMin,
      repMax: repMax !== undefined && repMin !== undefined && repMax < repMin ? repMin : repMax,
      label,
    });
  }

  if (!changes.length) return { proposal: null, report: `Aucune modification applicable. ${notes.join(' ; ')}` };
  return {
    proposal: { summary: obj.resume, changes },
    report: `Proposition affichée à l'utilisateur avec un bouton « Appliquer » (${changes.map((c) => c.label).join(' ; ')}).${
      notes.length ? ` Points ignorés : ${notes.join(' ; ')}.` : ''
    } Explique brièvement pourquoi, sans répéter la liste.`,
  };
}

/** Applique une proposition validée par l'utilisateur au programme actif. */
export async function applyProposal(proposal: ProgramProposal, profile: Profile): Promise<void> {
  if (!profile.activeProgramId) throw new Error('Aucun programme actif');
  const program = await db.programs.get(profile.activeProgramId);
  if (!program) throw new Error('Programme introuvable');
  const next = structuredClone(program);
  for (const c of proposal.changes) {
    const day = next.days[c.dayIndex];
    if (!day) continue;
    const idx = c.targetExerciseId ? day.exercises.findIndex((e) => e.exerciseId === c.targetExerciseId) : -1;
    if (c.action === 'retirer' && idx >= 0) day.exercises.splice(idx, 1);
    if (c.action === 'remplacer' && idx >= 0 && c.newExerciseId) day.exercises[idx] = { ...day.exercises[idx], exerciseId: c.newExerciseId };
    if (c.action === 'ajouter' && c.newExerciseId) {
      const ex = exerciseById(c.newExerciseId);
      const scheme = repScheme('custom', profile.goal, ex);
      day.exercises.push({
        uid: uid(),
        exerciseId: c.newExerciseId,
        ...scheme,
        ...(c.sets ? { sets: c.sets } : {}),
        ...(c.repMin ? { repMin: c.repMin } : {}),
        ...(c.repMax ? { repMax: c.repMax } : {}),
      });
    }
    if (c.action === 'modifier_series' && idx >= 0) {
      const e = day.exercises[idx];
      day.exercises[idx] = { ...e, sets: c.sets ?? e.sets, repMin: c.repMin ?? e.repMin, repMax: c.repMax ?? e.repMax };
    }
  }
  next.updatedAt = Date.now();
  await db.programs.put(next);
}

export type ToolUseBlock = Anthropic.Beta.BetaToolUseBlock;
