# App de sport — Spécification complète pour Claude Code

> **À Claude Code :** ce document décrit une maquette validée. Reproduis-la **fidèlement** (couleurs, tailles, rayons, espacements, textes, comportements).
> L'utilisateur ne sait pas coder : travaille de façon autonome, explique chaque étape simplement et termine chaque étape par une commande pour tester (`npx expo start`).

---

## 0. Résumé

App iOS de sport, **thème noir + accent rouge**, style **iOS 26 « Liquid Glass »**, rendu premium.
3 onglets : **Accueil**, **Alimentation**, **Séance**.

- **Accueil** : corps humain (homme/femme) qui tourne sur lui-même, muscles visibles, les muscles travaillés récemment « chauffent » en rouge selon leur intensité. Taille, poids, IMC, objectif.
- **Alimentation** : objectif calorique (anneau + stepper), macros, choix du type d'alimentation, repas du jour.
- **Séance** : semaine, séance du jour avec chrono, exercices avec validation des séries.

---

## 1. Stack technique (à respecter)

| Besoin | Choix |
|---|---|
| Framework | **Expo SDK récent (54+)** + TypeScript |
| Navigation | **expo-router** avec **`NativeTabs`** (`expo-router/unstable-native-tabs`) → vraie tab bar iOS 26 Liquid Glass. Fallback : `Tabs` + tab bar custom en verre (voir §4.6) |
| Effet verre | **`expo-glass-effect`** (`GlassView`, vrai Liquid Glass iOS 26) avec fallback **`expo-blur`** (`BlurView`, `tint="systemChromeMaterialDark"`, intensity 40) si `isLiquidGlassAvailable()` renvoie false |
| Dessin | **react-native-svg** (corps, anneau calories, icônes) |
| Animations | **react-native-reanimated** (rotation du corps, barres, anneau) |
| Dégradés | **expo-linear-gradient** |
| Haptique | **expo-haptics** (léger impact à chaque tap sur un bouton / une série) |
| Icônes | **SF Symbols** via `expo-symbols` (`SymbolView`) — noms indiqués plus bas |
| État | `useState` + un store **zustand** persistant (`AsyncStorage`) pour profil, objectif, régime, séries |

Mode sombre forcé : `app.json` → `"userInterfaceStyle": "dark"`. Barre d'état en clair (`<StatusBar style="light" />`).

---

## 2. Design tokens (fichier `theme.ts`)

```ts
export const colors = {
  bg: '#000000',
  text: '#FFFFFF',
  textSecondary: 'rgba(235,235,245,0.60)',
  textTertiary: 'rgba(235,235,245,0.75)',
  accent: '#FF3B47',        // rouge principal (barres, anneau, points)
  accentText: '#FF4D5A',    // rouge pour du texte/icônes sur fond noir
  accentSoft: 'rgba(255,59,71,0.18)',   // fond des éléments sélectionnés
  accentBorder: 'rgba(255,77,90,0.55)',
  accentDark: '#B3121F',    // début des dégradés de progression
  buttonTop: '#E52A38', buttonBottom: '#B8121F', // bouton principal
  carbs: '#FF9AA0',         // glucides (rouge clair)
  fats: '#8E1622',          // lipides (rouge sombre)
  track: 'rgba(255,255,255,0.08)',      // fond des barres
  muscleBase: 'rgb(38,38,44)',          // muscle « froid »
  muscleHot: 'rgb(255,45,62)',          // muscle « chaud »
  bodySkin: '#17171C', bodyNeutral: '#23232A', // silhouette / tête, mains, genoux, pieds
  glassFill: ['rgba(255,255,255,0.11)', 'rgba(255,255,255,0.035)'], // dégradé 160°
  glassBorder: 'rgba(255,255,255,0.12)',
  glassHighlight: 'rgba(255,255,255,0.22)', // liseré 1px en haut (inset)
};

export const radius = { card: 32, section: 26, tile: 22, row: 22, pill: 999, icon: 14 };
export const space = { screenX: 20, gap: 16, cardPad: 18 };

export const type = {
  largeTitle: { fontSize: 34, fontWeight: '700', letterSpacing: -0.5 },
  eyebrow:    { fontSize: 13, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase', color: colors.textSecondary },
  h2:         { fontSize: 17, fontWeight: '700' },
  h2Large:    { fontSize: 20, fontWeight: '700' },
  body:       { fontSize: 15, fontWeight: '600' },
  caption:    { fontSize: 12, color: colors.textSecondary },
  value:      { fontSize: 22, fontWeight: '700', fontVariant: ['tabular-nums'] },
};
```

Police : **police système iOS (SF Pro)**, pas de police custom. Tous les nombres en `fontVariant: ['tabular-nums']`. Format des nombres en français (`toLocaleString('fr-FR')` → `74,2`, `2 650`).

### Halos d'arrière-plan (sur chaque écran, derrière le contenu)
Des cercles flous rouges pour que le verre ait quelque chose à flouter. Chaque halo : `RadialGradient` SVG (couleur → transparent à 68-70 %) + flou.

| Écran | Halo 1 | Halo 2 |
|---|---|---|
| Accueil | 360×360, `right:-140, top:-90`, rgba(255,40,60,0.42) | 300×300, `left:-150, top:430`, rgba(180,20,40,0.35) |
| Alimentation | 380×380, `left:-120, top:-120`, rgba(255,40,60,0.38) | 300×300, `right:-160, top:520`, rgba(180,20,40,0.32) |
| Séance | 380×380, `right:-150, top:80`, rgba(255,40,60,0.40) | 300×300, `left:-160, top:600`, rgba(180,20,40,0.30) |

---

## 3. Composants réutilisables (dossier `components/`)

### 3.1 `GlassCard`
- `GlassView` (ou `BlurView` en repli) + par-dessus un `LinearGradient` 160° `glassFill` + bordure 1px `glassBorder`.
- Liseré lumineux : une ligne de 1px `glassHighlight` en haut, à l'intérieur (absolute, top 0).
- Ombre : `shadowColor #000, opacity 0.5, radius 18, offset {0,14}`.
- Props : `radius` (défaut 26), `padding` (défaut 18), `style`.

### 3.2 `SegmentedGlass` (ex. Homme / Femme)
- Pilule `GlassCard` radius 999, padding 4, gap 4, segments `flex:1`, hauteur 36.
- Segment inactif : texte 14/600 `textSecondary`. Actif : fond `rgba(255,255,255,0.16)` + liseré haut + ombre légère, texte blanc. Transition animée 250 ms (indicateur qui glisse).

### 3.3 `Chip` (objectif, régime)
- Hauteur 40, padding horizontal 16, radius 999, texte 14/600.
- Inactif : fond `rgba(255,255,255,0.05)`, bordure `rgba(255,255,255,0.12)`, texte `textTertiary`.
- Actif : fond `accentSoft`, bordure `accentBorder`, texte blanc, halo rouge (`shadowColor accent, opacity .25, radius 20`).
- Les chips passent à la ligne (`flexWrap: 'wrap'`, gap 8).

### 3.4 `ProgressBar`
- Piste `track`, hauteur 8 (ou 10), radius 999.
- Remplissage : couleur unie ou `LinearGradient` horizontal `#B3121F → #FF3B47` avec lueur rouge. Largeur animée (reanimated, 400-500 ms).

### 3.5 `LargeHeader`
- Petit surtitre (`eyebrow`) + grand titre (`largeTitle`). Padding haut = safe area + ~8.

### 3.6 Tab bar (voir §4.6)

---

## 4. Écrans

Structure commune : fond `#000`, halos, `ScrollView` (indicateur masqué), padding horizontal 20, padding haut = safe area + 8, padding bas 130 (pour la tab bar flottante), `gap: 16` entre les blocs.

### 4.1 ACCUEIL (`app/(tabs)/index.tsx`)

Ordre des blocs :

1. **En-tête** (row, `justifyContent: space-between`, aligné en bas)
   - Surtitre : date du jour, ex. « MARDI 29 SEPTEMBRE » (dynamique, en français).
   - Titre : « Accueil ».
   - À droite : bouton rond 44×44 en verre avec l'initiale « E » (17/700). `accessibilityLabel="Profil"`.

2. **Sélecteur Homme / Femme** (`SegmentedGlass`). Change la silhouette du corps.

3. **Carte « Carte musculaire »** (`GlassCard` radius 32, hauteur 520, overflow hidden)
   - En haut à gauche (position absolute, 16px des bords) : « Carte musculaire » (17/700) + « 7 derniers jours » (12, secondaire).
   - En haut à droite : petit segmenté sur fond `rgba(0,0,0,0.35)`, bordure `rgba(255,255,255,0.08)`, radius 999, padding 3 : bouton **icône rotation** (SF Symbol `arrow.clockwise`) / **Face** / **Dos**. Boutons hauteur 30, padding 0 11, texte 12/600. Actif : fond `rgba(255,59,71,0.2)`, texte `#FF6B75`.
   - Zone du corps : commence à top 64, hauteur 400, centrée. Voir **§5 Corps 3D**.
   - Socle : ellipse 190×34 sous les pieds (bottom 4 dans la zone), bordure 1px `rgba(255,77,90,0.45)`, dégradé radial rouge 0.35 → transparent, **animation pulse** 3,2 s (opacité 0.55↔1, scale 1↔1.06).
   - Légende en bas (left/right 20, bottom 18) : barre de 6px dégradée `#26262C → #7A1A24 → #FF2D3E`, et dessous « Récupéré » à gauche, « Sollicité » à droite (12, secondaire).

4. **Carte « Zones travaillées »** (`GlassCard`, padding 18, gap 14)
   - Titre « Zones travaillées » + à droite « Intensité » (13, secondaire).
   - 5 lignes : nom (15/600) + quand (12 secondaire) dans une colonne de 104px, puis barre (hauteur 8) remplie à `intensité %` couleur `heatColor(max(i, .35))` avec lueur de la même couleur, puis pourcentage (14/600, largeur 42, aligné à droite).
   - Données :
     | Muscle | Quand | Intensité |
     |---|---|---|
     | Pectoraux | Hier | 95 % |
     | Triceps | Hier | 80 % |
     | Épaules | Hier | 65 % |
     | Abdos | Il y a 3 j | 40 % |
     | Dos | Il y a 4 j | 30 % |

5. **Grille de 3 tuiles** (3 colonnes égales, gap 10), chaque tuile `GlassCard` radius 22, padding 14, gap 6 :
   - Icône rouge 20px (`accentText`) → libellé (12, secondaire) → valeur (22/700) + unité (13/600 secondaire).
   - **Taille** `178 cm` (SF Symbol `ruler`), **Poids** `74,2 kg` (`scalemass`), **IMC** `23,4` (`gauge.with.needle`).
   - IMC = poids / (taille/100)², arrondi à 1 décimale.

6. **Carte « Objectif »** (`GlassCard`, padding 18, gap 14)
   - Titre « Objectif » + à droite l'objectif sélectionné en rouge (13/600 `accentText`).
   - Chips : **Prise de masse**, **Sèche**, **Maintien**, **Performance** (une seule active, défaut « Prise de masse »).
   - Ligne « Départ 70 kg » (gauche) / « Cible 78 kg » (droite), 13 secondaire.
   - Barre de progression hauteur 10 en dégradé rouge : `(poids − départ) / (cible − départ)` bornée 0–1.
   - Texte 15/600 : « Encore 3,8 kg pour atteindre ta cible » (ou « Objectif atteint »).

Profil par défaut (modifiable, stocké) : sexe Homme, taille 178, poids 74,2, départ 70, cible 78, objectif Prise de masse.

### 4.2 ALIMENTATION (`app/(tabs)/alimentation.tsx`)

1. **En-tête** : surtitre « AUJOURD'HUI », titre « Alimentation ».

2. **Carte Calories** (`GlassCard` radius 32, padding 22/18/18, centrée, gap 18)
   - **Anneau** SVG 210×210, rayon 88, épaisseur 16, départ en haut (rotation −90°), extrémités arrondies. Piste `track`, remplissage `#FF3B47` avec lueur rouge. Progression = consommé / objectif (max 1), animée 600 ms.
   - Au centre : icône flamme rouge 22 (`flame`), nombre 44/700 (letterSpacing −1) = kcal restantes, sous-titre 13 secondaire « kcal restantes » (ou « kcal au-dessus » si dépassé, avec la valeur absolue).
   - Dessous, 2 colonnes : « Consommé » / `1 834 kcal` et « Progression » / `69 %` (libellé 12 secondaire, valeur 19/700).
   - **Stepper** : bloc radius 22, fond `rgba(0,0,0,0.3)`, bordure `rgba(255,255,255,0.07)`, padding 12. Bouton rond 44 « − » | au centre « Objectif calorique » (12) + `2 650 kcal` (22/700) | bouton rond 44 « + ». Pas de 50 kcal, bornes 1 200–5 000. Boutons : fond `rgba(255,255,255,0.08)`, bordure `rgba(255,255,255,0.14)`, liseré haut.

3. **Carte « Macronutriments »** : 3 lignes. Pour chacune : pastille 10px de couleur + nom (14/600) à gauche ; à droite « **132** / 166 g » (valeur blanche 600, le reste secondaire) ; barre hauteur 8.
   - Protéines `#FF3B47`, Glucides `#FF9AA0`, Lipides `#8E1622`.
   - Consommé fixe (données démo) : P 132 g, G 196 g, L 58 g → kcal = P×4 + G×4 + L×9 = 1 834.
   - Cibles = objectif × % du régime ÷ 4 (P, G) ou ÷ 9 (L).

4. **Carte « Mon alimentation »** (titre + « Répartition » à droite)
   - Chips : **Équilibrée** (défaut), **Hyperprotéinée**, **Végétarienne**, **Méditerranéenne**, **Cétogène**.
   - Répartition P / G / L (%) :
     | Régime | P | G | L |
     |---|---|---|---|
     | Équilibrée | 25 | 50 | 25 |
     | Hyperprotéinée | 35 | 40 | 25 |
     | Végétarienne | 20 | 55 | 25 |
     | Méditerranéenne | 20 | 45 | 35 |
     | Cétogène | 25 | 5 | 70 |
   - Barre segmentée hauteur 12, radius 999, gap 3 entre segments, largeurs animées, couleurs des macros.
   - Légende : « Protéines 25% · Glucides 50% · Lipides 25% » (13, `rgba(235,235,245,0.7)`), répartie sur la largeur.

5. **« Repas du jour »** (titre 20/700, pas de carte autour) puis 4 lignes `GlassCard` radius 22, padding 14/14/14/16 :
   - Nom (16/600) + description (13 secondaire, 1 ligne tronquée) | kcal (15/600) | bouton rond 36 « + » fond `accentSoft`, icône `accentText`.
   | Repas | Description | kcal |
   |---|---|---|
   | Petit-déjeuner | Flocons d'avoine, banane, whey | 560 kcal |
   | Déjeuner | Poulet, riz basmati, brocolis | 860 kcal |
   | Collation | Skyr, amandes, miel | 414 kcal |
   | Dîner | Rien pour l'instant | — |

### 4.3 SÉANCE (`app/(tabs)/seance.tsx`)

1. **En-tête** : surtitre « SEMAINE 40 » (numéro de semaine dynamique), titre « Séance ».

2. **Bande semaine** (`GlassCard` radius 24, padding 8, 7 colonnes réparties)
   - Chaque jour : largeur 40, padding vertical 8, radius 16 → lettre (12/600 secondaire), numéro (17/700 blanc), point 6px.
   - Point : `done` = rouge avec lueur ; `plan` = `rgba(255,255,255,0.28)` ; repos = rien.
   - Aujourd'hui : fond `accentSoft` + liseré haut.
   - Démo : L28 done, M29 aujourd'hui (plan), M30 repos, J1 plan, V2 plan, S3 plan, D4 repos.

3. **Carte séance du jour** (`GlassCard` radius 32, padding 20, gap 16)
   - Gauche : « AUJOURD'HUI » (13/600 rouge), « Jambes » (28/700), « 6 exercices · ~60 min » (14 secondaire).
   - Droite : **chrono** `00:00` (30/700 tabulaire) + « Durée » (12).
   - Tags muscles : Quadriceps, Ischios, Fessiers, Mollets → 13/600, texte `#FF6B75`, fond `rgba(255,59,71,0.14)`, bordure `rgba(255,77,90,0.3)`, radius 999, padding 6/12.
   - Progression : « Progression » / « **3** / 20 séries » + barre dégradée rouge hauteur 8.
   - **Bouton principal** hauteur 54, radius 999, pleine largeur : dégradé vertical `#E52A38 → #B8121F`, liseré haut `rgba(255,255,255,0.35)`, ombre rouge `rgba(229,42,56,0.45)` radius 30. Icône play + « Démarrer la séance ».
     - En cours : fond `rgba(255,255,255,0.1)` (verre), icône pause + « Mettre en pause ».
     - En pause : icône play + « Reprendre la séance ».
     - Le chrono tourne chaque seconde quand la séance est en cours, garde le temps cumulé en pause.

4. **« Exercices »** (titre 20/700 + à droite « Touchez pour valider une série » 13 secondaire) puis 6 lignes-boutons `GlassCard` radius 22, padding 14/16, gap 12 :
   - Carré 40×40 radius 14 fond `rgba(255,59,71,0.14)` avec numéro (15/700 rouge).
   - Nom (16/600) + « 4 × 6 · Barre · 100 kg » (13 secondaire).
   - À droite : une pastille de 10px par série (gap 5) ; faite = rouge avec lueur, sinon `rgba(255,255,255,0.14)`.
   - **Tap** = valide la série suivante (+ haptique). Quand toutes sont faites, le tap suivant remet à 0. Ligne complète → bordure `accentBorder`. Le premier tap démarre le chrono si ce n'est pas déjà fait.
   | # | Exercice | Séries × reps | Détail |
   |---|---|---|---|
   | 1 | Squat | 4 × 6 | Barre · 100 kg |
   | 2 | Presse à cuisses | 3 × 10 | 180 kg |
   | 3 | Soulevé de terre roumain | 3 × 8 | Barre · 80 kg |
   | 4 | Fentes marchées | 3 × 12 | Haltères · 20 kg |
   | 5 | Leg curl | 3 × 12 | Machine · 45 kg |
   | 6 | Mollets debout | 4 × 15 | Machine · 60 kg |

### 4.6 Tab bar
- **Option A (préférée)** : `NativeTabs` d'expo-router → tab bar Liquid Glass native iOS 26. Icônes SF Symbols : Accueil `house.fill`, Alimentation `fork.knife`, Séance `dumbbell.fill`. Teinte sélectionnée `#FF4D5A`.
- **Option B (repli / iOS < 26)** : tab bar custom flottante : pilule `GlassCard` radius 999, padding 6, gap 4, centrée, `bottom: 26`. Chaque onglet 96×54, radius 999, icône 24 + libellé 11/600. Inactif `textSecondary` ; actif texte/icône `#FF4D5A` + fond `rgba(255,59,71,0.15)` + liseré haut.

---

## 5. Le corps « 3D » (Accueil) — cœur du design

### 5.1 Principe (reproduire la maquette)
Le corps est dessiné en **SVG** (viewBox `0 0 200 440`) en deux vues : **face** et **dos**. On simule la 3D :

- **Rotation continue** autour de l'axe vertical : 1 tour en **14 s**, linéaire, en boucle (reanimated `withRepeat(withTiming(...))`).
- Pour un angle θ :
  - `scaleX = |cos θ|` (le corps s'amincit quand il est de profil),
  - vue affichée = **face** si `cos θ ≥ 0`, sinon **dos**,
  - perspective légère (`transform: [{ perspective: 1100 }, { rotateY }]` si le rendu est propre ; sinon scaleX).
- **Épaisseur** : 9 copies de la silhouette seule (couleurs `#101014 → #16161C → #101014`) empilées derrière, chacune décalée horizontalement de `sin θ × z` avec z = −16, −12, −8, −4, 0, 4, 8, 12, 16 (en unités du viewBox). Ça donne un volume quand le corps tourne. La vue visible est décalée de `sin θ × 18`.
- Le corps est affiché à **88 %** (≈ 176×387 pt), centré dans la zone de 400 pt.
- Boutons **Face** / **Dos** : arrêtent la rotation et animent vers 0° ou 180° (1 s, easing `bezier(.2,.8,.2,1)`). Bouton rotation : reprend la boucle.

### 5.2 Homme / Femme
Même dessin, transformations différentes (appliquées aussi à la silhouette d'épaisseur) :
- Groupe **haut du corps** (tête, cou, torse, bras, muscles du haut) : Homme = aucune ; Femme = `scaleX 0.9` centré sur x=100 → `translate(100 0) scale(0.9 1) translate(-100 0)`.
- Groupe **bas du corps** (jambes) : Femme = `scaleX 1.07` centré sur x=100 → `translate(100 0) scale(1.07 1) translate(-100 0)`.
- Transition animée (300 ms) lors du changement.

### 5.3 Couleur « chaleur » des muscles
```ts
const heat = { chest:.95, triceps:.8, shoulders:.65, abs:.4, traps:.3, back:.3,
               biceps:.25, forearms:.15, quads:.12, hamstrings:.1, glutes:.1, calves:.06 };
// interpolation froid → chaud
function heatColor(i: number) {
  const a = [38,38,44], b = [255,45,62], t = Math.pow(i, 0.8);
  return `rgb(${a.map((v,j)=>Math.round(v+(b[j]-v)*t)).join(',')})`;
}
// lueur selon l'intensité
// i > .75 → lueur forte (blur 7, opacité .95)
// i > .45 → moyenne (blur 4, .7)
// i > .20 → faible (blur 2, .45)
// sinon aucune
```
Lueur : en SVG, filtre `feGaussianBlur` + `feMerge` sur une copie du muscle, couleur `rgba(255,45,62,α)`.
Tous les muscles : contour `rgba(255,255,255,0.07)` épaisseur 0.6. Parties neutres (tête, mains, genoux, pieds) : `#23232A`, contour `rgba(255,255,255,0.05)`. Silhouette sous les muscles : `#17171C`.
Plus tard, `heat` sera calculé à partir de l'historique des séances (intensité qui décroît avec les jours de récupération). Prévoir une fonction `computeHeat(sessions)`.

### 5.4 Tracés SVG exacts (viewBox 0 0 200 440)

**Silhouette** (sert au fond et aux 9 couches d'épaisseur)
```
HAUT (groupe transformé « haut ») :
  ellipse cx=100 cy=32 rx=17 ry=21
  M90 48 L110 48 L113 66 L87 66 Z
  M88 60 L112 60 L128 68 Q140 74 138 104 L132 112 Q130 160 126 192 Q114 202 102 208 L98 208 Q86 202 74 192 Q70 160 68 112 L62 104 Q60 74 72 68 Z
  M64 72 Q48 76 46 100 L44 140 L38 196 L42 218 L48 214 L48 196 L56 144 L62 104 Z
  M136 72 Q152 76 154 100 L156 140 L162 196 L158 218 L152 214 L152 196 L144 144 L138 104 Z
BAS (groupe transformé « bas ») :
  M72 186 Q86 198 98 206 L102 206 Q114 198 128 186 Q134 230 129 282 L127 300 Q133 330 125 370 L129 394 L107 394 L105 300 L102 214 L98 214 L95 300 L93 394 L71 394 L75 370 Q67 330 73 300 L71 282 Q66 230 72 186 Z
```

**Vue FACE**
```
HAUT :
  tête (neutre)      ellipse cx=100 cy=32 rx=16 ry=20
  traps              M89 58 Q78 65 66 71 L90 70 Z
                     M111 58 Q122 65 134 71 L110 70 Z
  shoulders          M64 72 Q48 76 46 100 Q54 96 62 98 Q66 84 72 76 Z
                     M136 72 Q152 76 154 100 Q146 96 138 98 Q134 84 128 76 Z
  chest              M98 76 L75 76 Q65 84 65 100 Q71 114 86 114 Q96 112 98 106 Z
                     M102 76 L125 76 Q135 84 135 100 Q129 114 114 114 Q104 112 102 106 Z
  biceps             M46 103 Q42 120 44 140 Q50 144 56 140 Q60 122 62 102 Q54 99 46 103 Z
                     M154 103 Q158 120 156 140 Q150 144 144 140 Q140 122 138 102 Q146 99 154 103 Z
  forearms           M44 144 Q38 168 38 196 Q44 200 48 196 Q56 170 56 144 Q50 148 44 144 Z
                     M156 144 Q162 168 162 196 Q156 200 152 196 Q144 170 144 144 Q150 148 156 144 Z
  mains (neutre)     ellipse cx=43 cy=208 rx=6 ry=10 ; ellipse cx=157 cy=208 rx=6 ry=10
  abs (6 blocs)      rect x=88/102, y=118/137/156, width=10 height=16 rx=3
  abs bas            M89 175 L98 175 L98 200 Q93 196 89 186 Z
                     M111 175 L102 175 L102 200 Q107 196 111 186 Z
  obliques (abs)     M69 112 Q76 118 85 118 L85 180 Q78 184 74 190 Q71 160 69 112 Z
                     M131 112 Q124 118 115 118 L115 180 Q122 184 126 190 Q129 160 131 112 Z
BAS :
  quads              M74 196 Q68 230 72 280 Q80 292 94 284 Q98 250 98 208 Q88 202 74 196 Z
                     M126 196 Q132 230 128 280 Q120 292 106 284 Q102 250 102 208 Q112 202 126 196 Z
  genoux (neutre)    ellipse cx=84 cy=292 rx=8 ry=6 ; ellipse cx=116 cy=292 rx=8 ry=6
  calves             M74 300 Q70 330 76 370 Q82 378 88 370 Q94 334 92 300 Q84 296 74 300 Z
                     M126 300 Q130 330 124 370 Q118 378 112 370 Q106 334 108 300 Q116 296 126 300 Z
  pieds (neutre)     M75 378 L91 378 L93 392 Q82 396 71 392 Z
                     M125 378 L109 378 L107 392 Q118 396 129 392 Z
```

**Vue DOS**
```
HAUT :
  tête (neutre)      ellipse cx=100 cy=32 rx=16 ry=20
  traps (losange)    M100 54 L118 64 L136 72 L112 86 L100 122 L88 86 L64 72 L82 64 Z
  shoulders          (mêmes tracés que la face)
  back (dorsaux)     M66 100 Q68 130 78 158 Q86 166 91 170 L91 126 L86 90 Q76 86 66 100 Z
                     M134 100 Q132 130 122 158 Q114 166 109 170 L109 126 L114 90 Q124 86 134 100 Z
  back (lombaires)   rect x=92 y=126 width=7 height=64 rx=3 ; rect x=101 y=126 width=7 height=64 rx=3
  triceps            (mêmes tracés que les biceps de face)
  forearms, mains    (mêmes tracés que la face)
BAS :
  glutes             M74 190 Q72 214 82 222 Q94 224 99 214 L99 198 Q88 192 74 190 Z
                     M126 190 Q128 214 118 222 Q106 224 101 214 L101 198 Q112 192 126 190 Z
  hamstrings         M74 226 Q70 256 74 284 Q84 292 94 284 Q98 256 97 228 Q86 230 74 226 Z
                     M126 226 Q130 256 126 284 Q116 292 106 284 Q102 256 103 228 Q114 230 126 226 Z
  calves             M74 300 Q66 326 74 354 Q82 364 90 354 Q96 326 92 300 Q84 296 74 300 Z
                     M126 300 Q134 326 126 354 Q118 364 110 354 Q104 326 108 300 Q116 296 126 300 Z
  pieds (neutre)     (mêmes tracés que la face)
```

### 5.5 Évolution possible (plus tard, pas maintenant)
Remplacer le SVG par un vrai modèle 3D (`@react-three/fiber/native` + `expo-gl` + fichiers `.glb` homme/femme dont chaque muscle est un mesh nommé, coloré avec `heatColor`). **Ne pas le faire dans cette version** : d'abord la reproduction fidèle de la maquette.

---

## 6. Structure de fichiers attendue

```
app/
  _layout.tsx              // thème sombre, StatusBar light
  (tabs)/
    _layout.tsx            // NativeTabs (ou Tabs + GlassTabBar)
    index.tsx              // Accueil
    alimentation.tsx
    seance.tsx
components/
  GlassCard.tsx  SegmentedGlass.tsx  Chip.tsx  ProgressBar.tsx
  LargeHeader.tsx  BackgroundGlow.tsx  GlassTabBar.tsx
  body/
    BodyTurntable.tsx      // rotation + couches d'épaisseur + face/dos
    BodyFront.tsx  BodyBack.tsx  BodySilhouette.tsx
    bodyPaths.ts           // tous les tracés du §5.4
    heat.ts                // heat, heatColor, glowLevel
  nutrition/CalorieRing.tsx  MacroRow.tsx  DietSplitBar.tsx  MealRow.tsx
  workout/WeekStrip.tsx  SessionCard.tsx  ExerciseRow.tsx
store/useAppStore.ts       // zustand + persist
theme.ts
```

---

## 7. Plan de travail (étape par étape)

1. Créer le projet Expo (TypeScript, expo-router), installer les dépendances du §1, forcer le mode sombre.
2. `theme.ts` + composants de base (§3) + halos (§2). Écran de test pour vérifier le rendu verre.
3. Navigation 3 onglets (§4.6).
4. Écran **Accueil** sans le corps (en-tête, segmenté, zones, tuiles, objectif).
5. **Corps** : tracés statiques face/dos → couleurs chaleur + lueur → rotation + épaisseur → boutons Face/Dos → Homme/Femme.
6. Écran **Alimentation** (anneau animé, stepper, macros, régimes, repas).
7. Écran **Séance** (semaine, chrono, séries, bouton principal).
8. Store persistant + haptiques + accessibilité (`accessibilityLabel` sur les boutons-icônes, zones tactiles ≥ 44 pt).
9. Vérification finale avec la checklist ci-dessous.

## 8. Checklist de fidélité
- [ ] Fond noir pur, halos rouges visibles à travers les cartes en verre.
- [ ] Toutes les cartes : verre + bordure 1px + liseré lumineux en haut + ombre.
- [ ] Grand titre 34 pt, surtitre en majuscules, chiffres tabulaires, format français.
- [ ] Tab bar flottante en verre, onglet actif rouge.
- [ ] Le corps tourne (14 s/tour), montre le dos quand il se retourne, a du volume de profil.
- [ ] Pectoraux/triceps/épaules nettement rouges et lumineux, jambes presque grises.
- [ ] Homme/Femme change les proportions.
- [ ] Face/Dos/Rotation fonctionnent.
- [ ] Stepper calories ±50 → anneau, restant et cibles macros se mettent à jour.
- [ ] Changer de régime → cibles macros + barre de répartition animées.
- [ ] Tap exercice → série validée, progression et chrono mis à jour.
- [ ] Aucun emoji, aucune police custom, tout en français.
