import type { MLCEngine } from './webllmEngine';
import { relevantKnowledge } from './knowledge';
import type { ChatTurn } from './claude';

// Mode EXPÉRIMENTAL : petit modèle de langage exécuté dans le navigateur (WebLLM + WebGPU).
// Téléchargement de 1 à 2 Go la première fois, puis fonctionne hors ligne.

export interface LocalModel {
  id: string;
  label: string;
  size: string;
  f16: boolean;
}

export const LOCAL_MODELS: LocalModel[] = [
  { id: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC', label: 'Qwen 2.5 · 1,5 milliard', size: '≈ 1,1 Go', f16: true },
  { id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC', label: 'Llama 3.2 · 1 milliard', size: '≈ 0,9 Go', f16: true },
  { id: 'gemma-2-2b-it-q4f16_1-MLC', label: 'Gemma 2 · 2 milliards', size: '≈ 1,5 Go', f16: true },
  { id: 'Qwen2.5-3B-Instruct-q4f16_1-MLC', label: 'Qwen 2.5 · 3 milliards', size: '≈ 2 Go', f16: true },
  { id: 'Qwen2.5-1.5B-Instruct-q4f32_1-MLC', label: 'Qwen 2.5 · 1,5 milliard (compatibilité)', size: '≈ 1,6 Go', f16: false },
  { id: 'Llama-3.2-1B-Instruct-q4f32_1-MLC', label: 'Llama 3.2 · 1 milliard (compatibilité)', size: '≈ 1,1 Go', f16: false },
];

export interface GpuSupport {
  ok: boolean;
  f16: boolean;
  reason?: string;
}

interface GpuLike {
  requestAdapter(): Promise<{ features: { has(f: string): boolean } } | null>;
}

export async function detectWebGPU(): Promise<GpuSupport> {
  const gpu = (navigator as Navigator & { gpu?: GpuLike }).gpu;
  if (!gpu) {
    return {
      ok: false,
      f16: false,
      reason: 'WebGPU n’est pas disponible sur ce navigateur. Sur iPhone, il faut iOS 26 ou plus récent (ou l’activer dans Réglages > Apps > Safari > Avancé > Fonctionnalités).',
    };
  }
  try {
    const adapter = await gpu.requestAdapter();
    if (!adapter) return { ok: false, f16: false, reason: 'Aucun processeur graphique compatible WebGPU n’a été trouvé.' };
    return { ok: true, f16: adapter.features.has('shader-f16') };
  } catch {
    return { ok: false, f16: false, reason: 'WebGPU a refusé de démarrer sur cet appareil.' };
  }
}

let engine: MLCEngine | null = null;
let engineModel: string | null = null;
let loading: Promise<MLCEngine> | null = null;

export function localEngineReady(modelId: string): boolean {
  return engine !== null && engineModel === modelId;
}

export async function loadLocalEngine(modelId: string, onProgress: (p: number, text: string) => void): Promise<MLCEngine> {
  if (engine && engineModel === modelId) return engine;
  if (loading) return loading;
  loading = (async () => {
    if (engine) {
      await engine.unload();
      engine = null;
    }
    const mod = await import('./webllmEngine');
    const e = await mod.createEngine(modelId, onProgress);
    engine = e;
    engineModel = modelId;
    return e;
  })();
  try {
    return await loading;
  } finally {
    loading = null;
  }
}

/** Supprime les fichiers du modèle du cache du navigateur. */
export async function deleteLocalModel(modelId: string): Promise<void> {
  const mod = await import('./webllmEngine');
  if (engine && engineModel === modelId) {
    await engine.unload();
    engine = null;
    engineModel = null;
  }
  await mod.deleteModel(modelId);
}

export async function askLocal(opts: {
  modelId: string;
  history: ChatTurn[];
  question: string;
  context: string;
  onText: (full: string) => void;
  onProgress: (p: number, text: string) => void;
}): Promise<string> {
  const e = await loadLocalEngine(opts.modelId, opts.onProgress);
  const system = `Tu es le coach d'Altius (musculation et nutrition). Réponds en français, en tutoyant, brièvement (moins de 180 mots), avec des listes courtes.
Ne calcule jamais de calories, macros ou charges : utilise uniquement les valeurs du contexte. Si tu n'es pas sûr, dis-le.
Conseils généraux, pas un avis médical.

Connaissances utiles :
${relevantKnowledge(opts.question, 2, 2500)}

${opts.context}`;
  const history = opts.history.slice(-2).map((t) => ({ role: t.role, content: t.text.slice(0, 600) }));
  const chunks = await e.chat.completions.create({
    messages: [{ role: 'system', content: system }, ...history, { role: 'user', content: opts.question }],
    stream: true,
    temperature: 0.4,
    max_tokens: 700,
  });
  let text = '';
  for await (const c of chunks) {
    text += c.choices[0]?.delta?.content ?? '';
    opts.onText(text);
  }
  return text.trim();
}
