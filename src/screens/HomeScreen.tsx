import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronRight, Gauge, Ruler, Scale } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { BodyViewer } from '../components/body/BodyViewer';
import { LineAreaChart } from '../components/LazyCharts';
import { BackgroundGlow, Chip, GlassCard, LargeHeader, NumberField, ProgressBar, SegmentedGlass, Sheet, useToast } from '../components/ui';
import { db } from '../lib/db';
import { exerciseById } from '../lib/exercises';
import { capitalize, dateFromKey, fmt, fmtMax, longDate, relativeDay, shortDate, todayKey, WEEKDAY_NAMES, weekdayMon0 } from '../lib/format';
import { computeHeat, heatColor, lastTrained } from '../lib/heat';
import { logWeight, updateProfile, useActiveProgram, useSessions } from '../lib/hooks';
import { MUSCLE_KEYS, MUSCLES } from '../lib/muscles';
import { bmi, GOAL_ORDER, GOALS } from '../lib/nutrition';
import { nextDayIndex, nextSessionDate } from '../lib/program';
import type { Profile } from '../lib/types';
import { elapsedMs, setsProgress } from '../lib/workout';

const HALOS = [
  { size: 360, right: -140, top: -90, color: 'rgba(255,40,60,0.42)' },
  { size: 300, left: -150, top: 430, color: 'rgba(180,20,40,0.35)' },
];

type EditField = 'taille' | 'poids' | 'objectif' | null;

export function HomeScreen({
  profile,
  onOpenSettings,
  onGoTo,
}: {
  profile: Profile;
  onOpenSettings: () => void;
  onGoTo: (tab: 'seance' | 'alimentation') => void;
}) {
  const sessions = useSessions();
  const program = useActiveProgram(profile);
  const weights = useLiveQuery(() => db.weights.orderBy('date').toArray(), []);
  const [edit, setEdit] = useState<EditField>(null);

  const done = useMemo(() => (sessions ?? []).filter((s) => s.status === 'done'), [sessions]);
  const heat = useMemo(() => {
    const since = Date.now() - 7 * 86400000;
    return computeHeat(
      done.filter((s) => (s.endedAt ?? 0) >= since),
      exerciseById,
    );
  }, [done]);
  const last = useMemo(() => lastTrained(done, exerciseById), [done]);

  const zones = MUSCLE_KEYS.map((k) => ({ k, i: heat[k].intensity, at: last[k] }))
    .filter((z) => z.i > 0.01)
    .sort((a, b) => b.i - a.i)
    .slice(0, 5);

  const initial = (profile.name.trim()[0] ?? 'E').toUpperCase();
  const imc = bmi(profile.weightKg, profile.heightCm);

  const lastSession = [...done].sort((a, b) => (b.endedAt ?? 0) - (a.endedAt ?? 0))[0];
  const nextIdx = program ? nextDayIndex(program, sessions ?? []) : 0;
  const nextDay = program?.days[nextIdx];
  const nextDate = program ? nextSessionDate(program, sessions ?? []) : null;
  const nextLabel = nextDate
    ? todayKey(nextDate) === todayKey()
      ? "Aujourd'hui"
      : capitalize(WEEKDAY_NAMES[weekdayMon0(nextDate)])
    : '';

  // Objectif de poids
  const start = profile.startWeightKg;
  const target = profile.targetWeightKg;
  const span = target - start;
  const progress = span === 0 ? 1 : (profile.weightKg - start) / span;
  const remaining = Math.abs(target - profile.weightKg);
  const reached = span === 0 ? true : span > 0 ? profile.weightKg >= target : profile.weightKg <= target;

  const weightPoints = (weights ?? []).slice(-30).map((w) => ({ label: shortDate(dateFromKey(w.date)), value: w.kg }));

  return (
    <>
      <BackgroundGlow halos={HALOS} />
      <div className="screen">
        <div className="screen-content">
          <LargeHeader
            eyebrow={longDate()}
            title="Accueil"
            right={
              <button className="glass icon-btn" aria-label="Profil et réglages" onClick={onOpenSettings}>
                {initial}
              </button>
            }
          />

          <SegmentedGlass
            ariaLabel="Silhouette"
            options={[
              { value: 'homme', label: 'Homme' },
              { value: 'femme', label: 'Femme' },
            ]}
            value={profile.sex}
            onChange={(sex) => void updateProfile({ sex })}
          />

          <BodyViewer sex={profile.sex} heat={heat} />

          <GlassCard className="card">
            <div className="row-between">
              <h2 className="h2">Zones travaillées</h2>
              <span className="muted" style={{ fontSize: 13 }}>
                Intensité
              </span>
            </div>
            {zones.length === 0 ? (
              <div className="empty">
                Aucun muscle sollicité ces 7 derniers jours.
                <button className="btn-link" onClick={() => onGoTo('seance')}>
                  Lancer une séance
                </button>
              </div>
            ) : (
              zones.map((z) => {
                const c = heatColor(Math.max(z.i, 0.35));
                return (
                  <div className="zone-row" key={z.k}>
                    <div>
                      <div className="body">{MUSCLES[z.k].label}</div>
                      <div className="caption">{z.at ? relativeDay(z.at) : '—'}</div>
                    </div>
                    <ProgressBar value={z.i} color={c} glow={c} />
                    <div className="zone-pct">{Math.round(z.i * 100)} %</div>
                  </div>
                );
              })
            )}
          </GlassCard>

          <div className="grid-3">
            <GlassCard as="button" className="tile" onClick={() => setEdit('taille')} ariaLabel="Modifier la taille">
              <Ruler size={20} className="icon" />
              <span className="caption">Taille</span>
              <span className="tile-value">
                <span className="value">{fmt(profile.heightCm)}</span>
                <span className="tile-unit">cm</span>
              </span>
            </GlassCard>
            <GlassCard as="button" className="tile" onClick={() => setEdit('poids')} ariaLabel="Modifier le poids">
              <Scale size={20} className="icon" />
              <span className="caption">Poids</span>
              <span className="tile-value">
                <span className="value">{fmtMax(profile.weightKg)}</span>
                <span className="tile-unit">kg</span>
              </span>
            </GlassCard>
            <GlassCard className="tile">
              <Gauge size={20} className="icon" />
              <span className="caption">IMC</span>
              <span className="tile-value">
                <span className="value">{fmt(imc, 1)}</span>
              </span>
            </GlassCard>
          </div>

          <GlassCard className="card">
            <div className="grid-2" style={{ gap: 14 }}>
              <button className="stack-sm" style={{ textAlign: 'left' }} onClick={() => onGoTo('seance')}>
                <span className="caption">Dernière séance</span>
                {lastSession ? (
                  <>
                    <span className="body ellipsis">{lastSession.name}</span>
                    <span className="caption">
                      {relativeDay(lastSession.endedAt ?? Date.now())} · {Math.round(elapsedMs(lastSession) / 60000)} min ·{' '}
                      {setsProgress(lastSession).done} séries
                    </span>
                  </>
                ) : (
                  <span className="body muted">Aucune pour l'instant</span>
                )}
              </button>
              <button className="stack-sm" style={{ textAlign: 'left' }} onClick={() => onGoTo('seance')}>
                <span className="caption">Prochaine séance</span>
                {nextDay ? (
                  <>
                    <span className="body ellipsis">{nextDay.name}</span>
                    <span className="caption accent">
                      {nextLabel} · {nextDay.exercises.length} exercices
                    </span>
                  </>
                ) : (
                  <span className="body accent row" style={{ gap: 4 }}>
                    Créer mon programme <ChevronRight size={16} />
                  </span>
                )}
              </button>
            </div>
          </GlassCard>

          <GlassCard className="card">
            <div className="row-between">
              <h2 className="h2">Objectif</h2>
              <span className="accent" style={{ fontSize: 13, fontWeight: 600 }}>
                {GOALS[profile.goal].label}
              </span>
            </div>
            <div className="chips">
              {GOAL_ORDER.map((g) => (
                <Chip key={g} active={profile.goal === g} onClick={() => void updateProfile({ goal: g })}>
                  {GOALS[g].label}
                </Chip>
              ))}
            </div>
            <button className="row-between muted" style={{ fontSize: 13 }} onClick={() => setEdit('objectif')}>
              <span>Départ {fmtMax(start)} kg</span>
              <span>Cible {fmtMax(target)} kg</span>
            </button>
            <ProgressBar value={progress} gradient large />
            <div className="body">
              {reached ? 'Objectif atteint' : `Encore ${fmtMax(remaining)} kg pour atteindre ta cible`}
            </div>
            {weightPoints.length >= 2 && <LineAreaChart data={weightPoints} unit="kg" target={target} />}
            <button className="btn-link" style={{ alignSelf: 'flex-start' }} onClick={() => onGoTo('alimentation')}>
              Voir mon plan calorique
            </button>
          </GlassCard>
        </div>
      </div>

      <EditSheet field={edit} profile={profile} onClose={() => setEdit(null)} />
    </>
  );
}

function EditSheet({ field, profile, onClose }: { field: EditField; profile: Profile; onClose: () => void }) {
  const toast = useToast();
  const [height, setHeight] = useState<number | null>(profile.heightCm);
  const [weight, setWeight] = useState<number | null>(profile.weightKg);
  const [start, setStart] = useState<number | null>(profile.startWeightKg);
  const [target, setTarget] = useState<number | null>(profile.targetWeightKg);

  useEffect(() => {
    if (!field) return;
    setHeight(profile.heightCm);
    setWeight(profile.weightKg);
    setStart(profile.startWeightKg);
    setTarget(profile.targetWeightKg);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [field]);

  const title = field === 'taille' ? 'Taille' : field === 'poids' ? 'Poids du jour' : 'Objectif de poids';

  async function save() {
    if (field === 'taille') {
      if (!height || height < 100 || height > 250) return toast('Taille entre 100 et 250 cm');
      await updateProfile({ heightCm: height });
    } else if (field === 'poids') {
      if (!weight || weight < 30 || weight > 300) return toast('Poids entre 30 et 300 kg');
      await logWeight(weight);
      toast('Poids enregistré');
    } else if (field === 'objectif') {
      if (!start || !target || target < 30 || target > 300) return toast('Vérifie les poids saisis');
      await updateProfile({ startWeightKg: start, targetWeightKg: target });
    }
    onClose();
  }

  return (
    <Sheet
      open={field !== null}
      onClose={onClose}
      title={title}
      footer={
        <button className="btn-primary" onClick={() => void save()}>
          Enregistrer
        </button>
      }
    >
      {field === 'taille' && <NumberField label="Taille" value={height} onChange={setHeight} suffix="cm" inputMode="numeric" />}
      {field === 'poids' && (
        <>
          <NumberField label="Poids" value={weight} onChange={setWeight} suffix="kg" />
          <p className="caption">Pèse-toi idéalement le matin, à jeun, dans les mêmes conditions. L'historique alimente la courbe de l'objectif.</p>
        </>
      )}
      {field === 'objectif' && (
        <>
          <NumberField label="Poids de départ" value={start} onChange={setStart} suffix="kg" />
          <NumberField label="Poids cible" value={target} onChange={setTarget} suffix="kg" />
          <p className="caption">Le poids cible sert aussi au calcul des calories dans l'onglet Alimentation.</p>
        </>
      )}
    </Sheet>
  );
}
