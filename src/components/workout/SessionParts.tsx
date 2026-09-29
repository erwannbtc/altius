import { Check, ChevronDown, Info, Minus, Plus, RefreshCw, SkipForward } from 'lucide-react';
import { EQUIPMENT_LABEL } from '../../lib/equipment';
import { exerciseById } from '../../lib/exercises';
import { chrono, fmtMax, WEEKDAY_LETTERS } from '../../lib/format';
import type { WeekDay } from '../../lib/program';
import { isBodyweight } from '../../lib/progression';
import type { ProgressionResult, SessionExercise, SetLog } from '../../lib/types';
import { GlassCard, Sheet } from '../ui';

export function WeekStrip({ days }: { days: WeekDay[] }) {
  return (
    <GlassCard className="week-strip">
      {days.map((d, i) => (
        <div key={d.key} className={`week-day ${d.isToday ? 'is-today' : ''}`} aria-label={`${d.key} ${d.status}`}>
          <span className="letter">{WEEKDAY_LETTERS[i]}</span>
          <span className="daynum">{d.date.getDate()}</span>
          <span className={`week-dot ${d.status === 'rest' ? '' : d.status}`} />
        </div>
      ))}
    </GlassCard>
  );
}

const RPE_VALUES = [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10];

export function ExerciseCard({
  index,
  se,
  expanded,
  onToggle,
  onChange,
  onValidate,
  onSwap,
  onInfo,
  previous,
}: {
  index: number;
  se: SessionExercise;
  expanded: boolean;
  onToggle: () => void;
  onChange: (next: SessionExercise) => void;
  onValidate: (setIdx: number) => void;
  onSwap: () => void;
  onInfo: () => void;
  previous?: string;
}) {
  const ex = exerciseById(se.exerciseId);
  const doneCount = se.sets.filter((s) => s.done).length;
  const complete = doneCount >= se.sets.length && se.sets.length > 0;
  const bw = ex ? isBodyweight(ex) : false;
  const reps = se.repMin === se.repMax ? `${se.repMin}` : `${se.repMin}–${se.repMax}`;
  const loadTxt = se.targetLoad > 0 ? ` · ${fmtMax(se.targetLoad)} kg` : bw ? ' · poids du corps' : '';

  const setField = (i: number, patch: Partial<SetLog>) => {
    const sets = se.sets.map((s, j) => (j === i ? { ...s, ...patch } : s));
    onChange({ ...se, sets });
  };

  return (
    <GlassCard className={`ex-card ${complete ? 'is-complete' : ''}`}>
      <button className="ex-head" onClick={onToggle} aria-expanded={expanded}>
        <span className="num-badge">{index + 1}</span>
        <span className="grow">
          <span className="ellipsis" style={{ display: 'block', fontSize: 16, fontWeight: 600 }}>
            {ex?.nameFr ?? se.exerciseId}
          </span>
          <span className="caption ellipsis" style={{ display: 'block', fontSize: 13 }}>
            {se.sets.length} × {reps} · {ex ? EQUIPMENT_LABEL[ex.equipment] : ''}
            {loadTxt}
          </span>
        </span>
        <span className="set-dots" aria-label={`${doneCount} séries sur ${se.sets.length}`}>
          {se.sets.map((s, i) => (
            <span key={i} className={`set-dot ${s.done ? 'done' : ''}`} />
          ))}
        </span>
        <ChevronDown size={18} style={{ transform: expanded ? 'rotate(180deg)' : undefined, transition: 'transform .2s', color: 'var(--text-2)' }} />
      </button>
      {expanded && (
        <div className="ex-body">
          {previous && <div className="caption">Dernière fois : {previous}</div>}
          <div className="set-grid">
            <span className="set-head">#</span>
            <span className="set-head">Kg</span>
            <span className="set-head">Reps</span>
            <span className="set-head">RPE</span>
            <span />
          </div>
          {se.sets.map((s, i) => {
            const below = s.done && (s.reps ?? 0) < se.repMin;
            return (
              <div className="set-grid" key={i}>
                <span className="set-index">{i + 1}</span>
                <input
                  className="input num"
                  inputMode="decimal"
                  aria-label={`Charge série ${i + 1}`}
                  value={s.load === null ? '' : String(s.load).replace('.', ',')}
                  placeholder={bw ? 'PDC' : '0'}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    const t = e.target.value.replace(',', '.').replace(/[^0-9.]/g, '');
                    setField(i, { load: t === '' ? null : Number(t) });
                  }}
                />
                <input
                  className="input num"
                  inputMode="numeric"
                  aria-label={`Répétitions série ${i + 1}`}
                  value={s.reps === null ? '' : String(s.reps)}
                  placeholder={reps}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    const t = e.target.value.replace(/\D/g, '');
                    setField(i, { reps: t === '' ? null : Number(t) });
                  }}
                />
                <select
                  className="select num"
                  aria-label={`RPE série ${i + 1}`}
                  value={s.rpe ?? ''}
                  onChange={(e) => setField(i, { rpe: e.target.value === '' ? null : Number(e.target.value) })}
                >
                  <option value="">–</option>
                  {RPE_VALUES.map((v) => (
                    <option key={v} value={v}>
                      {String(v).replace('.', ',')}
                    </option>
                  ))}
                </select>
                <button
                  className={`set-check ${s.done ? 'is-done' : ''} ${below ? 'below' : ''}`}
                  aria-label={s.done ? `Annuler la série ${i + 1}` : `Valider la série ${i + 1}`}
                  aria-pressed={s.done}
                  onClick={() => (s.done ? setField(i, { done: false, doneAt: undefined }) : onValidate(i))}
                >
                  <Check size={20} strokeWidth={3} />
                </button>
              </div>
            );
          })}
          <div className="row-between" style={{ marginTop: 4 }}>
            <div className="row" style={{ gap: 6 }}>
              <button
                className="round-btn"
                style={{ width: 36, height: 36 }}
                aria-label="Retirer une série"
                disabled={se.sets.length <= 1 || se.sets[se.sets.length - 1].done}
                onClick={() => onChange({ ...se, sets: se.sets.slice(0, -1) })}
              >
                <Minus size={16} />
              </button>
              <button
                className="round-btn"
                style={{ width: 36, height: 36 }}
                aria-label="Ajouter une série"
                onClick={() =>
                  onChange({
                    ...se,
                    sets: [...se.sets, { reps: null, load: se.sets[se.sets.length - 1]?.load ?? se.targetLoad, rpe: null, done: false }],
                  })
                }
              >
                <Plus size={16} />
              </button>
              <span className="caption">Repos {fmtMax(se.restSec / 60)} min</span>
            </div>
            <div className="row" style={{ gap: 6 }}>
              <button className="round-btn" style={{ width: 36, height: 36 }} aria-label="Remplacer l'exercice" onClick={onSwap}>
                <RefreshCw size={15} />
              </button>
              <button className="round-btn" style={{ width: 36, height: 36 }} aria-label="Fiche de l'exercice" onClick={onInfo}>
                <Info size={16} />
              </button>
            </div>
          </div>
          <p className="caption" style={{ margin: 0 }}>
            Saisis tes reps réelles. Haut de fourchette ({se.repMax}) sur toutes les séries → la charge augmentera à la prochaine séance.
          </p>
        </div>
      )}
    </GlassCard>
  );
}

export function RestTimer({
  endsAt,
  total,
  now,
  onAdd,
  onSkip,
}: {
  endsAt: number;
  total: number;
  now: number;
  onAdd: (sec: number) => void;
  onSkip: () => void;
}) {
  const left = Math.max(0, endsAt - now);
  const ratio = total > 0 ? left / total : 0;
  return (
    <div className="glass rest-pill" role="timer" aria-label="Repos">
      <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden>
        <circle cx="13" cy="13" r="10" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="3" />
        <circle
          cx="13"
          cy="13"
          r="10"
          fill="none"
          stroke="#FF3B47"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={62.8}
          strokeDashoffset={62.8 * (1 - ratio)}
          transform="rotate(-90 13 13)"
        />
      </svg>
      <span className="caption">Repos</span>
      <span className="rest-time">{chrono(left)}</span>
      <button className="round-btn" onClick={() => onAdd(-15)} aria-label="Retirer 15 secondes">
        −15
      </button>
      <button className="round-btn" onClick={() => onAdd(15)} aria-label="Ajouter 15 secondes">
        +15
      </button>
      <button className="round-btn" onClick={onSkip} aria-label="Passer le repos">
        <SkipForward size={16} />
      </button>
    </div>
  );
}

const OUTCOME_LABEL: Record<ProgressionResult['outcome'], { label: string; color: string }> = {
  up: { label: 'Charge +', color: '#FF3B47' },
  hold: { label: 'Maintien', color: 'rgba(235,235,245,0.75)' },
  fail: { label: 'Échec', color: '#FFB340' },
  deload: { label: 'Allègement', color: '#FF9AA0' },
  skip: { label: 'Non fait', color: 'rgba(235,235,245,0.5)' },
  reps: { label: 'Reps +', color: '#FF3B47' },
};

export function SessionSummarySheet({
  open,
  onClose,
  results,
  durationMs,
  sets,
}: {
  open: boolean;
  onClose: () => void;
  results: ProgressionResult[];
  durationMs: number;
  sets: number;
}) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Séance terminée"
      footer={
        <button className="btn-primary" onClick={onClose}>
          Terminer
        </button>
      }
    >
      <div className="grid-2">
        <GlassCard className="tile">
          <span className="caption">Durée</span>
          <span className="value">{chrono(durationMs)}</span>
        </GlassCard>
        <GlassCard className="tile">
          <span className="caption">Séries validées</span>
          <span className="value">{sets}</span>
        </GlassCard>
      </div>
      <div className="h2">Progression pour la prochaine séance</div>
      <div className="list">
        {results.map((r) => {
          const o = OUTCOME_LABEL[r.outcome];
          return (
            <div key={r.exerciseId} className="list-item" style={{ alignItems: 'flex-start' }}>
              <div className="grow">
                <div className="body">{exerciseById(r.exerciseId)?.nameFr ?? r.exerciseId}</div>
                <div className="caption">{r.message}</div>
              </div>
              <span className="tag" style={{ color: o.color, borderColor: 'rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)' }}>
                {o.label}
              </span>
            </div>
          );
        })}
      </div>
      <p className="caption">
        Règles : haut de fourchette sur toutes les séries → charge augmentée. Une série sous le bas de fourchette → échec, charge conservée.
        3 échecs d’affilée → −10 %.
      </p>
    </Sheet>
  );
}
