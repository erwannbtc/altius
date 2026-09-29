import { useLiveQuery } from 'dexie-react-hooks';
import { AlertTriangle, ChevronLeft, ChevronRight, Info, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { BarsChart } from '../components/LazyCharts';
import { FoodSheet } from '../components/nutrition/FoodSheet';
import { CalorieRing, CalorieStepper, DietSplitBar, MacroRow } from '../components/nutrition/NutritionParts';
import { Alert, BackgroundGlow, Chip, Field, GlassCard, LargeHeader, NumberField, Sheet, useToast } from '../components/ui';
import { db } from '../lib/db';
import { MEALS, removeEntry, updateEntryGrams } from '../lib/food';
import { addDays, capitalize, dateFromKey, fmt, fmtMax, fullDate, longDate, shortDate, todayKey } from '../lib/format';
import { updateProfile } from '../lib/hooks';
import { ACTIVITY, computePlan, DIET_ORDER, DIETS, PACES, sumEntries } from '../lib/nutrition';
import type { ActivityLevel, MealEntry, MealKey, Pace, Profile } from '../lib/types';

const HALOS = [
  { size: 380, left: -120, top: -120, color: 'rgba(255,40,60,0.38)' },
  { size: 300, right: -160, top: 520, color: 'rgba(180,20,40,0.32)' },
];

export function NutritionScreen({ profile }: { profile: Profile }) {
  const [date, setDate] = useState(todayKey());
  const [foodMeal, setFoodMeal] = useState<MealKey | null>(null);
  const [openMeal, setOpenMeal] = useState<MealKey | null>(null);
  const [planOpen, setPlanOpen] = useState(false);
  const entries = useLiveQuery(() => db.meals.where('date').equals(date).toArray(), [date]);
  const week = useLiveQuery(async () => {
    const from = todayKey(addDays(new Date(), -6));
    return db.meals.where('date').between(from, todayKey(), true, true).toArray();
  }, []);

  const plan = useMemo(() => computePlan(profile), [profile]);
  const totals = sumEntries(entries ?? []);
  const isToday = date === todayKey();
  const pct = plan.targetKcal ? Math.round((totals.kcal / plan.targetKcal) * 100) : 0;

  const weekData = useMemo(() => {
    const byDay = new Map<string, number>();
    for (const e of week ?? []) byDay.set(e.date, (byDay.get(e.date) ?? 0) + e.kcal);
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(new Date(), i - 6);
      return { label: d.toLocaleDateString('fr-FR', { weekday: 'narrow' }), value: Math.round(byDay.get(todayKey(d)) ?? 0) };
    });
  }, [week]);

  const byMeal = (m: MealKey) => (entries ?? []).filter((e) => e.meal === m);

  return (
    <>
      <BackgroundGlow halos={HALOS} />
      <div className="screen">
        <div className="screen-content">
          <LargeHeader
            eyebrow={isToday ? "Aujourd'hui" : longDate(dateFromKey(date))}
            title="Alimentation"
            right={
              <div className="row" style={{ gap: 6 }}>
                <button className="glass icon-btn sm" aria-label="Jour précédent" onClick={() => setDate(todayKey(addDays(dateFromKey(date), -1)))}>
                  <ChevronLeft size={18} />
                </button>
                <button
                  className="glass icon-btn sm"
                  aria-label="Jour suivant"
                  disabled={isToday}
                  onClick={() => setDate(todayKey(addDays(dateFromKey(date), 1)))}
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            }
          />

          <GlassCard className="card card-lg" style={{ padding: '22px 18px 18px', gap: 18, alignItems: 'stretch' }}>
            <CalorieRing consumed={totals.kcal} target={plan.targetKcal} />
            <div className="cal-stats">
              <div>
                <div className="caption">Consommé</div>
                <div className="value">{fmt(totals.kcal)} kcal</div>
              </div>
              <div>
                <div className="caption">Progression</div>
                <div className="value">{fmt(pct)} %</div>
              </div>
            </div>
            <CalorieStepper
              value={plan.targetKcal}
              recommended={plan.recommendedKcal}
              isOverride={plan.isOverride}
              onChange={(v) => void updateProfile({ calorieOverride: v })}
              onReset={() => void updateProfile({ calorieOverride: null })}
            />
          </GlassCard>

          <GlassCard className="card">
            <h2 className="h2">Macronutriments</h2>
            <MacroRow name="Protéines" color="#FF3B47" value={totals.protein} target={plan.macros.protein} />
            <MacroRow name="Glucides" color="#FF9AA0" value={totals.carbs} target={plan.macros.carbs} />
            <MacroRow name="Lipides" color="#8E1622" value={totals.fat} target={plan.macros.fat} />
          </GlassCard>

          <GlassCard className="card">
            <div className="row-between">
              <h2 className="h2">Mon alimentation</h2>
              <span className="muted" style={{ fontSize: 13 }}>
                Répartition
              </span>
            </div>
            <div className="chips">
              {DIET_ORDER.map((d) => (
                <Chip key={d} active={profile.diet === d} onClick={() => void updateProfile({ diet: d })}>
                  {DIETS[d].label}
                </Chip>
              ))}
            </div>
            <DietSplitBar p={plan.split.p} c={plan.split.c} f={plan.split.f} />
            <p className="caption" style={{ margin: 0 }}>
              {DIETS[profile.diet].hint} · protéines {fmtMax(plan.proteinPerKg)} g/kg
              {profile.diet === 'cetogene' ? ` · glucides plafonnés à ${plan.macros.carbs} g` : ''}
            </p>
          </GlassCard>

          <PlanCard profile={profile} onEdit={() => setPlanOpen(true)} />

          <div className="section-title">
            <h2 className="h2-large">Repas du jour</h2>
          </div>
          {MEALS.map((m) => {
            const list = byMeal(m.key);
            const kcal = list.reduce((a, e) => a + e.kcal, 0);
            const open = openMeal === m.key;
            return (
              <GlassCard key={m.key} className="ex-card" radius={22}>
                <div className="ex-head" style={{ padding: '14px 14px 14px 16px' }}>
                  <button className="grow" style={{ textAlign: 'left' }} onClick={() => setOpenMeal(open ? null : m.key)} aria-expanded={open}>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>{m.label}</div>
                    <div className="caption ellipsis" style={{ fontSize: 13 }}>
                      {list.length ? list.map((e) => e.name.split(' · ')[0]).join(', ') : 'Rien pour l’instant'}
                    </div>
                  </button>
                  <span className="num" style={{ fontSize: 15, fontWeight: 600 }}>
                    {list.length ? `${fmt(kcal)} kcal` : '—'}
                  </span>
                  <button className="icon-btn sm soft" aria-label={`Ajouter au ${m.label}`} onClick={() => setFoodMeal(m.key)}>
                    <Plus size={20} />
                  </button>
                </div>
                {open && list.length > 0 && (
                  <div className="meal-entries">
                    {list.map((e) => (
                      <EntryRow key={e.id} entry={e} />
                    ))}
                  </div>
                )}
              </GlassCard>
            );
          })}

          <GlassCard className="card">
            <div className="row-between">
              <h2 className="h2">7 derniers jours</h2>
              <span className="muted" style={{ fontSize: 13 }}>
                Cible {fmt(plan.targetKcal)} kcal
              </span>
            </div>
            <BarsChart data={weekData} unit="kcal" target={plan.targetKcal} />
          </GlassCard>
        </div>
      </div>

      <FoodSheet open={foodMeal !== null} meal={foodMeal ?? 'dejeuner'} date={date} onClose={() => setFoodMeal(null)} />
      <PlanSheet open={planOpen} profile={profile} onClose={() => setPlanOpen(false)} />
    </>
  );
}

function EntryRow({ entry }: { entry: MealEntry }) {
  const [editing, setEditing] = useState(false);
  const [grams, setGrams] = useState<number | null>(entry.grams);
  return (
    <div className="meal-entry">
      <div className="grow">
        <div className="ellipsis" style={{ fontWeight: 600 }}>
          {entry.name}
        </div>
        {editing ? (
          <div className="row" style={{ marginTop: 6 }}>
            <div style={{ width: 120 }}>
              <NumberField value={grams} onChange={setGrams} suffix="g" />
            </div>
            <button
              className="btn-link"
              onClick={() => {
                if (grams && grams > 0) void updateEntryGrams(entry, grams);
                setEditing(false);
              }}
            >
              OK
            </button>
          </div>
        ) : (
          <button className="caption" onClick={() => setEditing(true)}>
            {fmt(entry.grams)} g · P {fmtMax(entry.protein)} · G {fmtMax(entry.carbs)} · L {fmtMax(entry.fat)} — modifier
          </button>
        )}
      </div>
      <span className="num" style={{ fontWeight: 600 }}>
        {fmt(entry.kcal)}
      </span>
      <button className="round-btn" style={{ width: 34, height: 34 }} aria-label={`Supprimer ${entry.name}`} onClick={() => entry.id && void removeEntry(entry.id)}>
        <Trash2 size={15} />
      </button>
    </div>
  );
}

function PlanCard({ profile, onEdit }: { profile: Profile; onEdit: () => void }) {
  const plan = computePlan(profile);
  const rate =
    plan.direction === 'maintien'
      ? 'Maintien du poids'
      : `${plan.direction === 'perte' ? '−' : '+'}${fmtMax(plan.weeklyRateKg, 2)} kg/sem (${fmtMax(plan.weeklyRatePct, 2)} %)`;
  return (
    <GlassCard className="card">
      <div className="row-between">
        <h2 className="h2">Objectif de poids</h2>
        <button className="btn-link" onClick={onEdit}>
          Modifier
        </button>
      </div>
      <div className="stat-grid">
        <div className="stat">
          <span className="caption">Actuel → cible</span>
          <span className="value">
            {fmtMax(profile.weightKg)} → {fmtMax(profile.targetWeightKg)} kg
          </span>
        </div>
        <div className="stat">
          <span className="caption">Rythme</span>
          <span className="value" style={{ fontSize: 16 }}>
            {rate}
          </span>
        </div>
        <div className="stat">
          <span className="caption">Métabolisme de base</span>
          <span className="value">{fmt(plan.bmr)} kcal</span>
        </div>
        <div className="stat">
          <span className="caption">Dépense totale</span>
          <span className="value">{fmt(plan.tdee)} kcal</span>
        </div>
        <div className="stat">
          <span className="caption">Calories recommandées</span>
          <span className="value accent">{fmt(plan.recommendedKcal)} kcal</span>
        </div>
        <div className="stat">
          <span className="caption">Date estimée</span>
          <span className="value" style={{ fontSize: 16 }}>
            {plan.eta ? fullDate(plan.eta) : '—'}
          </span>
        </div>
      </div>
      {plan.weeksToGoal !== null && (
        <p className="caption" style={{ margin: 0 }}>
          Environ {Math.ceil(plan.weeksToGoal)} semaines · {plan.dailyDelta > 0 ? '+' : ''}
          {fmt(plan.dailyDelta)} kcal/jour par rapport à ta dépense · {ACTIVITY[profile.activity].label.toLowerCase()}
        </p>
      )}
      {plan.warnings.map((w, i) => (
        <Alert key={i} level={w.level} icon={w.level === 'info' ? <Info size={16} /> : <AlertTriangle size={16} />}>
          {w.text}
        </Alert>
      ))}
    </GlassCard>
  );
}

function PlanSheet({ open, profile, onClose }: { open: boolean; profile: Profile; onClose: () => void }) {
  const toast = useToast();
  const [target, setTarget] = useState<number | null>(profile.targetWeightKg);
  const [weight, setWeight] = useState<number | null>(profile.weightKg);
  const [age, setAge] = useState<number | null>(new Date().getFullYear() - profile.birthYear);
  const [activity, setActivity] = useState<ActivityLevel>(profile.activity);
  const [pace, setPace] = useState<Pace>(profile.pace);

  useEffect(() => {
    if (!open) return;
    setTarget(profile.targetWeightKg);
    setWeight(profile.weightKg);
    setAge(new Date().getFullYear() - profile.birthYear);
    setActivity(profile.activity);
    setPace(profile.pace);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const preview = useMemo(
    () =>
      computePlan({
        ...profile,
        targetWeightKg: target ?? profile.targetWeightKg,
        weightKg: weight ?? profile.weightKg,
        birthYear: new Date().getFullYear() - (age ?? 30),
        activity,
        pace,
        calorieOverride: null,
      }),
    [profile, target, weight, age, activity, pace],
  );

  async function save() {
    if (!target || target < 30 || target > 300) return toast('Poids cible invalide');
    if (!weight || weight < 30 || weight > 300) return toast('Poids actuel invalide');
    if (!age || age < 12 || age > 100) return toast('Âge invalide');
    await updateProfile({
      targetWeightKg: target,
      weightKg: weight,
      birthYear: new Date().getFullYear() - age,
      activity,
      pace,
      calorieOverride: null,
    });
    toast('Objectif mis à jour');
    onClose();
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Objectif de poids"
      footer={
        <button className="btn-primary" onClick={() => void save()}>
          Appliquer ({fmt(preview.recommendedKcal)} kcal)
        </button>
      }
    >
      <div className="grid-2">
        <NumberField label="Poids actuel" value={weight} onChange={setWeight} suffix="kg" />
        <NumberField label="Poids cible" value={target} onChange={setTarget} suffix="kg" />
      </div>
      <NumberField label="Âge" value={age} onChange={setAge} suffix="ans" inputMode="numeric" />
      <Field label="Niveau d’activité">
        <select className="select" value={activity} onChange={(e) => setActivity(e.target.value as ActivityLevel)}>
          {(Object.keys(ACTIVITY) as ActivityLevel[]).map((a) => (
            <option key={a} value={a}>
              {ACTIVITY[a].label} — {ACTIVITY[a].hint}
            </option>
          ))}
        </select>
      </Field>
      <div className="field">
        <span className="field-label">Rythme</span>
        <div className="chips">
          {(Object.keys(PACES) as Pace[]).map((p) => (
            <Chip key={p} active={pace === p} onClick={() => setPace(p)}>
              {PACES[p].label} · {preview.direction === 'prise' ? PACES[p].gain : PACES[p].loss} %
            </Chip>
          ))}
        </div>
        <span className="caption">
          Perte saine : 0,5 à 1 % du poids par semaine · prise : 0,25 à 0,5 %.
        </span>
      </div>
      <GlassCard className="card" style={{ borderRadius: 20 }}>
        <div className="stat-grid">
          <div className="stat">
            <span className="caption">Métabolisme de base</span>
            <span className="value">{fmt(preview.bmr)}</span>
          </div>
          <div className="stat">
            <span className="caption">Dépense totale</span>
            <span className="value">{fmt(preview.tdee)}</span>
          </div>
          <div className="stat">
            <span className="caption">Calories cibles</span>
            <span className="value accent">{fmt(preview.recommendedKcal)}</span>
          </div>
          <div className="stat">
            <span className="caption">Atteinte estimée</span>
            <span className="value" style={{ fontSize: 16 }}>
              {preview.eta ? capitalize(shortDate(preview.eta)) + ' ' + preview.eta.getFullYear() : 'Maintien'}
            </span>
          </div>
        </div>
      </GlassCard>
      {preview.warnings
        .filter((w) => w.level !== 'info' || !w.text.startsWith('Cétogène'))
        .map((w, i) => (
          <Alert key={i} level={w.level} icon={w.level === 'info' ? <Info size={16} /> : <AlertTriangle size={16} />}>
            {w.text}
          </Alert>
        ))}
      <p className="caption">
        Calcul : Mifflin-St Jeor × facteur d’activité, ± le déficit/surplus du rythme choisi (1 kg ≈ 7 700 kcal). Ce sont des estimations :
        ajuste selon l’évolution réelle de ton poids sur 2 à 3 semaines.
      </p>
    </Sheet>
  );
}
