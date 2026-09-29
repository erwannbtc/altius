import { Area, AreaChart, Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

// Graphiques (Recharts), chargés à la demande pour alléger le démarrage.

const tooltipStyle = {
  background: 'rgba(20,20,24,0.95)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 12,
  color: '#fff',
  fontSize: 13,
};

export interface Point {
  label: string;
  value: number;
}

export function LineAreaChart({
  data,
  unit,
  target,
  decimals = 1,
}: {
  data: Point[];
  unit: string;
  target?: number;
  decimals?: number;
}) {
  const values = data.map((d) => d.value).concat(target !== undefined ? [target] : []);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = Math.max(1, (max - min) * 0.2);
  return (
    <div className="chart">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="areaRed" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FF3B47" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#FF3B47" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={24} />
          <YAxis
            domain={[Math.floor(min - pad), Math.ceil(max + pad)]}
            tickLine={false}
            axisLine={false}
            width={44}
            tickFormatter={(v: number) => v.toLocaleString('fr-FR')}
          />
          {target !== undefined && <ReferenceLine y={target} stroke="rgba(255,154,160,0.6)" strokeDasharray="4 4" />}
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(v) => [`${Number(v).toLocaleString('fr-FR', { maximumFractionDigits: decimals })} ${unit}`, '']}
            separator=""
            labelStyle={{ color: 'rgba(235,235,245,0.6)' }}
          />
          <Area type="monotone" dataKey="value" stroke="#FF3B47" strokeWidth={2.5} fill="url(#areaRed)" dot={data.length < 12} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BarsChart({ data, unit, target }: { data: Point[]; unit: string; target?: number }) {
  return (
    <div className="chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} />
          <YAxis tickLine={false} axisLine={false} width={44} tickFormatter={(v: number) => v.toLocaleString('fr-FR')} />
          {target !== undefined && <ReferenceLine y={target} stroke="rgba(255,154,160,0.7)" strokeDasharray="4 4" />}
          <Tooltip
            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
            contentStyle={tooltipStyle}
            formatter={(v) => [`${Number(v).toLocaleString('fr-FR')} ${unit}`, '']}
            separator=""
            labelStyle={{ color: 'rgba(235,235,245,0.6)' }}
          />
          <Bar dataKey="value" fill="#FF3B47" radius={[6, 6, 2, 2]} maxBarSize={26} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default { LineAreaChart, BarsChart };
