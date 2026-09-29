// Transforme la base free-exercise-db (https://github.com/yuhonas/free-exercise-db, licence Unlicense)
// en un fichier compact embarqué dans l'app (src/data/exercises.json).
// Usage : npm run exercises   (télécharge la base si elle n'est pas déjà dans scripts/raw)
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const rawPath = join(here, 'raw', 'exercises.json');
const outPath = join(here, '..', 'src', 'data', 'exercises.json');
const SOURCE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json';

if (!existsSync(rawPath)) {
  mkdirSync(dirname(rawPath), { recursive: true });
  console.log('Téléchargement de free-exercise-db…');
  const res = await fetch(SOURCE);
  if (!res.ok) throw new Error(`Téléchargement impossible (${res.status})`);
  writeFileSync(rawPath, await res.text());
}

const raw = JSON.parse(readFileSync(rawPath, 'utf8'));
const LEVEL = { beginner: 'b', intermediate: 'i', expert: 'e' };

const out = raw.map((e) => ({
  id: e.id,
  n: e.name,
  eq: e.equipment ?? null,
  lv: LEVEL[e.level] ?? 'b',
  me: e.mechanic ?? null,
  fo: e.force ?? null,
  ca: e.category,
  pm: e.primaryMuscles,
  sm: e.secondaryMuscles,
  in: e.instructions,
  im: e.images,
}));

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(out));
console.log(`${out.length} exercices écrits dans ${outPath}`);
