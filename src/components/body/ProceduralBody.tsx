import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import type { MuscleKey, Sex } from '../../lib/types';
import { BACK, FRONT, SILHOUETTE, partToSvg, type BodyGroup, type BodyPart } from './bodyPaths';
import type { BodyMaterials } from './materials';

// Modèle 3D PROVISOIRE : les tracés de la maquette extrudés en volume.
// Chaque muscle est un mesh nommé « muscle:<clé> ». Pour le remplacer par un vrai
// modèle, dépose public/models/homme.glb et femme.glb (voir docs/MODELE_3D.md).

const BODY_HALF = 12; // demi-épaisseur du corps (unités du viewBox)

interface BuiltPart {
  part: BodyPart;
  geometry: THREE.BufferGeometry;
  center: THREE.Vector3;
  size: number;
}

function shapesOf(parts: BodyPart[]): THREE.Shape[][] {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 440">${parts
    .map((pt, i) => partToSvg(pt, `data-i="${i}"`))
    .join('')}</svg>`;
  const data = new SVGLoader().parse(svg);
  const out: THREE.Shape[][] = parts.map(() => []);
  for (const path of data.paths) {
    const node = path.userData?.node as Element | undefined;
    const i = Number(node?.getAttribute('data-i'));
    if (Number.isFinite(i)) out[i].push(...path.toShapes());
  }
  return out;
}

function build(parts: BodyPart[], opts: THREE.ExtrudeGeometryOptions, zBase: number): BuiltPart[] {
  const shapes = shapesOf(parts);
  return parts.map((part, i) => {
    const geometry = new THREE.ExtrudeGeometry(shapes[i], opts);
    geometry.translate(0, 0, zBase);
    geometry.computeBoundingBox();
    const bb = geometry.boundingBox!;
    const center = new THREE.Vector3();
    bb.getCenter(center);
    const size = Math.max(bb.max.x - bb.min.x, bb.max.y - bb.min.y);
    return { part, geometry, center, size };
  });
}

const SILHOUETTE_OPTS: THREE.ExtrudeGeometryOptions = {
  depth: BODY_HALF * 2 - 10,
  bevelEnabled: true,
  bevelThickness: 5,
  bevelSize: 2.2,
  bevelOffset: -2.2,
  bevelSegments: 4,
  curveSegments: 14,
};

const SKIN_OPTS: THREE.ExtrudeGeometryOptions = {
  depth: 1.2,
  bevelEnabled: true,
  bevelThickness: 1.1,
  bevelSize: 0.7,
  bevelOffset: -0.7,
  bevelSegments: 2,
  curveSegments: 14,
};

function useBodyGeometry() {
  return useMemo(() => {
    const silhouette = build(
      SILHOUETTE.filter((s) => s.kind !== 'head'),
      SILHOUETTE_OPTS,
      -(BODY_HALF - 5),
    );
    const front = build(FRONT, SKIN_OPTS, BODY_HALF - 1.6);
    const back = build(BACK, SKIN_OPTS, BODY_HALF - 1.6);
    return { silhouette, front, back };
  }, []);
}

function Head({ material }: { material: THREE.Material }) {
  return (
    <mesh position={[100, 32, 0]} scale={[16.5, 20.5, 15]} material={material} name="neutral:head">
      <sphereGeometry args={[1, 40, 28]} />
    </mesh>
  );
}

function Parts({
  parts,
  group,
  mats,
  onPick,
}: {
  parts: BuiltPart[];
  group: BodyGroup;
  mats: BodyMaterials;
  onPick: (k: MuscleKey) => void;
}) {
  return (
    <>
      {parts
        .filter((b) => b.part.group === group)
        .map((b, i) => {
          const kind = b.part.kind;
          const isMuscle = kind !== 'neutral' && kind !== 'head';
          const material = isMuscle ? mats.muscle[kind as MuscleKey] : mats.neutral;
          return (
            <group key={i}>
              <mesh
                geometry={b.geometry}
                material={material}
                name={isMuscle ? `muscle:${kind}` : 'neutral'}
                onClick={
                  isMuscle
                    ? (e: ThreeEvent<MouseEvent>) => {
                        e.stopPropagation();
                        onPick(kind as MuscleKey);
                      }
                    : undefined
                }
              />
              {isMuscle && (
                <sprite
                  position={[b.center.x, b.center.y, BODY_HALF + 3]}
                  scale={[b.size * 1.9, b.size * 1.9, 1]}
                  material={mats.glow[kind as MuscleKey]}
                  raycast={() => null}
                />
              )}
            </group>
          );
        })}
    </>
  );
}

export function ProceduralBody({
  sex,
  mats,
  onPick,
}: {
  sex: Sex;
  mats: BodyMaterials;
  onPick: (k: MuscleKey) => void;
}) {
  const geo = useBodyGeometry();
  const upper = useRef<THREE.Group>(null);
  const lower = useRef<THREE.Group>(null);

  // Homme / Femme : haut du corps affiné (×0,9), bas du corps élargi (×1,07). Transition douce.
  useFrame((_, dt) => {
    const k = 1 - Math.exp(-dt * 12);
    const tu = sex === 'femme' ? 0.9 : 1;
    const tl = sex === 'femme' ? 1.07 : 1;
    for (const [g, t] of [
      [upper.current, tu],
      [lower.current, tl],
    ] as const) {
      if (!g) continue;
      g.scale.x += (t - g.scale.x) * k;
      g.position.x = 100 * (1 - g.scale.x);
    }
  });

  const renderGroup = (group: BodyGroup) => (
    <>
      {geo.silhouette
        .filter((b) => b.part.group === group)
        .map((b, i) => (
          <mesh key={i} geometry={b.geometry} material={mats.body} name="silhouette" />
        ))}
      <Parts parts={geo.front} group={group} mats={mats} onPick={onPick} />
      {/* Vue de dos : même repère tourné d'un demi-tour autour de l'axe vertical (x = 100) */}
      <group position={[200, 0, 0]} rotation={[0, Math.PI, 0]}>
        <Parts parts={geo.back} group={group} mats={mats} onPick={onPick} />
      </group>
      {group === 'upper' && <Head material={mats.neutral} />}
    </>
  );

  return (
    // Repère SVG : x ∈ [0,200], y vers le bas → centré et retourné.
    <group position={[-100, 205, 0]} scale={[1, -1, 1]}>
      <group ref={upper}>{renderGroup('upper')}</group>
      <group ref={lower}>{renderGroup('lower')}</group>
    </group>
  );
}
