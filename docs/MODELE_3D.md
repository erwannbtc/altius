# Remplacer le corps 3D provisoire par un vrai modèle

## Ce qui est en place

L'écran Accueil affiche un **modèle 3D provisoire** : les tracés de la maquette extrudés en volume avec
Three.js (`src/components/body/ProceduralBody.tsx`). Chaque muscle est un objet 3D séparé et nommé,
coloré selon la « chaleur » calculée par `src/lib/heat.ts`.

## Où déposer le vrai modèle

Place deux fichiers au format **GLB** dans le dossier `public/models/` :

```
public/models/homme.glb
public/models/femme.glb
```

C'est tout : au démarrage, l'app détecte automatiquement ces fichiers et les utilise à la place du
modèle provisoire (sinon elle garde le provisoire). Le modèle est mis à l'échelle et centré tout seul.

## Comment nommer les muscles dans le fichier

Chaque muscle doit être un **mesh séparé** dont le nom contient l'un de ces mots (majuscules, accents
et suffixes gauche/droite `_L`, `_R`, `.l`, `left`, `gauche`… sont ignorés) :

| Zone Altius | Noms reconnus (exemples) |
|---|---|
| Pectoraux | `chest`, `pecs`, `pectoraux`, `pectoralis` |
| Épaules | `shoulders`, `deltoid`, `epaules` |
| Biceps | `biceps` |
| Triceps | `triceps` |
| Avant-bras | `forearms`, `avant_bras` |
| Abdos | `abs`, `abdos`, `rectus_abdominis`, `obliques` |
| Dos (haut) | `upper_back`, `lats`, `latissimus`, `dos_haut` |
| Lombaires | `lower_back`, `lombaires`, `erector` |
| Trapèzes | `traps`, `trapezius` |
| Fessiers | `glutes`, `gluteus`, `fessiers` |
| Quadriceps | `quads`, `quadriceps` |
| Ischios | `hamstrings`, `ischios` |
| Mollets | `calves`, `gastrocnemius`, `mollets` |

Exemple : `Chest_L`, `Chest_R`, `Biceps.l`, `quadriceps_droite`. Tous les autres meshes (tête, mains,
peau, os…) sont affichés en gris foncé comme la silhouette.

## Où trouver un modèle

- **Z-Anatomy** (gratuit, open source, licence CC BY-SA 4.0) : atlas anatomique complet pour Blender,
  <https://www.z-anatomy.com>. Il faut regrouper/renommer les muscles puis exporter en GLB.
- **BodyParts3D** (CC BY-SA, DBCLS) : muscles séparés, très détaillé (à simplifier).
- **Sketchfab** : cherche « muscle anatomy low poly » avec le filtre *Downloadable* et une licence
  compatible (CC). Vérifie que les muscles sont bien des objets séparés.
- **Le faire créer** : sur Fiverr ou Malt, demande « un modèle 3D low-poly homme et femme, style
  écorché, muscles séparés en meshes nommés selon cette liste, export GLB < 5 Mo, Draco facultatif ».
  Compte en général 50 à 200 €.

## Préparer le fichier dans Blender (gratuit)

1. Ouvre le modèle, sélectionne les faces/objets d'un muscle et sépare-les (`P` → *Selection*).
2. Renomme chaque objet selon la table ci-dessus (double-clic dans l'*Outliner*).
3. Réduis le poids si besoin : modificateur *Decimate* (vise < 50 000 triangles au total).
4. *File → Export → glTF 2.0*, format **glb**, coche *Apply Modifiers*.
5. Copie le fichier dans `public/models/`, puis publie (voir le guide principal).

Garde un modèle léger (idéalement moins de 5 Mo) : il est mis en cache pour fonctionner hors ligne.
