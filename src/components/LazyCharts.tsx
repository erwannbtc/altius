import { lazy, Suspense, type ComponentProps } from 'react';

const LineAreaChartLazy = lazy(() => import('./Charts').then((m) => ({ default: m.LineAreaChart })));
const BarsChartLazy = lazy(() => import('./Charts').then((m) => ({ default: m.BarsChart })));

const placeholder = <div className="chart" />;

export function LineAreaChart(props: ComponentProps<typeof LineAreaChartLazy>) {
  return (
    <Suspense fallback={placeholder}>
      <LineAreaChartLazy {...props} />
    </Suspense>
  );
}

export function BarsChart(props: ComponentProps<typeof BarsChartLazy>) {
  return (
    <Suspense fallback={placeholder}>
      <BarsChartLazy {...props} />
    </Suspense>
  );
}
