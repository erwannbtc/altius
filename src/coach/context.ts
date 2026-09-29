import { db } from '../lib/db';
import { exerciseById, exerciseName } from '../lib/exercises';
import { EQUIPMENT_LABEL } from '../lib/equipment';
import { fmtMax, todayKey, WEEKDAY_NAMES } from '../lib/format';
import { computeHeat } from '../lib/heat';
import { MUSCLE_KEYS, MUSCLES } from '../lib/muscles';
import { ACTIVITY, computePlan, DIETS, GOALS, PACES, sumEntries } from '../lib/nutrition';
import { MEAL_LABEL } from '../lib/food';
import { nextDayIndex } from '../lib/program';
import { DEFAULT_PROFILE } from '../lib/hooks';
import type { Profile, Program } from '../lib/types';
import { elapsedMs } from '../lib/workout';

// Contexte injecté à chaque question : les données de l'utilisateur et les chiffres
// déjà calculés par l'app (le modèle ne recalcule rien).

const LEVEL = { debutant: 'débutant', intermediaire: 'intermédiaire', avance: 'avancé' } as const;

export interface CoachContext {
  text: string;
  profile: Profile;
  program: Program | undefined;
}

export async function buildContext(compact = false): Promise<CoachContext> {
  const profile = (await db.profile.get('me')) ?? DEFAULT_PROFILE;
  const plan = computePlan(profile);
  const program = profile.activeProgramId ? await db.programs.get(profile.activeProgramId) : undefined;
  const gym = profile.activeGymId ? await db.gyms.get(profile.activeGymId) : undefined;
  const today = todayKey();
  const meals = await db.meals.where('date').equals(today).toArray();
  const totals = sumEntries(meals);
  const sessions = await db.sessions.orderBy('date').toArray();
  const done = sessions.filter((s) => s.status === 'done').sort((a, b) => (b.endedAt ?? 0) - (a.endedAt ?? 0));
  const heat = computeHeat(
    done.filter((s) => (s.endedAt ?? 0) > Date.now() - 7 * 86400000),
    exerciseById,
  );
  const states = await db.exerciseStates.toArray();
  const stateById = new Map(states.map((s) => [s.exerciseId, s]));

  const L: string[] = [];
  L.push(`<contexte date="${today}">`);
  L.push('## Profil');
  L.push(
    `${profile.name || 'Utilisateur'} · ${profile.sex} · ${plan.age} ans · ${profile.heightCm} cm · ${fmtMax(profile.weightKg)} kg · IMC ${plan.currentBmi.toFixed(1)} · niveau ${LEVEL[profile.level]} · activité : ${ACTIVITY[profile.activity].label}`,
  );
  L.push('## Objectif');
  L.push(
    `${GOALS[profile.goal].label} · départ ${fmtMax(profile.startWeightKg)} kg → cible ${fmtMax(profile.targetWeightKg)} kg (${plan.direction}) · rythme ${PACES[profile.pace].label}${
      plan.direction !== 'maintien' ? ` (${fmtMax(plan.weeklyRateKg, 2)} kg/sem)` : ''
    }${plan.eta ? ` · date estimée ${plan.eta.toLocaleDateString('fr-FR')}` : ''}`,
  );
  L.push("## Nutrition (valeurs calculées par l'app)");
  L.push(
    `Métabolisme de base ${plan.bmr} kcal · dépense totale ${plan.tdee} kcal · calories recommandées ${plan.recommendedKcal} kcal · objectif actif ${plan.targetKcal} kcal${plan.isOverride ? ' (réglé à la main)' : ''}`,
  );
  L.push(
    `Régime : ${DIETS[profile.diet].label} (P ${plan.split.p} % / G ${plan.split.c} % / L ${plan.split.f} %) · cibles : protéines ${plan.macros.protein} g, glucides ${plan.macros.carbs} g, lipides ${plan.macros.fat} g`,
  );
  if (plan.warnings.length) L.push(`Alertes : ${plan.warnings.map((w) => w.text).join(' | ')}`);
  L.push("## Alimentation d'aujourd'hui");
  L.push(
    `Consommé : ${Math.round(totals.kcal)} kcal · P ${Math.round(totals.protein)} g · G ${Math.round(totals.carbs)} g · L ${Math.round(totals.fat)} g (reste ${Math.round(plan.targetKcal - totals.kcal)} kcal)`,
  );
  if (meals.length && !compact) {
    for (const m of meals) L.push(`- ${MEAL_LABEL[m.meal]} : ${m.name}, ${m.grams} g, ${m.kcal} kcal`);
  }
  L.push('## Salle');
  L.push(gym ? `${gym.name} (${gym.kind}) : ${gym.equipment.map((k) => EQUIPMENT_LABEL[k]).join(', ')}` : 'Aucun profil de salle (salle complète supposée)');
  L.push('## Programme');
  if (program) {
    const next = nextDayIndex(program, sessions);
    L.push(
      `${program.name} · jours : ${program.weekdays.map((d) => WEEKDAY_NAMES[d]).join(', ')} · prochaine séance : jour ${next} (${program.days[next]?.name})`,
    );
    program.days.forEach((d, i) => {
      L.push(`Jour ${i} — ${d.name}`);
      for (const pe of d.exercises) {
        const st = stateById.get(pe.exerciseId);
        L.push(
          `  - [${pe.exerciseId}] ${exerciseName(pe.exerciseId)} : ${pe.sets}×${pe.repMin}-${pe.repMax}, repos ${pe.restSec}s${st ? `, charge prévue ${fmtMax(st.load)} kg${st.failures ? `, ${st.failures} échec(s)` : ''}` : ''}`,
        );
      }
    });
  } else {
    L.push('Aucun programme créé.');
  }
  L.push('## Dernières séances');
  if (!done.length) L.push('Aucune séance terminée.');
  for (const s of done.slice(0, compact ? 2 : 5)) {
    L.push(`${s.date} — ${s.name} (${Math.round(elapsedMs(s) / 60000)} min)`);
    for (const se of s.exercises) {
      const sets = se.sets.filter((x) => x.done);
      if (!sets.length) continue;
      const res = s.progression?.find((r) => r.exerciseId === se.exerciseId);
      L.push(
        `  - ${exerciseName(se.exerciseId)} (cible ${se.repMin}-${se.repMax}) : ${sets
          .map((x) => `${x.reps}×${fmtMax(x.load ?? 0)}kg${x.rpe ? ` RPE ${x.rpe}` : ''}`)
          .join(', ')}${res ? ` → ${res.message}` : ''}`,
      );
    }
  }
  L.push('## Carte musculaire (7 derniers jours, 0-100 %)');
  const hot = MUSCLE_KEYS.map((k) => `${MUSCLES[k].label} ${Math.round(heat[k].intensity * 100)} %`);
  L.push(hot.join(' · '));
  L.push('</contexte>');
  return { text: L.join('\n'), profile, program };
}
