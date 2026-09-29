import type { CoachSettings } from '../lib/types';

export const CLAUDE_MODELS: { id: CoachSettings['model']; label: string; hint: string }[] = [
  { id: 'claude-opus-5-5', label: 'Claude Opus 5.5', hint: 'Le plus fin · ~4 $ / 20 $ par million de jetons' },
  { id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5', hint: 'Rapide et économique · ~2 $ / 10 $' },
  { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5', hint: 'Le moins cher · ~1 $ / 5 $' },
];
