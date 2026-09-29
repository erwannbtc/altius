import { Flame, Minus, Plus } from 'lucide-react';
import { fmt } from '../../lib/format';
import { ProgressBar } from '../ui';

// Anneau calories (maquette §4.2) : 210×210, rayon 88, épaisseur 16.
export function CalorieRing({ consumed, target }: { consumed: number; target: number }) {
  const R = 88;
  const C = 2 * Math.PI * R;
  const pct = target > 0 ? Math.min(1, consumed / target) : 0;
  const remaining = Math.round(target - consumed);
  const over = remaining < 0;
  return (
    <div className="ring-wrap">
      <svg width="210" height="210" viewBox="0 0 210 210" aria-hidden>
        <defs>
          <filter id="ringGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="5" />
          </filter>
        </defs>
        <circle cx="105" cy="105" r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="16" />
        <g transform="rotate(-90 105 105)">
          <circle
            cx="105"
            cy="105"
            r={R}
            fill="none"
            stroke="rgba(255,59,71,0.55)"
            strokeWidth="16"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - pct)}
            filter="url(#ringGlow)"
            style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(.2,.8,.2,1)' }}
          />
          <circle
            cx="105"
            cy="105"
            r={R}
            fill="none"
            stroke="#FF3B47"
            strokeWidth="16"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - pct)}
            style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(.2,.8,.2,1)' }}
          />
        </g>
      </svg>
      <div className="ring-center">
        <Flame size={22} color="#FF4D5A" />
        <div className="ring-number">{fmt(Math.abs(remaining))}</div>
        <div className="muted" style={{ fontSize: 13 }}>
          {over ? 'kcal au-dessus' : 'kcal restantes'}
        </div>
      </div>
    </div>
  );
}

export function CalorieStepper({
  value,
  onChange,
  recommended,
  isOverride,
  onReset,
}: {
  value: number;
  onChange: (v: number) => void;
  recommended: number;
  isOverride: boolean;
  onReset: () => void;
}) {
  const step = (d: number) => onChange(Math.min(5000, Math.max(1200, value + d)));
  return (
    <div className="stack-sm">
      <div className="stepper">
        <button className="round-btn" aria-label="Diminuer l'objectif de 50 kcal" onClick={() => step(-50)}>
          <Minus size={18} />
        </button>
        <div style={{ textAlign: 'center' }}>
          <div className="caption">Objectif calorique</div>
          <div className="value">{fmt(value)} kcal</div>
        </div>
        <button className="round-btn" aria-label="Augmenter l'objectif de 50 kcal" onClick={() => step(50)}>
          <Plus size={18} />
        </button>
      </div>
      {isOverride && (
        <button className="btn-link" style={{ alignSelf: 'center' }} onClick={onReset}>
          Revenir à la recommandation ({fmt(recommended)} kcal)
        </button>
      )}
    </div>
  );
}

export function MacroRow({ name, color, value, target }: { name: string; color: string; value: number; target: number }) {
  return (
    <div className="macro-row">
      <div className="row-between">
        <div className="row" style={{ gap: 8 }}>
          <span className="dot" style={{ background: color }} />
          <span style={{ fontSize: 14, fontWeight: 600 }}>{name}</span>
        </div>
        <div className="num" style={{ fontSize: 14 }}>
          <span style={{ fontWeight: 600 }}>{fmt(value)}</span>
          <span className="muted"> / {fmt(target)} g</span>
        </div>
      </div>
      <ProgressBar value={target ? value / target : 0} color={color} glow={color === '#8E1622' ? undefined : `${color}88`} />
    </div>
  );
}

export function DietSplitBar({ p, c, f }: { p: number; c: number; f: number }) {
  return (
    <>
      <div className="split-bar">
        <div style={{ flexGrow: p, flexBasis: 0, background: '#FF3B47' }} />
        <div style={{ flexGrow: c, flexBasis: 0, background: '#FF9AA0' }} />
        <div style={{ flexGrow: f, flexBasis: 0, background: '#8E1622' }} />
      </div>
      <div className="split-legend">
        <span>Protéines {p}%</span>
        <span>·</span>
        <span>Glucides {c}%</span>
        <span>·</span>
        <span>Lipides {f}%</span>
      </div>
    </>
  );
}
