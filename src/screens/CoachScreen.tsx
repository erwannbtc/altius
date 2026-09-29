import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowUp, Check, KeyRound, ShieldAlert, Sparkles, Square, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { askClaude, explainError, type ChatTurn } from '../coach/claude';
import { CLAUDE_MODELS } from '../coach/models';
import { buildContext } from '../coach/context';
import { askLocal, LOCAL_MODELS } from '../coach/local';
import { applyProposal } from '../coach/tools';
import { Markdown } from '../components/Markdown';
import { BackgroundGlow, Chip, GlassCard, LargeHeader, ProgressBar, useToast } from '../components/ui';
import { db } from '../lib/db';
import { useCoachSettings, useOnline } from '../lib/hooks';
import type { CoachMessage, Profile, ProgramProposal } from '../lib/types';

const HALOS = [
  { size: 360, left: -140, top: -60, color: 'rgba(255,40,60,0.36)' },
  { size: 320, right: -170, top: 460, color: 'rgba(180,20,40,0.30)' },
];

const SUGGESTIONS = [
  'Analyse ma dernière séance',
  'Que manger ce soir avec ce qu’il me reste ?',
  'Ajuste mon programme selon ma récupération',
  'Comment progresser au développé couché ?',
  'Explique-moi mes calories et macros',
];

export function CoachScreen({ profile, onOpenSettings }: { profile: Profile; onOpenSettings: () => void }) {
  const toast = useToast();
  const settings = useCoachSettings();
  const online = useOnline();
  const messages = useLiveQuery(() => db.coachMessages.orderBy('createdAt').toArray(), []);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ p: number; text: string } | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages?.length, streaming]);

  if (!settings) return null;
  const mode = settings.mode;
  const hasKey = settings.apiKey.trim().length > 0 || settings.proxyUrl.trim().length > 0;
  const ready = mode === 'claude' ? hasKey : settings.localAccepted;
  const modelLabel =
    mode === 'claude'
      ? (CLAUDE_MODELS.find((m) => m.id === settings.model)?.label ?? settings.model)
      : `Local · ${LOCAL_MODELS.find((m) => m.id === settings.localModelId)?.label ?? settings.localModelId}`;

  async function send(text: string) {
    const question = text.trim();
    if (!question || busy || !settings) return;
    if (mode === 'claude' && !online) {
      toast('Hors ligne : le coach Claude a besoin d’internet');
      return;
    }
    setInput('');
    setBusy(true);
    setStreaming('');
    const history: ChatTurn[] = (messages ?? [])
      .filter((m) => !m.error)
      .slice(-16)
      .map((m) => ({ role: m.role, text: m.text }));
    await db.coachMessages.add({ role: 'user', text: question, createdAt: Date.now(), mode });
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    let partial = '';
    try {
      const ctx = await buildContext(mode === 'local');
      let reply: { text: string; proposal?: ProgramProposal };
      if (mode === 'claude') {
        reply = await askClaude({
          settings,
          history,
          question,
          context: ctx.text,
          profile: ctx.profile,
          program: ctx.program,
          signal: ctrl.signal,
          onText: (t) => {
            partial = t;
            setStreaming(t);
          },
        });
      } else {
        const t = await askLocal({
          modelId: settings.localModelId,
          history,
          question,
          context: ctx.text,
          onText: (s) => {
            partial = s;
            setProgress(null);
            setStreaming(s);
          },
          onProgress: (p, label) => setProgress({ p, text: label }),
        });
        reply = { text: t };
      }
      await db.coachMessages.add({
        role: 'assistant',
        text: reply.text || (reply.proposal ? 'Voici ma proposition :' : '…'),
        proposal: reply.proposal,
        createdAt: Date.now(),
        mode,
      });
    } catch (e) {
      const aborted = (e as Error).name === 'AbortError' || ctrl.signal.aborted;
      if (aborted && partial) {
        await db.coachMessages.add({ role: 'assistant', text: `${partial}\n\n(réponse interrompue)`, createdAt: Date.now(), mode });
      } else if (!aborted) {
        const msg = mode === 'claude' ? explainError(e) : `Le modèle local a échoué : ${(e as Error).message}. Essaie un modèle plus petit.`;
        await db.coachMessages.add({ role: 'assistant', text: msg, createdAt: Date.now(), mode, error: true });
      }
    } finally {
      setStreaming(null);
      setProgress(null);
      setBusy(false);
      abortRef.current = null;
    }
  }

  async function clear() {
    if (!window.confirm('Effacer toute la conversation ?')) return;
    await db.coachMessages.clear();
  }

  async function apply(m: CoachMessage) {
    if (!m.proposal || !m.id) return;
    try {
      await applyProposal(m.proposal, profile);
      await db.coachMessages.update(m.id, { proposal: { ...m.proposal, applied: true } });
      toast('Programme mis à jour');
    } catch (e) {
      toast((e as Error).message);
    }
  }

  const empty = !messages?.length && streaming === null;

  return (
    <>
      <BackgroundGlow halos={HALOS} />
      <div className="screen" ref={scrollRef}>
        <div className="screen-content" style={{ paddingBottom: 'calc(210px + var(--safe-bottom))' }}>
          <LargeHeader
            eyebrow={`Coach IA · ${modelLabel}`}
            title="Coach"
            right={
              messages?.length ? (
                <button className="glass icon-btn" aria-label="Effacer la conversation" onClick={() => void clear()}>
                  <Trash2 size={18} />
                </button>
              ) : undefined
            }
          />

          <div className="alert">
            <ShieldAlert size={16} />
            <span>
              Conseils généraux, pas un avis médical. Les chiffres (calories, macros, charges, carte musculaire) sont calculés par l’app ; le
              coach les explique.
            </span>
          </div>

          {!ready && (
            <GlassCard className="card">
              <div className="row">
                <KeyRound size={20} className="accent" />
                <h2 className="h2">{mode === 'claude' ? 'Connecte le coach' : 'Active le mode local'}</h2>
              </div>
              <p className="muted" style={{ margin: 0, fontSize: 14 }}>
                {mode === 'claude'
                  ? 'Ajoute ta clé API Claude (console.anthropic.com) dans les réglages. Elle reste sur ce téléphone.'
                  : 'Le modèle local doit être téléchargé une première fois (1 à 2 Go) depuis les réglages.'}
              </p>
              <button className="btn-primary" onClick={onOpenSettings}>
                Ouvrir les réglages du coach
              </button>
            </GlassCard>
          )}

          {empty && ready && (
            <GlassCard className="card">
              <div className="row">
                <Sparkles size={20} className="accent" />
                <h2 className="h2">Pose ta question</h2>
              </div>
              <p className="muted" style={{ margin: 0, fontSize: 14 }}>
                Le coach connaît ton profil, ton objectif, ton programme, tes dernières séances et ton alimentation du jour. Il peut aussi te
                proposer des modifications de programme à appliquer en un geste.
              </p>
              <div className="chips">
                {SUGGESTIONS.map((s) => (
                  <Chip key={s} small onClick={() => void send(s)}>
                    {s}
                  </Chip>
                ))}
              </div>
            </GlassCard>
          )}

          <div className="chat">
            {(messages ?? []).map((m) =>
              m.role === 'user' ? (
                <div key={m.id} className="bubble user">
                  {m.text}
                </div>
              ) : (
                <div key={m.id} className={`glass bubble assistant ${m.error ? 'error' : ''}`}>
                  <Markdown text={m.text} />
                  {m.proposal && (
                    <div className="proposal glass" style={{ marginTop: 10 }}>
                      <div className="body">{m.proposal.summary}</div>
                      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14 }}>
                        {m.proposal.changes.map((c, i) => (
                          <li key={i}>{c.label}</li>
                        ))}
                      </ul>
                      {m.proposal.applied ? (
                        <span className="caption row" style={{ gap: 6 }}>
                          <Check size={14} /> Appliqué au programme
                        </span>
                      ) : (
                        <button className="btn-primary" style={{ height: 44 }} onClick={() => void apply(m)}>
                          Appliquer au programme
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ),
            )}
            {streaming !== null && (
              <div className="glass bubble assistant">
                {progress ? (
                  <div className="stack-sm" style={{ minWidth: 220 }}>
                    <span className="caption">Chargement du modèle local…</span>
                    <ProgressBar value={progress.p} gradient />
                    <span className="caption" style={{ fontSize: 11 }}>
                      {progress.text.slice(0, 90)}
                    </span>
                  </div>
                ) : streaming ? (
                  <Markdown text={streaming} />
                ) : (
                  <div className="row" style={{ gap: 8 }}>
                    <div className="spinner" /> <span className="muted">Réflexion…</span>
                  </div>
                )}
              </div>
            )}
            <div ref={endRef} />
          </div>
        </div>
      </div>

      <div className="composer">
        <form
          className="glass composer-inner"
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
        >
          <textarea
            ref={taRef}
            className="textarea"
            rows={1}
            placeholder={ready ? 'Écris au coach…' : 'Configure le coach dans les réglages'}
            value={input}
            disabled={!ready}
            onChange={(e) => {
              setInput(e.target.value);
              const el = e.target;
              el.style.height = 'auto';
              el.style.height = `${Math.min(140, el.scrollHeight)}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && window.matchMedia('(pointer: fine)').matches) {
                e.preventDefault();
                void send(input);
              }
            }}
          />
          {busy && mode === 'local' ? (
            <button type="button" className="send-btn" aria-label="Réponse en cours" disabled>
              <div className="spinner" style={{ width: 16, height: 16 }} />
            </button>
          ) : busy ? (
            <button type="button" className="send-btn" aria-label="Arrêter" onClick={() => abortRef.current?.abort()}>
              <Square size={14} fill="currentColor" />
            </button>
          ) : (
            <button type="submit" className="send-btn" aria-label="Envoyer" disabled={!ready || !input.trim()}>
              <ArrowUp size={20} strokeWidth={2.6} />
            </button>
          )}
        </form>
      </div>
    </>
  );
}
