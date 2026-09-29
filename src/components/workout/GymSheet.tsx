import { useLiveQuery } from 'dexie-react-hooks';
import { Check, ChevronLeft, Home, Plus, Warehouse } from 'lucide-react';
import { useState } from 'react';
import { db, uid } from '../../lib/db';
import { EQUIPMENT, EQUIPMENT_LABEL, PRESETS } from '../../lib/equipment';
import { updateProfile } from '../../lib/hooks';
import type { EquipmentKey, GymProfile, Profile } from '../../lib/types';
import { Field, SegmentedGlass, Sheet, useToast } from '../ui';

// Profils de salle : il n'existe pas de base publique fiable du matériel par salle,
// c'est donc l'utilisateur qui coche son matériel.

export function GymSheet({ open, onClose, profile }: { open: boolean; onClose: () => void; profile: Profile }) {
  const gyms = useLiveQuery(() => db.gyms.toArray(), []);
  const [editing, setEditing] = useState<GymProfile | null>(null);

  const startNew = () =>
    setEditing({
      id: uid(),
      name: gyms?.length ? `Profil ${gyms.length + 1}` : 'Ma salle',
      kind: 'salle',
      equipment: [...PRESETS.salle],
      createdAt: Date.now(),
    });

  return (
    <Sheet
      open={open}
      onClose={() => {
        setEditing(null);
        onClose();
      }}
      full
      title={
        editing ? (
          <button className="row" style={{ gap: 4 }} onClick={() => setEditing(null)}>
            <ChevronLeft size={22} /> Profils
          </button>
        ) : (
          'Profils de salle'
        )
      }
    >
      {editing ? (
        <GymEditor
          gym={editing}
          isActive={profile.activeGymId === editing.id}
          onDone={() => setEditing(null)}
        />
      ) : (
        <div className="stack">
          <p className="caption" style={{ margin: 0 }}>
            Coche le matériel disponible : la bibliothèque et le générateur de programme n'utiliseront que ces exercices.
          </p>
          {(gyms ?? []).map((g) => {
            const active = profile.activeGymId === g.id;
            return (
              <div key={g.id} className={`checkbox-row ${active ? 'is-active' : ''}`}>
                <button className="row grow" style={{ textAlign: 'left' }} onClick={() => void updateProfile({ activeGymId: g.id })}>
                  <span className={`check ${active ? 'is-on' : ''}`}>{active && <Check size={16} strokeWidth={3} />}</span>
                  {g.kind === 'maison' ? <Home size={18} /> : <Warehouse size={18} />}
                  <span className="grow">
                    <span className="body" style={{ display: 'block' }}>
                      {g.name}
                    </span>
                    <span className="caption">{g.equipment.length} équipements</span>
                  </span>
                </button>
                <button className="btn-link" onClick={() => setEditing(g)}>
                  Modifier
                </button>
              </div>
            );
          })}
          <button className="btn-secondary full" onClick={startNew}>
            <Plus size={18} /> Nouveau profil
          </button>
        </div>
      )}
    </Sheet>
  );
}

function GymEditor({ gym, isActive, onDone }: { gym: GymProfile; isActive: boolean; onDone: () => void }) {
  const toast = useToast();
  const [name, setName] = useState(gym.name);
  const [kind, setKind] = useState(gym.kind);
  const [equipment, setEquipment] = useState<Set<EquipmentKey>>(new Set(gym.equipment));

  const toggle = (k: EquipmentKey) => {
    const next = new Set(equipment);
    if (next.has(k)) next.delete(k);
    else next.add(k);
    setEquipment(next);
  };

  async function save() {
    const g: GymProfile = { ...gym, name: name.trim() || 'Ma salle', kind, equipment: [...equipment] };
    await db.gyms.put(g);
    const count = await db.gyms.count();
    if (isActive || count === 1) await updateProfile({ activeGymId: g.id });
    toast('Profil enregistré');
    onDone();
  }

  async function remove() {
    if (!window.confirm(`Supprimer le profil « ${gym.name} » ?`)) return;
    await db.gyms.delete(gym.id);
    if (isActive) await updateProfile({ activeGymId: null });
    onDone();
  }

  return (
    <div className="stack">
      <Field label="Nom">
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <SegmentedGlass
        options={[
          { value: 'salle', label: 'Salle' },
          { value: 'maison', label: 'Maison' },
        ]}
        value={kind}
        onChange={(k) => {
          setKind(k);
          setEquipment(new Set(PRESETS[k]));
        }}
      />
      <div className="row-between">
        <span className="field-label">Matériel disponible</span>
        <div className="row">
          <button className="btn-link" onClick={() => setEquipment(new Set(EQUIPMENT.map((e) => e.key)))}>
            Tout
          </button>
          <button className="btn-link" onClick={() => setEquipment(new Set(['poids_du_corps']))}>
            Aucun
          </button>
        </div>
      </div>
      <div className="stack-sm">
        {EQUIPMENT.map((e) => {
          const on = equipment.has(e.key) || e.key === 'poids_du_corps';
          return (
            <button
              key={e.key}
              className={`checkbox-row ${on ? 'is-active' : ''}`}
              onClick={() => e.key !== 'poids_du_corps' && toggle(e.key)}
              aria-pressed={on}
            >
              <span className={`check ${on ? 'is-on' : ''}`}>{on && <Check size={16} strokeWidth={3} />}</span>
              <span className="grow">
                <span className="body">{EQUIPMENT_LABEL[e.key]}</span>
                {e.hint && <span className="caption"> · {e.hint}</span>}
              </span>
            </button>
          );
        })}
      </div>
      <button className="btn-primary" onClick={() => void save()}>
        Enregistrer
      </button>
      <button className="btn-secondary full danger" onClick={() => void remove()}>
        Supprimer ce profil
      </button>
    </div>
  );
}
