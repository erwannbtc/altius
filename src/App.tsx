import { lazy, Suspense, useEffect, useState } from 'react';
import { GlassTabBar, type TabKey } from './components/GlassTabBar';
import { ToastProvider } from './components/ui';
import { useProfile } from './lib/hooks';

// Le coach (SDK Anthropic) n'est chargé qu'à l'ouverture de l'onglet.
const CoachScreen = lazy(() => import('./screens/CoachScreen').then((m) => ({ default: m.CoachScreen })));
import { HomeScreen } from './screens/HomeScreen';
import { NutritionScreen } from './screens/NutritionScreen';
import { Onboarding } from './screens/Onboarding';
import { SettingsSheet, type SettingsSection } from './screens/SettingsSheet';
import { WorkoutScreen } from './screens/WorkoutScreen';

const TAB_KEY = 'altius-tab';

function readTab(): TabKey {
  try {
    const t = sessionStorage.getItem(TAB_KEY);
    if (t === 'accueil' || t === 'alimentation' || t === 'seance' || t === 'coach') return t;
  } catch {
    /* stockage indisponible */
  }
  return 'accueil';
}

export default function App() {
  const profile = useProfile();
  const [tab, setTab] = useState<TabKey>(readTab);
  const [settings, setSettings] = useState<SettingsSection | null>(null);

  useEffect(() => {
    try {
      sessionStorage.setItem(TAB_KEY, tab);
    } catch {
      /* ignore */
    }
  }, [tab]);

  if (!profile) return <div className="app" />;

  return (
    <ToastProvider>
      <div className="app">
        {!profile.onboarded ? (
          <Onboarding />
        ) : (
          <>
            {tab === 'accueil' && <HomeScreen profile={profile} onOpenSettings={() => setSettings('profil')} onGoTo={setTab} />}
            {tab === 'alimentation' && <NutritionScreen profile={profile} />}
            {tab === 'seance' && <WorkoutScreen profile={profile} />}
            {tab === 'coach' && (
              <Suspense fallback={null}>
                <CoachScreen profile={profile} onOpenSettings={() => setSettings('coach')} />
              </Suspense>
            )}
            <GlassTabBar value={tab} onChange={setTab} />
            <SettingsSheet
              open={settings !== null}
              initialSection={settings ?? 'profil'}
              onClose={() => setSettings(null)}
              profile={profile}
            />
          </>
        )}
      </div>
    </ToastProvider>
  );
}
