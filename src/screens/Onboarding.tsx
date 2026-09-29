import { useState } from 'react';
import { Chip, Field, NumberField, SegmentedGlass, useToast } from '../components/ui';
import { db, requestPersistence } from '../lib/db';
import { todayKey } from '../lib/format';
import { DEFAULT_PROFILE, updateProfile } from '../lib/hooks';
import { ACTIVITY, GOAL_ORDER, GOALS } from '../lib/nutrition';
import type { ActivityLevel, Goal, Level, Sex } from '../lib/types';

// Premier lancement : les infos indispensables aux calculs.

export function Onboarding() {
  const toast = useToast();
  const [name, setName] = useState('');
  const [sex, setSex] = useState<Sex>('homme');
  const [age, setAge] = useState<number | null>(28);
  const [height, setHeight] = useState<number | null>(178);
  const [weight, setWeight] = useState<number | null>(74);
  const [target, setTarget] = useState<number | null>(78);
  const [goal, setGoal] = useState<Goal>('masse');
  const [level, setLevel] = useState<Level>('intermediaire');
  const [activity, setActivity] = useState<ActivityLevel>('modere');

  async function start() {
    if (!age || age < 12 || age > 100) return toast('Indique un âge valide');
    if (!height || height < 100 || height > 250) return toast('Indique une taille valide (cm)');
    if (!weight || weight < 30 || weight > 300) return toast('Indique un poids valide (kg)');
    if (!target || target < 30 || target > 300) return toast('Indique un poids cible valide (kg)');
    await updateProfile({
      ...DEFAULT_PROFILE,
      name: name.trim(),
      sex,
      birthYear: new Date().getFullYear() - age,
      heightCm: height,
      weightKg: weight,
      startWeightKg: weight,
      targetWeightKg: target,
      goal,
      level,
      activity,
      onboarded: true,
      createdAt: Date.now(),
    });
    await db.weights.put({ date: todayKey(), kg: weight });
    void requestPersistence();
  }

  return (
    <div className="screen">
      <div className="screen-content" style={{ paddingBottom: 'calc(40px + var(--safe-bottom))' }}>
        <header style={{ paddingTop: 24 }}>
          <div className="eyebrow">Bienvenue</div>
          <h1 className="large-title">Altius</h1>
          <p className="muted" style={{ fontSize: 15, marginTop: 8 }}>
            Quelques infos pour calculer tes besoins et tes charges. Tout reste sur ton téléphone.
          </p>
        </header>
        <div className="glass card card-lg">
          <Field label="Prénom">
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Facultatif" />
          </Field>
          <SegmentedGlass
            options={[
              { value: 'homme', label: 'Homme' },
              { value: 'femme', label: 'Femme' },
            ]}
            value={sex}
            onChange={setSex}
          />
          <div className="grid-2">
            <NumberField label="Âge" value={age} onChange={setAge} suffix="ans" inputMode="numeric" />
            <NumberField label="Taille" value={height} onChange={setHeight} suffix="cm" inputMode="numeric" />
            <NumberField label="Poids actuel" value={weight} onChange={setWeight} suffix="kg" />
            <NumberField label="Poids cible" value={target} onChange={setTarget} suffix="kg" />
          </div>
          <div className="field">
            <span className="field-label">Objectif</span>
            <div className="chips">
              {GOAL_ORDER.map((g) => (
                <Chip key={g} active={goal === g} onClick={() => setGoal(g)}>
                  {GOALS[g].label}
                </Chip>
              ))}
            </div>
          </div>
          <div className="field">
            <span className="field-label">Niveau en musculation</span>
            <div className="chips">
              {(
                [
                  ['debutant', 'Débutant'],
                  ['intermediaire', 'Intermédiaire'],
                  ['avance', 'Avancé'],
                ] as [Level, string][]
              ).map(([k, l]) => (
                <Chip key={k} active={level === k} onClick={() => setLevel(k)}>
                  {l}
                </Chip>
              ))}
            </div>
          </div>
          <Field label="Niveau d’activité">
            <select className="select" value={activity} onChange={(e) => setActivity(e.target.value as ActivityLevel)}>
              {(Object.keys(ACTIVITY) as ActivityLevel[]).map((a) => (
                <option key={a} value={a}>
                  {ACTIVITY[a].label} — {ACTIVITY[a].hint}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <button className="btn-primary" onClick={() => void start()}>
          C’est parti
        </button>
      </div>
    </div>
  );
}
