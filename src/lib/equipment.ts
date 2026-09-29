import type { EquipmentKey } from './types';

export interface EquipmentInfo {
  key: EquipmentKey;
  label: string;
  hint: string;
}

export const EQUIPMENT: EquipmentInfo[] = [
  { key: 'poids_du_corps', label: 'Poids du corps', hint: 'Toujours disponible' },
  { key: 'barre', label: 'Barre olympique', hint: 'Barre + disques' },
  { key: 'banc', label: 'Banc de musculation', hint: 'Plat / inclinable' },
  { key: 'halteres', label: 'Haltères', hint: 'Fixes ou réglables' },
  { key: 'barre_ez', label: 'Barre EZ', hint: 'Barre coudée' },
  { key: 'kettlebells', label: 'Kettlebells', hint: '' },
  { key: 'poulies', label: 'Poulies', hint: 'Vis-à-vis, tirages' },
  { key: 'machines', label: 'Machines guidées', hint: 'Presse, leg curl…' },
  { key: 'smith', label: 'Smith machine', hint: 'Barre guidée' },
  { key: 'barre_traction', label: 'Barre de traction', hint: '' },
  { key: 'barres_paralleles', label: 'Barres parallèles', hint: 'Dips' },
  { key: 'elastiques', label: 'Élastiques', hint: '' },
  { key: 'medecine_ball', label: 'Médecine-ball', hint: '' },
  { key: 'swiss_ball', label: 'Swiss ball', hint: '' },
  { key: 'rouleau', label: 'Rouleau de massage', hint: '' },
  { key: 'autre', label: 'Autre', hint: 'Trap bar, sled, TRX…' },
];

export const EQUIPMENT_LABEL: Record<EquipmentKey, string> = Object.fromEntries(
  EQUIPMENT.map((e) => [e.key, e.label]),
) as Record<EquipmentKey, string>;

export const PRESETS: Record<'salle' | 'maison', EquipmentKey[]> = {
  salle: EQUIPMENT.map((e) => e.key),
  maison: ['poids_du_corps', 'halteres', 'elastiques', 'barre_traction', 'banc'],
};

/** Matériel principal de l'exercice (d'après free-exercise-db). */
export function mainEquipment(dbEquipment: string | null, name: string): EquipmentKey {
  switch (dbEquipment) {
    case 'barbell':
      return 'barre';
    case 'e-z curl bar':
      return 'barre_ez';
    case 'dumbbell':
      return 'halteres';
    case 'kettlebells':
      return 'kettlebells';
    case 'cable':
      return 'poulies';
    case 'machine':
      return /smith/i.test(name) ? 'smith' : 'machines';
    case 'bands':
      return 'elastiques';
    case 'medicine ball':
      return 'medecine_ball';
    case 'exercise ball':
      return 'swiss_ball';
    case 'foam roll':
      return 'rouleau';
    case 'other':
      return 'autre';
    default:
      return 'poids_du_corps';
  }
}

/** Tout le matériel nécessaire (matériel principal + accessoires déduits du nom). */
export function requiredEquipment(main: EquipmentKey, name: string): EquipmentKey[] {
  const req = new Set<EquipmentKey>([main]);
  const guided = main === 'machines' || main === 'smith' || main === 'poulies';
  if (/pull-?ups?|chin-?ups?|\bchins?\b|hanging/i.test(name)) req.add('barre_traction');
  if (!guided && /bench|incline|decline|preacher/i.test(name)) req.add('banc');
  if (/\bdips?\b/i.test(name) && !/bench/i.test(name) && !guided) req.add('barres_paralleles');
  req.delete('poids_du_corps');
  return [...req];
}

export function isAvailable(requires: EquipmentKey[], available: Set<EquipmentKey>): boolean {
  return requires.every((k) => available.has(k));
}
