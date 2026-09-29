import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronLeft, Filter } from 'lucide-react';
import { useMemo, useState } from 'react';
import { db } from '../../lib/db';
import { EQUIPMENT_LABEL } from '../../lib/equipment';
import { CATEGORY_LABEL, exerciseById, filterExercises, IMAGE_BASE, LEVEL_LABEL } from '../../lib/exercises';
import { dateFromKey, fmt, fmtMax, shortDate } from '../../lib/format';
import { MUSCLE_KEYS, MUSCLES, DB_MUSCLE_LABELS } from '../../lib/muscles';
import type { EquipmentKey, Exercise, MuscleKey } from '../../lib/types';
import { LineAreaChart } from '../LazyCharts';
import { Chip, ProgressBar, Sheet } from '../ui';

const PAGE = 60;

export function ExerciseLibrarySheet({
  open,
  onClose,
  equipment,
  onPick,
  initialMuscle = null,
  title,
}: {
  open: boolean;
  onClose: () => void;
  equipment: EquipmentKey[] | null;
  onPick?: (ex: Exercise) => void;
  initialMuscle?: MuscleKey | null;
  title?: string;
}) {
  const [detail, setDetail] = useState<Exercise | null>(null);
  return (
    <Sheet
      open={open}
      onClose={() => {
        setDetail(null);
        onClose();
      }}
      full
      title={
        detail ? (
          <button className="row" style={{ gap: 4 }} onClick={() => setDetail(null)}>
            <ChevronLeft size={22} /> Retour
          </button>
        ) : (
          (title ?? 'Bibliothèque')
        )
      }
    >
      {detail ? (
        <ExerciseDetail
          exercise={detail}
          onPick={
            onPick
              ? () => {
                  onPick(detail);
                  setDetail(null);
                }
              : undefined
          }
        />
      ) : (
        <LibraryList equipment={equipment} onOpen={setDetail} onPick={onPick} initialMuscle={initialMuscle} />
      )}
    </Sheet>
  );
}

function LibraryList({
  equipment,
  onOpen,
  onPick,
  initialMuscle,
}: {
  equipment: EquipmentKey[] | null;
  onOpen: (e: Exercise) => void;
  onPick?: (e: Exercise) => void;
  initialMuscle: MuscleKey | null;
}) {
  const [query, setQuery] = useState('');
  const [muscle, setMuscle] = useState<MuscleKey | null>(initialMuscle);
  const [onlyMine, setOnlyMine] = useState(!!equipment);
  const [strengthOnly, setStrengthOnly] = useState(true);
  const [limit, setLimit] = useState(PAGE);

  const results = useMemo(
    () =>
      filterExercises({
        query,
        muscle,
        equipment: onlyMine && equipment ? new Set<EquipmentKey>([...equipment, 'poids_du_corps']) : null,
        categories: strengthOnly ? ['strength', 'powerlifting'] : undefined,
      }).sort((a, b) => {
        const lv = { b: 0, i: 1, e: 2 };
        return lv[a.level] - lv[b.level] || a.nameFr.localeCompare(b.nameFr, 'fr');
      }),
    [query, muscle, onlyMine, strengthOnly, equipment],
  );

  return (
    <div className="stack">
      <input
        className="input"
        type="search"
        placeholder="Rechercher (ex. développé, squat, curl)"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setLimit(PAGE);
        }}
      />
      <div className="chips">
        <Chip small active={muscle === null} onClick={() => setMuscle(null)}>
          Tous
        </Chip>
        {MUSCLE_KEYS.map((k) => (
          <Chip key={k} small active={muscle === k} onClick={() => setMuscle(muscle === k ? null : k)}>
            {MUSCLES[k].label}
          </Chip>
        ))}
      </div>
      <div className="chips">
        {equipment && (
          <Chip small active={onlyMine} onClick={() => setOnlyMine(!onlyMine)}>
            <Filter size={14} /> Mon matériel
          </Chip>
        )}
        <Chip small active={strengthOnly} onClick={() => setStrengthOnly(!strengthOnly)}>
          Musculation uniquement
        </Chip>
      </div>
      <div className="caption">{results.length} exercices</div>
      <div className="list">
        {results.slice(0, limit).map((e) => (
          <div key={e.id} className="list-item">
            <button className="grow" style={{ textAlign: 'left', minWidth: 0 }} onClick={() => onOpen(e)}>
              <div className="body ellipsis">{e.nameFr}</div>
              <div className="caption ellipsis">
                {EQUIPMENT_LABEL[e.equipment]} · {e.mainMuscle ? MUSCLES[e.mainMuscle].label : '—'} · {LEVEL_LABEL[e.level]}
              </div>
            </button>
            {onPick && (
              <button className="btn-secondary" style={{ height: 36, padding: '0 14px', fontSize: 14 }} onClick={() => onPick(e)}>
                Choisir
              </button>
            )}
          </div>
        ))}
      </div>
      {results.length > limit && (
        <button className="btn-secondary full" onClick={() => setLimit(limit + PAGE)}>
          Afficher plus
        </button>
      )}
    </div>
  );
}

export function ExerciseDetail({ exercise: e, onPick }: { exercise: Exercise; onPick?: () => void }) {
  const [imgIdx, setImgIdx] = useState(0);
  const [imgError, setImgError] = useState(false);
  const history = useLiveQuery(async () => {
    const sessions = await db.sessions.where('status').equals('done').sortBy('date');
    const points: { label: string; value: number; reps: string }[] = [];
    for (const s of sessions) {
      const se = s.exercises.find((x) => x.exerciseId === e.id);
      if (!se) continue;
      const done = se.sets.filter((x) => x.done);
      if (!done.length) continue;
      const max = Math.max(...done.map((x) => x.load ?? 0));
      points.push({ label: shortDate(dateFromKey(s.date)), value: max, reps: done.map((x) => x.reps ?? '?').join('/') });
    }
    return points;
  }, [e.id]);
  const state = useLiveQuery(() => db.exerciseStates.get(e.id), [e.id]);

  const weights = Object.entries(e.weights).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0)) as [MuscleKey, number][];

  return (
    <div className="stack">
      <div>
        <div className="h2-large">{e.nameFr}</div>
        <div className="caption">
          {e.name} · {CATEGORY_LABEL[e.category] ?? e.category} · {LEVEL_LABEL[e.level]}
        </div>
      </div>
      {e.images.length > 0 && !imgError && (
        <button onClick={() => setImgIdx((imgIdx + 1) % e.images.length)} aria-label="Image suivante">
          <img className="ex-image" src={IMAGE_BASE + e.images[imgIdx]} alt={e.nameFr} loading="lazy" onError={() => setImgError(true)} />
        </button>
      )}
      <div className="chips">
        {[e.equipment, ...e.requires.filter((r) => r !== e.equipment)].map((k) => (
          <span key={k} className="tag neutral">
            {EQUIPMENT_LABEL[k]}
          </span>
        ))}
        {e.mechanic && <span className="tag neutral">{e.mechanic === 'compound' ? 'Polyarticulaire' : 'Isolation'}</span>}
      </div>

      <div className="glass card" style={{ borderRadius: 20 }}>
        <div className="h2">Muscles sollicités</div>
        {weights.map(([k, w]) => (
          <div key={k} className="zone-row" style={{ gridTemplateColumns: '104px 1fr 42px' }}>
            <span className="body">{MUSCLES[k].label}</span>
            <ProgressBar value={w} gradient={w >= 1} color="rgba(255,154,160,0.8)" />
            <span className="zone-pct">{fmtMax(w, 2)}</span>
          </div>
        ))}
        <p className="caption" style={{ margin: 0 }}>
          Poids utilisés pour la carte de chaleur : principal 1,0 · secondaire 0,3 à 0,5. Source : {e.primary.map((m) => DB_MUSCLE_LABELS[m] ?? m).join(', ')}
          {e.secondary.length ? ` + ${e.secondary.map((m) => DB_MUSCLE_LABELS[m] ?? m).join(', ')}` : ''}.
        </p>
      </div>

      {state && (
        <div className="caption">
          Charge prévue à la prochaine séance : <strong style={{ color: '#fff' }}>{fmtMax(state.load)} kg</strong>
          {state.failures ? ` · ${state.failures} échec(s) d'affilée` : ''}
        </div>
      )}

      {history && history.length > 0 && (
        <div className="glass card" style={{ borderRadius: 20 }}>
          <div className="row-between">
            <div className="h2">Progression</div>
            <span className="caption">Charge max par séance</span>
          </div>
          {history.length >= 2 ? (
            <LineAreaChart data={history} unit="kg" />
          ) : (
            <div className="caption">
              {history[0].label} : {fmt(history[0].value)} kg ({history[0].reps} reps)
            </div>
          )}
        </div>
      )}

      {e.instructions.length > 0 && (
        <div className="stack-sm">
          <div className="h2">Exécution</div>
          <ol style={{ margin: 0, paddingLeft: 20, color: 'var(--text-3)', fontSize: 14, lineHeight: 1.5 }} className="selectable">
            {e.instructions.map((s, i) => (
              <li key={i} style={{ marginBottom: 6 }}>
                {s}
              </li>
            ))}
          </ol>
          <p className="caption">Consignes en anglais issues de free-exercise-db (domaine public).</p>
        </div>
      )}
      {onPick && (
        <button className="btn-primary" onClick={onPick}>
          Choisir cet exercice
        </button>
      )}
    </div>
  );
}

export function exerciseSubtitle(id: string, sets: number, repMin: number, repMax: number, load?: number): string {
  const ex = exerciseById(id);
  const reps = repMin === repMax ? `${repMin}` : `${repMin}–${repMax}`;
  const eq = ex ? EQUIPMENT_LABEL[ex.equipment] : '';
  const loadTxt = load && load > 0 ? ` · ${fmtMax(load)} kg` : '';
  return `${sets} × ${reps} · ${eq}${loadTxt}`;
}
