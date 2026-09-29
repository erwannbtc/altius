# Altius

Application personnelle de sport et d'alimentation (PWA) : séances avec progression automatique,
suivi nutritionnel avec Open Food Facts, carte musculaire 3D et coach IA. Tout est stocké **sur le
téléphone** (IndexedDB) ; l'app fonctionne hors ligne, sauf pour la recherche d'aliments en ligne et
le coach Claude.

**Adresse de l'app : <https://erwannbtc.github.io/altius/>**

---

## 1. Installer l'app sur l'iPhone

1. Ouvre **Safari** (pas Chrome) et va sur <https://erwannbtc.github.io/altius/>.
2. Touche le bouton **Partager** (carré avec une flèche vers le haut).
3. Choisis **Sur l'écran d'accueil**, puis **Ajouter**.
4. Lance Altius depuis l'icône : l'app s'ouvre en plein écran, sans barre Safari.

> Installer l'app est important : Safari peut effacer les données d'un site **non installé** après
> 7 jours sans visite. Une fois installée, tes données restent. Fais quand même une sauvegarde de temps
> en temps (Réglages → Données → Exporter).

**Caméra (scan des codes-barres)** : au premier scan, iOS demande l'autorisation. Si tu as refusé :
Réglages de l'iPhone → Safari → Caméra → Autoriser.

**Mises à jour** : quand une nouvelle version est publiée, l'app se met à jour toute seule au
lancement suivant (ferme-la complètement puis rouvre-la si besoin).

---

## 2. Premiers pas

1. **Bienvenue** : âge, taille, poids, objectif, niveau. Ces infos servent aux calculs.
2. **Séance → Mon matériel** : crée un profil « Salle » ou « Maison » et coche ton matériel.
3. **Séance → Créer mon programme** : choisis le split (Full body, Upper/Lower, PPL, un muscle par
   séance) et le nombre de séances. Altius génère une proposition que tu peux modifier (remplacer,
   ajouter, retirer des exercices, changer séries et répétitions, jours d'entraînement).
4. **Démarrer la séance** : pour chaque série, saisis le poids, les reps et la RPE, puis touche ✓.
   Le chrono de repos démarre tout seul et l'écran reste allumé.
5. **Terminer la séance** : Altius calcule la charge de la prochaine fois (double progression, voir
   plus bas).
6. **Alimentation** : ajuste ton objectif de poids (Modifier), choisis ton régime, puis ajoute tes
   repas avec **+** (recherche, scan, récents ou saisie manuelle).
7. **Coach** : ajoute ta clé API Claude dans les réglages (voir section 4).

### Règles de progression (calculées par l'app, pas par l'IA)

- Haut de la fourchette de reps atteint sur **toutes** les séries → la charge augmente à la séance
  suivante (+2,5 kg barre haut du corps, +5 kg barre bas du corps, +2 kg haltères…).
- Une série sous le bas de la fourchette → échec, on garde la charge.
- 3 séances en échec d'affilée → la charge baisse d'environ 10 %.
- Charges de départ suggérées selon ton poids, ton sexe et ton niveau : ajuste-les dès la 1re séance.

### Carte musculaire

Chaque exercice donne un poids par muscle (principal 1,0 ; secondaire 0,3 à 0,5). La « chaleur » d'un
muscle = somme (séries validées × poids), qui décroît sur 48 h (petits muscles) à 72 h (gros muscles).
Rouge vif = très sollicité récemment ; gris = reposé. Touche un muscle pour voir son nom.

### Calculs nutritionnels

Métabolisme de base (Mifflin-St Jeor) × niveau d'activité = dépense totale, puis ± un déficit ou
surplus selon le rythme choisi (perte 0,5 à 1 % du poids par semaine, prise 0,25 à 0,5 %), avec date
estimée et alertes si l'objectif est irréaliste ou dangereux.

---

## 3. Sauvegarder et changer de téléphone

Réglages (bouton rond en haut de l'Accueil) → **Données** :

- **Exporter** crée un fichier JSON (sur iPhone : « Enregistrer dans Fichiers »).
- **Importer** remplace les données du téléphone par celles du fichier.

Par défaut, la clé API n'est **pas** incluse dans la sauvegarde.

---

## 4. Coach IA

Le coach ne fait aucun calcul : il reçoit tes données et les chiffres déjà calculés par l'app
(profil, objectif, programme, dernières séances, alimentation du jour, carte musculaire), plus une
base de connaissances (`src/coach/knowledge.md`) pour ne pas inventer. Il peut te proposer des
modifications de programme, que tu appliques d'un geste. Ce sont des conseils généraux, pas un avis
médical.

### Mode Claude (par défaut)

1. Crée un compte sur <https://console.anthropic.com>, ajoute un moyen de paiement et un peu de
   crédit, puis **fixe une limite de dépense mensuelle** (Settings → Limits).
2. Settings → **API Keys** → *Create Key* (nomme-la « Altius »), copie-la.
3. Dans Altius : Réglages → **Coach IA** → colle la clé. Choisis le modèle (Opus 5.5 par défaut,
   Sonnet 5.5 ou Haiku 4.5 moins chers).

**Limites de ce stockage** : la clé est enregistrée en clair dans le navigateur du téléphone,
jamais dans le code ni sur GitHub. Mais un script malveillant exécuté sur le même site (faille,
dépendance compromise, autre page publiée sur `erwannbtc.github.io`) pourrait la lire. D'où : une clé
dédiée, une limite de dépense, et la possibilité de la révoquer à tout moment sur la console.

**Option plus sûre (plus tard)** : un petit proxy gratuit sur Cloudflare garde la clé côté serveur.
Tout est expliqué dans [`proxy/README.md`](proxy/README.md).

### Mode local (expérimental)

Réglages → Coach IA → **Local**. Un petit modèle (1 à 3 milliards de paramètres) tourne directement
sur le téléphone grâce à WebGPU (iOS 26 ou plus récent). Le premier lancement télécharge 1 à 2 Go ;
c'est plus lent et nettement moins fiable que Claude, mais ça fonctionne ensuite hors ligne. L'app
vérifie la compatibilité et l'indique clairement si ton appareil ne le permet pas.

---

## 5. Modifier l'app sur ton PC (Windows)

Déjà installés sur ce PC : **Node.js** et **Git**. Les commandes se tapent dans **PowerShell**,
dans le dossier du projet.

```powershell
cd "$env:USERPROFILE\OneDrive\Desktop\Altius"
npm install        # à faire une fois (ou après un changement de dépendances)
npm run dev        # lance l'app en local
```

Ouvre ensuite <http://localhost:5173> dans ton navigateur (Ctrl+C dans PowerShell pour arrêter).
La caméra et l'installation sur iPhone nécessitent le HTTPS : pour tester sur le téléphone, utilise
la version publiée.

### Publier une nouvelle version

```powershell
git add -A
git commit -m "Description du changement"
git push
```

GitHub construit et publie l'app automatiquement en 1 à 2 minutes (onglet **Actions** du dépôt
<https://github.com/erwannbtc/altius>). Rien à payer : GitHub Pages est gratuit pour un dépôt public.

---

## 6. Structure du projet

```
src/
  screens/        Écrans : Accueil, Alimentation, Séance, Coach, Réglages, Bienvenue
  components/     Design system (verre, chips, feuilles), corps 3D, séance, alimentation
  lib/            Logique : base locale (Dexie), calculs nutrition, chaleur, programme, progression
  coach/          Coach IA : contexte, base de connaissances, API Claude, mode local WebLLM
  data/           Exercices (free-exercise-db), noms français, aliments génériques
public/models/    Emplacement des modèles 3D homme.glb / femme.glb (voir docs/MODELE_3D.md)
proxy/            Proxy Cloudflare optionnel pour la clé API
```

Le modèle 3D actuel est provisoire (tracés de la maquette extrudés). Pour le remplacer par un vrai
modèle anatomique : [`docs/MODELE_3D.md`](docs/MODELE_3D.md).

## Sources et licences

- Exercices : [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (Unlicense, domaine public).
- Aliments : [Open Food Facts](https://world.openfoodfacts.org) (ODbL) et valeurs génériques inspirées
  de la table Ciqual (ANSES).
- Design : maquette `SPEC_APP_SPORT_CLAUDE_CODE.md`.
