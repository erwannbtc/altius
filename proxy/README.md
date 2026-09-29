# Proxy sécurisé pour le coach IA (optionnel, pour plus tard)

Par défaut, Altius appelle l'API Claude directement depuis le téléphone : la clé API est stockée
sur l'appareil (IndexedDB). C'est simple, mais la clé reste lisible par tout script exécuté sur le même
site. Ce petit proxy garde la clé **sur un serveur** : le téléphone ne la connaît plus.

## Mise en place (≈ 10 minutes, gratuit)

1. Crée un compte sur <https://dash.cloudflare.com> (gratuit).
2. Menu **Workers & Pages** → **Create** → **Create Worker** → nomme-le `altius-proxy` → **Deploy**.
3. Clique **Edit code**, remplace tout le contenu par celui de `cloudflare-worker.js`, puis **Deploy**.
4. Dans **Settings → Variables and Secrets** du Worker, ajoute :
   - `ANTHROPIC_API_KEY` (type *Secret*) : ta clé `sk-ant-…`
   - `ALLOWED_ORIGIN` (type *Text*) : l'adresse de ton app **sans** le chemin, par exemple
     `https://erwannbtc.github.io`
   - `ACCESS_TOKEN` (type *Secret*, conseillé) : un mot de passe long de ton choix.
5. Copie l'adresse du Worker (ex. `https://altius-proxy.ton-compte.workers.dev`).
6. Dans Altius : **Réglages → Coach IA** :
   - colle l'adresse dans **URL d'un proxy** ;
   - dans **Clé API**, remplace la vraie clé par le mot de passe `ACCESS_TOKEN` (ou laisse vide si tu
     n'en as pas défini).

La vraie clé n'est alors plus jamais sur le téléphone. Pense quand même à fixer une limite de
dépense sur <https://console.anthropic.com>.
