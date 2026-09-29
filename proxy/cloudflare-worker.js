// Proxy Altius → API Claude (option plus sûre que la clé stockée sur le téléphone).
// La clé API vit uniquement dans les secrets du Worker Cloudflare (gratuit jusqu'à
// 100 000 requêtes/jour). Voir proxy/README.md pour l'installation pas à pas.
//
// Secrets / variables à définir dans Cloudflare :
//   ANTHROPIC_API_KEY  (secret)  ta clé sk-ant-…
//   ALLOWED_ORIGIN     (texte)   ex. https://erwannbtc.github.io
//   ACCESS_TOKEN       (secret, facultatif) mot de passe partagé : si défini, l'app
//                      doit l'envoyer (à coller dans Réglages > Coach IA > clé API).

const API = 'https://api.anthropic.com';

function cors(origin, allowed) {
  return {
    'Access-Control-Allow-Origin': origin === allowed ? origin : allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers':
      'content-type, x-api-key, anthropic-version, anthropic-beta, anthropic-dangerous-direct-browser-access, x-stainless-arch, x-stainless-lang, x-stainless-os, x-stainless-package-version, x-stainless-retry-count, x-stainless-runtime, x-stainless-runtime-version, x-stainless-timeout',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') ?? '';
    const headers = cors(origin, env.ALLOWED_ORIGIN);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (origin !== env.ALLOWED_ORIGIN) return new Response('Origine non autorisée', { status: 403, headers });

    const url = new URL(request.url);
    if (request.method !== 'POST' || url.pathname !== '/v1/messages') {
      return new Response('Non trouvé', { status: 404, headers });
    }
    if (env.ACCESS_TOKEN && request.headers.get('x-api-key') !== env.ACCESS_TOKEN) {
      return new Response('Accès refusé', { status: 401, headers });
    }

    const upstream = await fetch(`${API}/v1/messages`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': request.headers.get('anthropic-version') ?? '2023-06-01',
        ...(request.headers.get('anthropic-beta') ? { 'anthropic-beta': request.headers.get('anthropic-beta') } : {}),
      },
      body: request.body,
    });

    const out = new Headers(upstream.headers);
    for (const [k, v] of Object.entries(headers)) out.set(k, v);
    return new Response(upstream.body, { status: upstream.status, headers: out });
  },
};
