import { AlertTriangle, Cpu, Download, Eye, EyeOff, Info, Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { CLAUDE_MODELS } from '../coach/models';
import { deleteLocalModel, detectWebGPU, loadLocalEngine, LOCAL_MODELS, type GpuSupport } from '../coach/local';
import { Alert, Chip, Field, NumberField, ProgressBar, SegmentedGlass, Sheet, useToast } from '../components/ui';
import { downloadBackup, importData, wipeAll } from '../lib/backup';
import { requestPersistence } from '../lib/db';
import { isIOS, isStandalone } from '../lib/device';
import { saveCoachSettings, updateProfile, useCoachSettings } from '../lib/hooks';
import { ACTIVITY } from '../lib/nutrition';
import type { ActivityLevel, ClaudeModel, Level, Profile } from '../lib/types';

export type SettingsSection = 'profil' | 'coach' | 'donnees';

export function SettingsSheet({
  open,
  onClose,
  profile,
  initialSection = 'profil',
}: {
  open: boolean;
  onClose: () => void;
  profile: Profile;
  initialSection?: SettingsSection;
}) {
  const [section, setSection] = useState<SettingsSection>(initialSection);
  useEffect(() => {
    if (open) setSection(initialSection);
  }, [open, initialSection]);
  return (
    <Sheet open={open} onClose={onClose} full title="Réglages">
      <SegmentedGlass
        options={[
          { value: 'profil', label: 'Profil' },
          { value: 'coach', label: 'Coach IA' },
          { value: 'donnees', label: 'Données' },
        ]}
        value={section}
        onChange={setSection}
      />
      {section === 'profil' && <ProfileSection profile={profile} />}
      {section === 'coach' && <CoachSection />}
      {section === 'donnees' && <DataSection />}
    </Sheet>
  );
}

function ProfileSection({ profile }: { profile: Profile }) {
  const age = new Date().getFullYear() - profile.birthYear;
  return (
    <div className="stack">
      <Field label="Prénom">
        <input className="input" value={profile.name} onChange={(e) => void updateProfile({ name: e.target.value })} placeholder="Ton prénom" />
      </Field>
      <SegmentedGlass
        options={[
          { value: 'homme', label: 'Homme' },
          { value: 'femme', label: 'Femme' },
        ]}
        value={profile.sex}
        onChange={(sex) => void updateProfile({ sex })}
      />
      <div className="grid-2">
        <NumberField
          label="Âge"
          value={age}
          suffix="ans"
          inputMode="numeric"
          onChange={(v) => v && v > 10 && v < 100 && void updateProfile({ birthYear: new Date().getFullYear() - v })}
        />
        <NumberField label="Taille" value={profile.heightCm} suffix="cm" inputMode="numeric" onChange={(v) => v && v > 100 && v < 250 && void updateProfile({ heightCm: v })} />
      </div>
      <Field label="Niveau d’activité">
        <select className="select" value={profile.activity} onChange={(e) => void updateProfile({ activity: e.target.value as ActivityLevel })}>
          {(Object.keys(ACTIVITY) as ActivityLevel[]).map((a) => (
            <option key={a} value={a}>
              {ACTIVITY[a].label} — {ACTIVITY[a].hint}
            </option>
          ))}
        </select>
      </Field>
      <div className="field">
        <span className="field-label">Niveau en musculation (charges de départ suggérées)</span>
        <div className="chips">
          {(
            [
              ['debutant', 'Débutant'],
              ['intermediaire', 'Intermédiaire'],
              ['avance', 'Avancé'],
            ] as [Level, string][]
          ).map(([k, l]) => (
            <Chip key={k} active={profile.level === k} onClick={() => void updateProfile({ level: k })}>
              {l}
            </Chip>
          ))}
        </div>
      </div>
      <p className="caption">Le poids se met à jour depuis l’Accueil (tuile Poids), pour garder un historique.</p>
    </div>
  );
}

function CoachSection() {
  const toast = useToast();
  const settings = useCoachSettings();
  const [showKey, setShowKey] = useState(false);
  const [gpu, setGpu] = useState<GpuSupport | null>(null);
  const [dl, setDl] = useState<{ p: number; text: string } | null>(null);

  useEffect(() => {
    void detectWebGPU().then(setGpu);
  }, []);

  if (!settings) return null;

  const models = LOCAL_MODELS.filter((m) => (gpu?.f16 ? true : !m.f16));

  async function download() {
    if (!settings) return;
    await requestPersistence();
    setDl({ p: 0, text: 'Préparation…' });
    try {
      await loadLocalEngine(settings.localModelId, (p, text) => setDl({ p, text }));
      await saveCoachSettings({ localAccepted: true, mode: 'local' });
      toast('Modèle local prêt');
    } catch (e) {
      toast(`Échec : ${(e as Error).message}`);
    } finally {
      setDl(null);
    }
  }

  return (
    <div className="stack">
      <SegmentedGlass
        options={[
          { value: 'claude', label: 'Claude (API)' },
          { value: 'local', label: 'Local (expérimental)' },
        ]}
        value={settings.mode}
        onChange={(mode) => void saveCoachSettings({ mode })}
      />

      {settings.mode === 'claude' ? (
        <>
          <Field label="Clé API Anthropic">
            <div className="input-group">
              <input
                className="input"
                type={showKey ? 'text' : 'password'}
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                placeholder="sk-ant-…"
                value={settings.apiKey}
                onChange={(e) => void saveCoachSettings({ apiKey: e.target.value.trim() })}
              />
              <button
                className="input-suffix"
                style={{ pointerEvents: 'auto' }}
                onClick={() => setShowKey(!showKey)}
                aria-label={showKey ? 'Masquer la clé' : 'Afficher la clé'}
              >
                {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </Field>
          <p className="caption" style={{ margin: '-6px 0 0' }}>
            Crée une clé sur console.anthropic.com (Settings → API Keys) et fixe une limite de dépense mensuelle.
          </p>
          <div className="field">
            <span className="field-label">Modèle</span>
            <div className="stack-sm">
              {CLAUDE_MODELS.map((m) => (
                <button
                  key={m.id}
                  className={`checkbox-row ${settings.model === m.id ? 'is-active' : ''}`}
                  onClick={() => void saveCoachSettings({ model: m.id as ClaudeModel })}
                >
                  <span className={`check ${settings.model === m.id ? 'is-on' : ''}`} />
                  <span className="grow">
                    <span className="body" style={{ display: 'block' }}>
                      {m.label}
                    </span>
                    <span className="caption">{m.hint}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
          <Alert level="warning" icon={<AlertTriangle size={16} />}>
            <strong>Limites de ce stockage.</strong> La clé est enregistrée en clair dans la base locale de ce navigateur (IndexedDB), jamais
            dans le code ni sur GitHub. Mais tout script exécuté sur la même origine pourrait la lire (faille, extension, autre app publiée sur
            ton même domaine github.io), et une sauvegarde JSON exportée « avec la clé » la contient. Utilise une clé dédiée à Altius avec un
            plafond de dépense, et révoque-la en cas de doute.
          </Alert>
          <Field label="URL d’un proxy (option plus sûre, facultatif)">
            <input
              className="input"
              inputMode="url"
              autoCapitalize="off"
              spellCheck={false}
              placeholder="https://altius-proxy.ton-compte.workers.dev"
              value={settings.proxyUrl}
              onChange={(e) => void saveCoachSettings({ proxyUrl: e.target.value.trim() })}
            />
          </Field>
          <p className="caption" style={{ margin: '-6px 0 0' }}>
            Avec un petit proxy (ex. Cloudflare Worker gratuit, code fourni dans le dossier <code>proxy/</code> du projet), la clé reste sur le
            serveur et n’est plus stockée sur le téléphone. Laisse vide pour appeler l’API directement.
          </p>
        </>
      ) : (
        <>
          <Alert level="warning" icon={<Cpu size={16} />}>
            <strong>Mode expérimental.</strong> Un petit modèle (1 à 3 milliards de paramètres) tourne directement sur le téléphone via WebGPU.
            Le premier lancement télécharge 1 à 2 Go (utilise le Wi-Fi), c’est plus lent et nettement moins fiable que Claude, et il ne peut pas
            modifier ton programme. Il fonctionne ensuite hors ligne.
          </Alert>
          {gpu === null ? (
            <div className="row">
              <div className="spinner" /> <span className="muted">Détection de WebGPU…</span>
            </div>
          ) : gpu.ok ? (
            <Alert level="info" icon={<Info size={16} />}>
              WebGPU disponible{gpu.f16 ? '' : ' (sans demi-précision : modèles « compatibilité » uniquement)'}.
            </Alert>
          ) : (
            <Alert level="danger" icon={<AlertTriangle size={16} />}>
              {gpu.reason} Le mode local n’est pas utilisable sur cet appareil : garde le mode Claude.
            </Alert>
          )}
          {gpu?.ok && (
            <>
              <div className="field">
                <span className="field-label">Modèle local</span>
                <div className="stack-sm">
                  {models.map((m) => (
                    <button
                      key={m.id}
                      className={`checkbox-row ${settings.localModelId === m.id ? 'is-active' : ''}`}
                      onClick={() => void saveCoachSettings({ localModelId: m.id, localAccepted: false })}
                    >
                      <span className={`check ${settings.localModelId === m.id ? 'is-on' : ''}`} />
                      <span className="grow">
                        <span className="body" style={{ display: 'block' }}>
                          {m.label}
                        </span>
                        <span className="caption">Téléchargement {m.size}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              {dl ? (
                <div className="stack-sm">
                  <ProgressBar value={dl.p} gradient />
                  <span className="caption">{dl.text}</span>
                </div>
              ) : settings.localAccepted ? (
                <div className="stack-sm">
                  <Alert level="info" icon={<Info size={16} />}>
                    Modèle téléchargé et activé.
                  </Alert>
                  <button
                    className="btn-secondary full danger"
                    onClick={() => {
                      if (!window.confirm('Supprimer le modèle local du téléphone ?')) return;
                      void deleteLocalModel(settings.localModelId).then(() => saveCoachSettings({ localAccepted: false, mode: 'claude' }));
                    }}
                  >
                    Supprimer le modèle (libère l’espace)
                  </button>
                </div>
              ) : (
                <button
                  className="btn-primary"
                  onClick={() => {
                    const m = LOCAL_MODELS.find((x) => x.id === settings.localModelId);
                    if (window.confirm(`Télécharger ${m?.label ?? 'le modèle'} (${m?.size ?? '1-2 Go'}) ? Utilise le Wi-Fi.`)) void download();
                  }}
                >
                  <Download size={18} /> Télécharger et activer
                </button>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

function DataSection() {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [withKey, setWithKey] = useState(false);
  const [persisted, setPersisted] = useState<boolean | null>(null);

  useEffect(() => {
    void navigator.storage?.persisted?.().then(setPersisted);
  }, []);

  return (
    <div className="stack">
      <p className="muted" style={{ margin: 0, fontSize: 14 }}>
        Toutes tes données restent sur ce téléphone (IndexedDB). Exporte une sauvegarde régulièrement : elle permet aussi de changer de téléphone.
      </p>
      <button className="btn-primary" onClick={() => void downloadBackup(withKey).then(() => toast('Sauvegarde créée'))}>
        <Download size={18} /> Exporter mes données (JSON)
      </button>
      <button className={`checkbox-row ${withKey ? 'is-active' : ''}`} onClick={() => setWithKey(!withKey)}>
        <span className={`check ${withKey ? 'is-on' : ''}`} />
        <span className="grow">
          <span className="body">Inclure la clé API</span>
          <span className="caption"> · déconseillé si le fichier est partagé</span>
        </span>
      </button>
      <button className="btn-secondary full" onClick={() => fileRef.current?.click()}>
        <Upload size={18} /> Importer une sauvegarde
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (!f) return;
          if (!window.confirm('Importer cette sauvegarde ? Les données actuelles seront remplacées.')) return;
          try {
            const { counts } = await importData(await f.text());
            toast(`Import réussi (${counts.sessions ?? 0} séances, ${counts.meals ?? 0} aliments saisis)`);
          } catch (err) {
            toast((err as Error).message);
          }
        }}
      />
      <div className="divider" />
      <Alert level="info" icon={<Info size={16} />}>
        {isIOS() && !isStandalone()
          ? 'Sur iPhone, installe Altius sur l’écran d’accueil (Partager → Sur l’écran d’accueil) : Safari peut effacer les données des sites non installés après 7 jours sans visite.'
          : persisted
            ? 'Stockage persistant accordé : le navigateur ne videra pas tes données automatiquement.'
            : 'Stockage standard. Garde des sauvegardes régulières.'}
      </Alert>
      <button
        className="btn-secondary full danger"
        onClick={async () => {
          if (!window.confirm('Effacer TOUTES les données d’Altius sur ce téléphone ? Cette action est définitive.')) return;
          if (!window.confirm('Dernière confirmation : tout effacer ?')) return;
          await wipeAll();
          location.reload();
        }}
      >
        Tout effacer
      </button>
      <p className="caption">
        Sources : exercices free-exercise-db (domaine public) · aliments Open Food Facts (ODbL) · valeurs génériques inspirées de la table
        Ciqual. Altius v{__APP_VERSION__}.
      </p>
    </div>
  );
}
