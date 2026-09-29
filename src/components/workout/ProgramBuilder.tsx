import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowDown, ArrowUp, Plus, RefreshCw, Trash2, Wand2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { db, uid } from '../../lib/db';
import { EQUIPMENT_LABEL, PRESETS } from '../../lib/equipment';
import { exerciseById, exerciseName } from '../../lib/exercises';
import { WEEKDAY_LETTERS } from '../../lib/format';
import { updateProfile } from '../../lib/hooks';
import { DEFAULT_WEEKDAYS, estimateMinutes, generateProgram, repScheme, SPLIT_ORDER, SPLITS } from '../../lib/program';
import type { EquipmentKey, Exercise, Profile, Program, ProgramExercise, SplitKey } from '../../lib/types';
import { Chip, Field, Sheet, useToast } from '../ui';
import { ExerciseLibrarySheet } from './ExerciseLibrary';

// Construction du programme : nombre de séances, split, génération puis édition libre.

export function ProgramBuilderSheet({
  open,
  onClose,
  profile,
  program,
}: {
  open: boolean;
  onClose: () => void;
  profile: Profile;
  program: Program | undefined;
}) {
  const toast = useToast();
  const gyms = useLiveQuery(() => db.gyms.toArray(), []);
  const [gymId, setGymId] = useState<string | null>(profile.activeGymId);
  const [split, setSplit] = useState<SplitKey>(program?.split ?? 'upperlower');
  const [days, setDays] = useState(program?.daysPerWeek ?? 4);
  const [draft, setDraft] = useState<Program | null>(program ?? null);
  const [picker, setPicker] = useState<{ dayIdx: number; replaceUid?: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    setGymId(profile.activeGymId);
    setSplit(program?.split ?? 'upperlower');
    setDays(program?.daysPerWeek ?? 4);
    setDraft(program ? structuredClone(program) : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const gym = gyms?.find((g) => g.id === gymId);
  const equipment: EquipmentKey[] = gym?.equipment ?? PRESETS.salle;
  const s = SPLITS[split];

  function generate() {
    const d = Math.min(s.maxDays, Math.max(s.minDays, days));
    const p = generateProgram({ split, daysPerWeek: d, equipment, gymId, goal: profile.goal, level: profile.level });
    if (draft) p.id = draft.id;
    setDraft(p);
    setDays(d);
  }

  function patchDay(dayIdx: number, fn: (list: ProgramExercise[]) => ProgramExercise[]) {
    if (!draft) return;
    const next = structuredClone(draft);
    next.days[dayIdx].exercises = fn(next.days[dayIdx].exercises);
    setDraft(next);
  }

  function onPicked(ex: Exercise) {
    if (!picker || !draft) return;
    const scheme = repScheme('custom', profile.goal, ex);
    patchDay(picker.dayIdx, (list) =>
      picker.replaceUid
        ? list.map((pe) => (pe.uid === picker.replaceUid ? { ...pe, exerciseId: ex.id } : pe))
        : [...list, { uid: uid(), exerciseId: ex.id, ...scheme }],
    );
    setPicker(null);
  }

  async function save() {
    if (!draft) return;
    const p: Program = {
      ...draft,
      gymId,
      name: draft.name || `${s.label} · ${draft.weekdays.length} j/sem`,
      daysPerWeek: draft.weekdays.length || days,
      updatedAt: Date.now(),
    };
    await db.programs.put(p);
    await updateProfile({ activeProgramId: p.id, ...(gymId ? { activeGymId: gymId } : {}) });
    toast('Programme enregistré');
    onClose();
  }

  return (
    <>
      <Sheet
        open={open}
        onClose={onClose}
        full
        title={program ? 'Mon programme' : 'Créer mon programme'}
        footer={
          draft ? (
            <button className="btn-primary" onClick={() => void save()}>
              Enregistrer le programme
            </button>
          ) : undefined
        }
      >
        <Field label="Profil de salle">
          <select className="select" value={gymId ?? ''} onChange={(e) => setGymId(e.target.value || null)}>
            <option value="">Salle complète (par défaut)</option>
            {(gyms ?? []).map((g) => (
              <option key={g.id} value={g.id}>
                {g.name} · {g.kind === 'maison' ? 'maison' : 'salle'}
              </option>
            ))}
          </select>
        </Field>
        <p className="caption" style={{ margin: '-6px 0 0' }}>
          Matériel : {equipment.map((k) => EQUIPMENT_LABEL[k]).join(', ')}
        </p>

        <div className="field">
          <span className="field-label">Organisation (split)</span>
          <div className="chips">
            {SPLIT_ORDER.map((k) => (
              <Chip
                key={k}
                active={split === k}
                onClick={() => {
                  setSplit(k);
                  setDays(Math.min(SPLITS[k].maxDays, Math.max(SPLITS[k].minDays, days)));
                }}
              >
                {SPLITS[k].label}
              </Chip>
            ))}
          </div>
          <span className="caption">{s.hint}</span>
        </div>

        <div className="field">
          <span className="field-label">Séances par semaine</span>
          <div className="chips">
            {[2, 3, 4, 5, 6].map((n) => (
              <Chip key={n} active={days === n} onClick={() => setDays(n)}>
                {n}
              </Chip>
            ))}
          </div>
          {(days < s.minDays || days > s.maxDays) && (
            <span className="caption accent">
              {s.label} : {s.minDays} à {s.maxDays} séances conseillées — ajusté à la génération.
            </span>
          )}
        </div>

        <button className="btn-secondary full" onClick={generate}>
          <Wand2 size={18} /> {draft ? 'Régénérer une proposition' : 'Générer une proposition'}
        </button>

        {draft && (
          <>
            <Field label="Nom du programme">
              <input className="input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </Field>
            <div className="field">
              <span className="field-label">Jours d’entraînement</span>
              <div className="row" style={{ gap: 6 }}>
                {WEEKDAY_LETTERS.map((l, i) => {
                  const on = draft.weekdays.includes(i);
                  return (
                    <button
                      key={i}
                      className={`chip ${on ? 'is-active' : ''}`}
                      style={{ width: 40, padding: 0, justifyContent: 'center' }}
                      onClick={() => {
                        const w = on ? draft.weekdays.filter((x) => x !== i) : [...draft.weekdays, i].sort();
                        setDraft({ ...draft, weekdays: w });
                      }}
                      aria-pressed={on}
                    >
                      {l}
                    </button>
                  );
                })}
              </div>
              <span className="caption">
                Les séances s’enchaînent dans l’ordre ({draft.days.map((d) => d.name).join(' → ')}), puis recommencent.
                {draft.weekdays.length === 0 && ' Choisis au moins un jour.'}
              </span>
              {draft.weekdays.length !== days && draft.weekdays.length > 0 && (
                <button className="btn-link" style={{ alignSelf: 'flex-start' }} onClick={() => setDraft({ ...draft, weekdays: DEFAULT_WEEKDAYS[days] })}>
                  Répartir {days} séances automatiquement
                </button>
              )}
            </div>

            {draft.days.map((day, di) => (
              <div key={day.uid} className="glass card" style={{ borderRadius: 22 }}>
                <div className="row-between">
                  <input
                    className="input"
                    style={{ height: 40, fontSize: 17, fontWeight: 700, background: 'transparent', border: 0, padding: 0 }}
                    value={day.name}
                    onChange={(e) => {
                      const next = structuredClone(draft);
                      next.days[di].name = e.target.value;
                      setDraft(next);
                    }}
                    aria-label="Nom de la séance"
                  />
                  <span className="caption" style={{ whiteSpace: 'nowrap' }}>
                    ~{estimateMinutes(day)} min
                  </span>
                </div>
                <div className="program-day">
                  {day.exercises.map((pe, ei) => (
                    <div key={pe.uid} className="program-ex">
                      <div className="stack-sm" style={{ gap: 2 }}>
                        <button aria-label="Monter" disabled={ei === 0} onClick={() => patchDay(di, (l) => swap(l, ei, ei - 1))}>
                          <ArrowUp size={14} />
                        </button>
                        <button aria-label="Descendre" disabled={ei === day.exercises.length - 1} onClick={() => patchDay(di, (l) => swap(l, ei, ei + 1))}>
                          <ArrowDown size={14} />
                        </button>
                      </div>
                      <div className="grow">
                        <div className="body ellipsis" style={{ fontSize: 14 }}>
                          {exerciseName(pe.exerciseId)}
                        </div>
                        <div className="row" style={{ gap: 6, marginTop: 6, fontSize: 13 }}>
                          <input
                            className="mini-input"
                            inputMode="numeric"
                            value={pe.sets}
                            aria-label="Séries"
                            onChange={(e) => patchDay(di, (l) => l.map((x) => (x.uid === pe.uid ? { ...x, sets: clampInt(e.target.value, 1, 10) } : x)))}
                          />
                          <span className="muted">×</span>
                          <input
                            className="mini-input"
                            inputMode="numeric"
                            value={pe.repMin}
                            aria-label="Répétitions minimum"
                            onChange={(e) => patchDay(di, (l) => l.map((x) => (x.uid === pe.uid ? { ...x, repMin: clampInt(e.target.value, 1, 50) } : x)))}
                          />
                          <span className="muted">–</span>
                          <input
                            className="mini-input"
                            inputMode="numeric"
                            value={pe.repMax}
                            aria-label="Répétitions maximum"
                            onChange={(e) => patchDay(di, (l) => l.map((x) => (x.uid === pe.uid ? { ...x, repMax: clampInt(e.target.value, 1, 60) } : x)))}
                          />
                          <span className="muted">reps</span>
                        </div>
                      </div>
                      <button className="round-btn" style={{ width: 34, height: 34 }} aria-label="Remplacer" onClick={() => setPicker({ dayIdx: di, replaceUid: pe.uid })}>
                        <RefreshCw size={14} />
                      </button>
                      <button className="round-btn" style={{ width: 34, height: 34 }} aria-label="Retirer" onClick={() => patchDay(di, (l) => l.filter((x) => x.uid !== pe.uid))}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  <button className="btn-link" style={{ alignSelf: 'flex-start' }} onClick={() => setPicker({ dayIdx: di })}>
                    <Plus size={14} style={{ verticalAlign: -2 }} /> Ajouter un exercice
                  </button>
                </div>
              </div>
            ))}
            <p className="caption">
              Fourchettes de reps selon ton objectif ({profile.goal === 'performance' ? 'force : 4–6 sur les mouvements principaux' : '6–10 polyarticulaires, 10–15 isolation'}).
              La charge de chaque exercice se règle automatiquement pendant les séances.
            </p>
          </>
        )}
      </Sheet>
      <ExerciseLibrarySheet
        open={picker !== null}
        onClose={() => setPicker(null)}
        equipment={equipment}
        onPick={onPicked}
        initialMuscle={picker?.replaceUid ? (exerciseById(findExerciseId(draft, picker)) ?.mainMuscle ?? null) : null}
        title={picker?.replaceUid ? 'Remplacer' : 'Ajouter'}
      />
    </>
  );
}

function findExerciseId(draft: Program | null, picker: { dayIdx: number; replaceUid?: string }): string {
  return draft?.days[picker.dayIdx]?.exercises.find((e) => e.uid === picker.replaceUid)?.exerciseId ?? '';
}

function swap<T>(list: T[], a: number, b: number): T[] {
  const next = [...list];
  [next[a], next[b]] = [next[b], next[a]];
  return next;
}

function clampInt(v: string, min: number, max: number): number {
  const n = parseInt(v.replace(/\D/g, ''), 10);
  if (Number.isNaN(n)) return min;
  return Math.min(max, Math.max(min, n));
}
