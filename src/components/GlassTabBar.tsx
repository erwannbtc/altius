import { Dumbbell, House, Sparkles, UtensilsCrossed } from 'lucide-react';
import { haptic } from '../lib/device';

export type TabKey = 'accueil' | 'alimentation' | 'seance' | 'coach';

const TABS: { key: TabKey; label: string; Icon: typeof House }[] = [
  { key: 'accueil', label: 'Accueil', Icon: House },
  { key: 'alimentation', label: 'Alimentation', Icon: UtensilsCrossed },
  { key: 'seance', label: 'Séance', Icon: Dumbbell },
  { key: 'coach', label: 'Coach', Icon: Sparkles },
];

export function GlassTabBar({ value, onChange }: { value: TabKey; onChange: (t: TabKey) => void }) {
  return (
    <nav className="glass tabbar" aria-label="Navigation principale">
      {TABS.map(({ key, label, Icon }) => (
        <button
          key={key}
          className={`tab ${value === key ? 'is-active' : ''}`}
          aria-current={value === key ? 'page' : undefined}
          onClick={() => {
            haptic(8);
            onChange(key);
          }}
        >
          <Icon size={24} strokeWidth={value === key ? 2.3 : 1.9} />
          {label}
        </button>
      ))}
    </nav>
  );
}
