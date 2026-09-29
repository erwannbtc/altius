import Anthropic from '@anthropic-ai/sdk';
import type { CoachSettings, Profile, Program, ProgramProposal } from '../lib/types';
import { KNOWLEDGE } from './knowledge';
import { buildProposal, PROGRAM_TOOL, PROGRAM_TOOL_NAME } from './tools';

// Couche 3 : le modèle de langage discute et explique. Il ne calcule rien :
// les chiffres viennent du contexte construit par l'app.

export const SYSTEM_PROMPT = `Tu es le coach d'Altius, une application personnelle de musculation et de nutrition. Tu parles à son unique utilisateur.

Règles :
1. Tu ne calcules jamais toi-même les calories, les macros, les charges, la progression ni la chaleur musculaire : l'app les calcule et te les donne dans <contexte>. Cite ces valeurs telles quelles. Si une donnée manque, dis-le et explique où la renseigner dans l'app.
2. Appuie-toi sur la base de connaissances ci-dessous. Si une question sort de cette base et que tu n'es pas sûr, dis-le clairement plutôt que d'inventer.
3. Ce sont des conseils généraux, pas un avis médical. En cas de douleur, blessure, maladie, trouble alimentaire, grossesse, traitement médical ou objectif extrême, recommande un professionnel de santé.
4. Réponds en français, en tutoyant, de façon concise et concrète, lisible sur un téléphone : paragraphes courts, listes à puces, pas de tableaux larges. Commence directement par la réponse.
5. Pour modifier le programme, utilise l'outil ${PROGRAM_TOOL_NAME} : l'utilisateur appliquera lui-même la proposition. Pour les exercices existants, utilise les ID exacts indiqués entre crochets dans le contexte.
6. Pour l'alimentation, propose des idées de repas cohérentes avec le régime choisi et les macros restantes du jour, sans recalculer les cibles.

<base_de_connaissances>
${KNOWLEDGE}
</base_de_connaissances>`;

export interface ChatTurn {
  role: 'user' | 'assistant';
  text: string;
}

export interface CoachReply {
  text: string;
  proposal?: ProgramProposal;
}

function client(settings: CoachSettings): Anthropic {
  const viaProxy = settings.proxyUrl.trim().length > 0;
  return new Anthropic({
    // Avec un proxy, la vraie clé reste sur le serveur : le champ « clé » sert alors
    // de mot de passe d'accès au proxy (ACCESS_TOKEN), ou d'une valeur factice.
    apiKey: viaProxy ? settings.apiKey.trim() || 'via-proxy' : settings.apiKey.trim(),
    baseURL: viaProxy ? settings.proxyUrl.trim().replace(/\/$/, '') : undefined,
    // Ajoute l'en-tête anthropic-dangerous-direct-browser-access: true
    dangerouslyAllowBrowser: true,
    maxRetries: 2,
  });
}

export function explainError(e: unknown): string {
  if (e instanceof Anthropic.AuthenticationError) return 'Clé API refusée. Vérifie-la dans Réglages > Coach IA.';
  if (e instanceof Anthropic.PermissionDeniedError) return 'Cette clé n’a pas accès à ce modèle. Choisis-en un autre dans les Réglages.';
  if (e instanceof Anthropic.RateLimitError) return 'Trop de requêtes ou crédit épuisé. Réessaie dans un moment et vérifie ton solde sur console.anthropic.com.';
  if (e instanceof Anthropic.BadRequestError) return `Requête refusée par l’API : ${e.message}`;
  if (e instanceof Anthropic.APIConnectionError) return 'Impossible de joindre l’API (connexion internet ?).';
  if (e instanceof Anthropic.APIError) return `Erreur de l’API (${e.status ?? '?'}). Réessaie.`;
  return `Erreur : ${(e as Error)?.message ?? String(e)}`;
}

/**
 * Envoie la conversation à Claude (streaming). L'historique est renvoyé en texte seul
 * (append-only) ; le contexte à jour accompagne uniquement la dernière question.
 */
export async function askClaude(opts: {
  settings: CoachSettings;
  history: ChatTurn[];
  question: string;
  context: string;
  profile: Profile;
  program: Program | undefined;
  onText: (full: string) => void;
  signal?: AbortSignal;
}): Promise<CoachReply> {
  const { settings } = opts;
  const api = client(settings);
  const isHaiku = settings.model === 'claude-haiku-4-5';

  const messages: Anthropic.Beta.BetaMessageParam[] = [];
  for (const t of opts.history) {
    if (!t.text.trim()) continue;
    messages.push({ role: t.role, content: t.text });
  }
  while (messages.length && messages[0].role !== 'user') messages.shift();
  messages.push({
    role: 'user',
    content: [
      { type: 'text', text: opts.context },
      { type: 'text', text: opts.question },
    ],
  });

  let text = '';
  let proposal: ProgramProposal | undefined;
  // Options avancées (réflexion adaptative, effort, repli serveur) : désactivées
  // automatiquement si l'API ou le proxy les refuse.
  let extras = !isHaiku;

  for (let turn = 0; turn < 5; turn++) {
    const params = {
      model: settings.model,
      max_tokens: 8000,
      system: [{ type: 'text' as const, text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' as const } }],
      tools: [PROGRAM_TOOL],
      messages,
      ...(!extras
        ? {}
        : {
            thinking: { type: 'adaptive' as const },
            output_config: { effort: 'medium' as const },
            // Si les filtres de sécurité refusent à tort, l'API relance sur le modèle recommandé.
            betas: ['server-side-fallback-2026-07-01'],
            fallbacks: 'default',
          }),
    } as unknown as Anthropic.Beta.MessageCreateParamsStreaming;

    const stream = api.beta.messages.stream(params, { signal: opts.signal });
    const before = text;
    stream.on('text', (delta) => {
      text += delta;
      opts.onText(text);
    });
    let message: Anthropic.Beta.BetaMessage;
    try {
      message = await stream.finalMessage();
    } catch (e) {
      if (e instanceof Anthropic.BadRequestError && extras && !text) {
        extras = false;
        continue;
      }
      if (e instanceof Anthropic.APIError || (e as Error).name === 'AbortError' || turn >= 3) throw e;
      text = before; // entrée d'outil illisible : on relance ce tour
      continue;
    }

    if (message.stop_reason === 'refusal') {
      text += (text ? '\n\n' : '') + 'Je ne peux pas répondre à cette demande.';
      opts.onText(text);
      break;
    }
    if (message.stop_reason === 'pause_turn') {
      messages.push({ role: 'assistant', content: message.content as Anthropic.Beta.BetaContentBlockParam[] });
      continue;
    }
    const toolUses = message.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === 'tool_use');
    if (!toolUses.length || message.stop_reason !== 'tool_use') break;

    messages.push({ role: 'assistant', content: message.content as Anthropic.Beta.BetaContentBlockParam[] });
    const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
    for (const tu of toolUses) {
      if (tu.name !== PROGRAM_TOOL_NAME) {
        results.push({ type: 'tool_result', tool_use_id: tu.id, content: 'Outil inconnu.', is_error: true });
        continue;
      }
      const built = await buildProposal(tu.input, opts.profile, opts.program);
      if (built.proposal) proposal = built.proposal;
      results.push({ type: 'tool_result', tool_use_id: tu.id, content: built.report, is_error: !built.proposal });
    }
    messages.push({ role: 'user', content: results });
    if (text && !text.endsWith('\n')) {
      text += '\n\n';
      opts.onText(text);
    }
  }

  return { text: text.trim(), proposal };
}
