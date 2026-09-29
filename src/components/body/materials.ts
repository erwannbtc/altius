import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { glowLevel, heatRgb, type HeatMap } from '../../lib/heat';
import { MUSCLE_KEYS } from '../../lib/muscles';
import type { MuscleKey } from '../../lib/types';

export interface BodyMaterials {
  body: THREE.MeshStandardMaterial;
  neutral: THREE.MeshStandardMaterial;
  muscle: Record<MuscleKey, THREE.MeshStandardMaterial>;
  glow: Record<MuscleKey, THREE.SpriteMaterial>;
}

let glowTexture: THREE.Texture | null = null;

function getGlowTexture(): THREE.Texture {
  if (glowTexture) return glowTexture;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,45,62,1)');
  g.addColorStop(0.35, 'rgba(255,45,62,0.55)');
  g.addColorStop(0.7, 'rgba(255,45,62,0.12)');
  g.addColorStop(1, 'rgba(255,45,62,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  glowTexture = new THREE.CanvasTexture(c);
  glowTexture.colorSpace = THREE.SRGBColorSpace;
  return glowTexture;
}

/** Matériaux partagés par muscle, recolorés selon la carte de chaleur. */
export function useBodyMaterials(heat: HeatMap, selected: MuscleKey | null): BodyMaterials {
  const mats = useMemo<BodyMaterials>(() => {
    const muscle = {} as BodyMaterials['muscle'];
    const glow = {} as BodyMaterials['glow'];
    for (const k of MUSCLE_KEYS) {
      muscle[k] = new THREE.MeshStandardMaterial({ roughness: 0.42, metalness: 0.15 });
      glow[k] = new THREE.SpriteMaterial({
        map: getGlowTexture(),
        transparent: true,
        depthWrite: false,
        opacity: 0,
      });
    }
    return {
      body: new THREE.MeshStandardMaterial({ color: '#1a1a20', roughness: 0.5, metalness: 0.35 }),
      neutral: new THREE.MeshStandardMaterial({ color: '#2a2a32', roughness: 0.55, metalness: 0.25 }),
      muscle,
      glow,
    };
  }, []);

  useEffect(() => {
    for (const k of MUSCLE_KEYS) {
      const i = heat[k]?.intensity ?? 0;
      const [r, g, b] = heatRgb(i);
      const m = mats.muscle[k];
      m.color.setRGB(r / 255, g / 255, b / 255, THREE.SRGBColorSpace);
      m.emissive.setRGB(1, 45 / 255, 62 / 255, THREE.SRGBColorSpace);
      const sel = selected === k;
      m.emissiveIntensity = (i > 0.2 ? Math.pow(i, 1.4) * 0.55 : 0) + (sel ? 0.35 : 0);
      m.needsUpdate = true;
      const gl = glowLevel(i);
      mats.glow[k].opacity = Math.min(1, gl.alpha * 0.75 + (sel ? 0.35 : 0));
    }
  }, [heat, selected, mats]);

  useEffect(
    () => () => {
      mats.body.dispose();
      mats.neutral.dispose();
      for (const k of MUSCLE_KEYS) {
        mats.muscle[k].dispose();
        mats.glow[k].dispose();
      }
    },
    [mats],
  );

  return mats;
}
