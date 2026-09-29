// Chargé uniquement si le mode local est activé (fichier séparé, plusieurs Mo).
import { CreateMLCEngine, deleteModelAllInfoInCache, type MLCEngine } from '@mlc-ai/web-llm';

export type { MLCEngine };

export async function deleteModel(modelId: string): Promise<void> {
  await deleteModelAllInfoInCache(modelId);
}

export async function createEngine(modelId: string, onProgress: (progress: number, text: string) => void): Promise<MLCEngine> {
  return CreateMLCEngine(modelId, {
    initProgressCallback: (r) => onProgress(r.progress, r.text),
  });
}
