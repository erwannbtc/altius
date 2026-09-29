import { useGLTF } from '@react-three/drei';
import type { ThreeEvent } from '@react-three/fiber';
import { useMemo } from 'react';
import * as THREE from 'three';
import type { MuscleKey } from '../../lib/types';
import type { BodyMaterials } from './materials';

// Vrai modèle 3D (.glb) : chaque mesh doit porter le nom du muscle.
// Noms reconnus (insensible à la casse, accents, côté gauche/droite ignorés) :
const ALIASES: Record<MuscleKey, string[]> = {
  chest: ['chest', 'pecs', 'pec', 'pectoraux', 'pectoral', 'pectoralis'],
  shoulders: ['shoulders', 'shoulder', 'epaules', 'epaule', 'deltoid', 'deltoids', 'delts', 'deltoide'],
  biceps: ['biceps', 'bicep'],
  triceps: ['triceps', 'tricep'],
  forearms: ['forearms', 'forearm', 'avantbras', 'avant_bras', 'brachioradialis'],
  abs: ['abs', 'abdos', 'abdominaux', 'abdominals', 'rectusabdominis', 'obliques', 'oblique'],
  upperBack: ['upperback', 'dos', 'doshaut', 'dos_haut', 'lats', 'latissimus', 'dorsaux', 'rhomboids', 'back'],
  lowerBack: ['lowerback', 'dosbas', 'dos_bas', 'lombaires', 'erector', 'erectorspinae'],
  traps: ['traps', 'trapezius', 'trapezes', 'trapeze'],
  glutes: ['glutes', 'glute', 'fessiers', 'fessier', 'gluteus'],
  quads: ['quads', 'quadriceps', 'quad'],
  hamstrings: ['hamstrings', 'hamstring', 'ischios', 'ischio', 'ischiojambiers'],
  calves: ['calves', 'calf', 'mollets', 'mollet', 'gastrocnemius', 'soleus'],
};

const LOOKUP = new Map<string, MuscleKey>();
for (const [k, names] of Object.entries(ALIASES) as [MuscleKey, string[]][]) {
  for (const n of names) LOOKUP.set(n.replace(/_/g, ''), k);
}

export function muscleFromMeshName(name: string): MuscleKey | null {
  const n = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/(^|[._\-\s])(l|r|left|right|gauche|droite|g|d)($|[._\-\s])/g, '$1$3')
    .replace(/[0-9]+/g, '')
    .replace(/[^a-z]/g, '');
  if (LOOKUP.has(n)) return LOOKUP.get(n)!;
  for (const [alias, k] of LOOKUP) if (alias.length > 3 && n.includes(alias)) return k;
  return null;
}

export function GlbBody({ url, mats, onPick }: { url: string; mats: BodyMaterials; onPick: (k: MuscleKey) => void }) {
  const { scene } = useGLTF(url);
  const model = useMemo(() => {
    const root = scene.clone(true);
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const key = muscleFromMeshName(mesh.name) ?? muscleFromMeshName(mesh.parent?.name ?? '');
      mesh.userData.muscle = key;
      mesh.material = key ? mats.muscle[key] : mats.body;
    });
    // Mise à l'échelle : ~386 unités de haut, centré (même cadrage que le modèle provisoire).
    const box = new THREE.Box3().setFromObject(root);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    const s = 386 / (size.y || 1);
    const wrapper = new THREE.Group();
    root.position.sub(center);
    wrapper.add(root);
    wrapper.scale.setScalar(s);
    wrapper.position.y = -4;
    return wrapper;
  }, [scene, mats]);

  return (
    <primitive
      object={model}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        const key = (e.object.userData?.muscle as MuscleKey | null) ?? null;
        if (key) {
          e.stopPropagation();
          onPick(key);
        }
      }}
    />
  );
}
