import { Canvas, useFrame } from '@react-three/fiber';
import { RotateCw } from 'lucide-react';
import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import * as THREE from 'three';
import { heatColor, type HeatMap } from '../../lib/heat';
import { MUSCLES } from '../../lib/muscles';
import { relativeDay } from '../../lib/format';
import type { MuscleKey, Sex } from '../../lib/types';
import { GlbBody } from './GlbBody';
import { useBodyMaterials } from './materials';
import { ProceduralBody } from './ProceduralBody';
import { BodySvg } from './BodySvg';

type ViewMode = 'spin' | 'front' | 'back';

const TURN_SECONDS = 14;
const MODEL_BASE = `${import.meta.env.BASE_URL}models/`;

// Cache de la détection des fichiers .glb (homme / femme).
const glbCache = new Map<string, boolean>();

async function glbExists(url: string): Promise<boolean> {
  if (glbCache.has(url)) return glbCache.get(url)!;
  try {
    const res = await fetch(url, { method: 'HEAD', cache: 'no-cache' });
    const type = res.headers.get('content-type') ?? '';
    const ok = res.ok && !type.includes('text/html');
    glbCache.set(url, ok);
    return ok;
  } catch {
    glbCache.set(url, false);
    return false;
  }
}

function useGlbUrl(sex: Sex): string | null {
  const url = `${MODEL_BASE}${sex}.glb`;
  const [found, setFound] = useState<string | null>(glbCache.get(url) ? url : null);
  useEffect(() => {
    let alive = true;
    void glbExists(url).then((ok) => alive && setFound(ok ? url : null));
    return () => {
      alive = false;
    };
  }, [url]);
  return found;
}

function webglAvailable(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

// bezier(.2,.8,.2,1) approximé
function ease(t: number): number {
  return 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3.2);
}

function Turntable({ mode, children }: { mode: ViewMode; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  const tween = useRef<{ from: number; to: number; t: number } | null>(null);

  useEffect(() => {
    const g = ref.current;
    if (!g) return;
    if (mode === 'spin') {
      tween.current = null;
      return;
    }
    const target = mode === 'front' ? 0 : Math.PI;
    const cur = g.rotation.y;
    const k = Math.round((cur - target) / (Math.PI * 2));
    tween.current = { from: cur, to: target + k * Math.PI * 2, t: 0 };
  }, [mode]);

  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    if (mode === 'spin') {
      g.rotation.y += (dt * Math.PI * 2) / TURN_SECONDS;
    } else if (tween.current) {
      const tw = tween.current;
      tw.t = Math.min(1, tw.t + dt);
      g.rotation.y = tw.from + (tw.to - tw.from) * ease(tw.t);
      if (tw.t >= 1) tween.current = null;
    }
  });

  return <group ref={ref}>{children}</group>;
}

class GlbBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function Scene({
  sex,
  heat,
  mode,
  selected,
  onPick,
  glbUrl,
}: {
  sex: Sex;
  heat: HeatMap;
  mode: ViewMode;
  selected: MuscleKey | null;
  onPick: (k: MuscleKey) => void;
  glbUrl: string | null;
}) {
  const mats = useBodyMaterials(heat, selected);
  const procedural = <ProceduralBody sex={sex} mats={mats} onPick={onPick} />;
  return (
    <>
      <ambientLight intensity={0.55} />
      <hemisphereLight args={['#ffffff', '#2a0508', 0.6]} />
      <directionalLight position={[260, 420, 900]} intensity={2.1} />
      <directionalLight position={[-700, 160, -400]} intensity={2.6} color="#ff2d3e" />
      <directionalLight position={[700, 260, -500]} intensity={1.1} color="#ffd7da" />
      <directionalLight position={[0, -300, 600]} intensity={0.35} color="#ff6b75" />
      <Turntable mode={mode}>
        {glbUrl ? (
          <GlbBoundary fallback={procedural}>
            <Suspense fallback={procedural}>
              <GlbBody url={glbUrl} mats={mats} onPick={onPick} />
            </Suspense>
          </GlbBoundary>
        ) : (
          procedural
        )}
      </Turntable>
    </>
  );
}

export function BodyViewer({
  sex,
  heat,
  subtitle = '7 derniers jours',
}: {
  sex: Sex;
  heat: HeatMap;
  subtitle?: string;
}) {
  const [mode, setMode] = useState<ViewMode>('spin');
  const [selected, setSelected] = useState<MuscleKey | null>(null);
  const glbUrl = useGlbUrl(sex);
  const gl = useMemo(webglAvailable, []);

  useEffect(() => {
    if (!selected) return;
    const t = setTimeout(() => setSelected(null), 3500);
    return () => clearTimeout(t);
  }, [selected]);

  const sel = selected ? heat[selected] : null;

  return (
    <div className="glass card-lg body-card">
      <div className="body-card-title">
        <div className="h2">Carte musculaire</div>
        <div className="caption">{subtitle}</div>
      </div>
      <div className="mini-seg body-card-controls" role="group" aria-label="Vue du corps">
        <button className={mode === 'spin' ? 'is-active' : ''} onClick={() => setMode('spin')} aria-label="Rotation automatique">
          <RotateCw size={14} strokeWidth={2.4} />
        </button>
        <button className={mode === 'front' ? 'is-active' : ''} onClick={() => setMode('front')}>
          Face
        </button>
        <button className={mode === 'back' ? 'is-active' : ''} onClick={() => setMode('back')}>
          Dos
        </button>
      </div>

      <div className="body-zone">
        <div className="body-pedestal" aria-hidden />
        {gl ? (
          <Canvas
            className="body-canvas"
            flat
            dpr={[1, 2]}
            gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}
            camera={{ position: [0, -6, 1270], fov: 18, near: 10, far: 4000 }}
            onPointerMissed={() => setSelected(null)}
          >
            <Scene sex={sex} heat={heat} mode={mode} selected={selected} onPick={setSelected} glbUrl={glbUrl} />
          </Canvas>
        ) : (
          <BodySvg sex={sex} heat={heat} view={mode === 'back' ? 'back' : 'front'} onPick={setSelected} />
        )}
        {sel && selected && (
          <div className="glass body-label" role="status">
            <span className="dot" style={{ background: heatColor(Math.max(sel.intensity, 0.35)) }} />
            <strong>{MUSCLES[selected].label}</strong>
            <span className="num">{Math.round(sel.intensity * 100)} %</span>
            <span className="muted">{sel.lastAt ? relativeDay(sel.lastAt) : 'Reposé'}</span>
          </div>
        )}
      </div>

      <div className="body-legend">
        <div className="body-legend-bar" />
        <div className="row-between caption">
          <span>Récupéré</span>
          <span>Touchez un muscle</span>
          <span>Sollicité</span>
        </div>
      </div>
    </div>
  );
}
