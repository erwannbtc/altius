import { glowLevel, heatColor, type HeatMap } from '../../lib/heat';
import type { MuscleKey, Sex } from '../../lib/types';
import { BACK, FRONT, SILHOUETTE, type BodyPart } from './bodyPaths';

// Rendu 2D de secours (si WebGL est indisponible) — maquette §5.3.

function Shape({ part, fill, stroke, filter, onClick }: { part: BodyPart; fill: string; stroke: string; filter?: string; onClick?: () => void }) {
  const common = { fill, stroke, strokeWidth: 0.6, filter, onClick, style: onClick ? { cursor: 'pointer' } : undefined };
  if (part.d) return <path d={part.d} {...common} />;
  if (part.ellipse) {
    const [cx, cy, rx, ry] = part.ellipse;
    return <ellipse cx={cx} cy={cy} rx={rx} ry={ry} {...common} />;
  }
  const [x, y, w, h, rx] = part.rect!;
  return <rect x={x} y={y} width={w} height={h} rx={rx} {...common} />;
}

export function BodySvg({
  sex,
  heat,
  view,
  onPick,
}: {
  sex: Sex;
  heat: HeatMap;
  view: 'front' | 'back';
  onPick?: (k: MuscleKey) => void;
}) {
  const parts = view === 'front' ? FRONT : BACK;
  const upperT = sex === 'femme' ? 'translate(100 0) scale(0.9 1) translate(-100 0)' : undefined;
  const lowerT = sex === 'femme' ? 'translate(100 0) scale(1.07 1) translate(-100 0)' : undefined;
  const render = (group: 'upper' | 'lower') => (
    <g transform={group === 'upper' ? upperT : lowerT}>
      {SILHOUETTE.filter((s) => s.group === group).map((s, i) => (
        <Shape key={`s${i}`} part={s} fill="#17171C" stroke="rgba(255,255,255,0.05)" />
      ))}
      {parts
        .filter((s) => s.group === group)
        .map((s, i) => {
          if (s.kind === 'neutral' || s.kind === 'head') {
            return <Shape key={i} part={s} fill="#23232A" stroke="rgba(255,255,255,0.05)" />;
          }
          const k = s.kind as MuscleKey;
          const intensity = heat[k]?.intensity ?? 0;
          const g = glowLevel(intensity);
          return (
            <g key={i}>
              {g.alpha > 0 && <Shape part={s} fill={`rgba(255,45,62,${g.alpha})`} stroke="none" filter={`url(#glow${g.blur})`} />}
              <Shape part={s} fill={heatColor(intensity)} stroke="rgba(255,255,255,0.07)" onClick={onPick ? () => onPick(k) : undefined} />
            </g>
          );
        })}
      {group === 'upper' && <ellipse cx={100} cy={32} rx={16} ry={20} fill="#23232A" stroke="rgba(255,255,255,0.05)" />}
    </g>
  );
  return (
    <svg viewBox="0 0 200 440" className="body-svg" role="img" aria-label="Carte musculaire">
      <defs>
        {[2, 4, 7].map((b) => (
          <filter key={b} id={`glow${b}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation={b} />
          </filter>
        ))}
      </defs>
      {render('upper')}
      {render('lower')}
    </svg>
  );
}
