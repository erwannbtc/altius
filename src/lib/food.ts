import { GENERIC_FOODS } from '../data/generic-foods';
import { db, uid } from './db';
import { normalize } from './exercises';
import { portionValues } from './nutrition';
import type { Food, MealEntry, MealKey } from './types';

// Base alimentaire : Open Food Facts (API gratuite et ouverte, licence ODbL)
// + une liste d'aliments génériques embarquée + un cache local (IndexedDB)
// des aliments déjà utilisés, disponibles hors ligne.

const OFF_FIELDS =
  'code,product_name,product_name_fr,generic_name_fr,brands,nutriments,image_front_small_url,serving_quantity,serving_size';
const OFF_HOSTS = ['https://world.openfoodfacts.org', 'https://fr.openfoodfacts.org'];

export const MEALS: { key: MealKey; label: string }[] = [
  { key: 'petit_dejeuner', label: 'Petit-déjeuner' },
  { key: 'dejeuner', label: 'Déjeuner' },
  { key: 'collation', label: 'Collation' },
  { key: 'diner', label: 'Dîner' },
];

export const MEAL_LABEL: Record<MealKey, string> = Object.fromEntries(MEALS.map((m) => [m.key, m.label])) as Record<
  MealKey,
  string
>;

interface OffProduct {
  code?: string;
  product_name?: string;
  product_name_fr?: string;
  generic_name_fr?: string;
  brands?: string | string[];
  image_front_small_url?: string;
  serving_quantity?: number | string;
  serving_size?: string;
  nutriments?: Record<string, number | string | undefined>;
}

function num(v: unknown): number | null {
  const n = typeof v === 'string' ? Number(v) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) ? n : null;
}

export function fromOff(p: OffProduct): Food | null {
  const n = p.nutriments ?? {};
  let kcal = num(n['energy-kcal_100g']);
  if (kcal === null) {
    const kj = num(n['energy-kj_100g']) ?? num(n['energy_100g']);
    if (kj !== null) kcal = kj / 4.184;
  }
  const name = (p.product_name_fr || p.product_name || p.generic_name_fr || '').trim();
  if (!name || kcal === null || !p.code) return null;
  const brand = Array.isArray(p.brands) ? p.brands[0] : p.brands?.split(',')[0];
  const serving = num(p.serving_quantity);
  return {
    id: `off-${p.code}`,
    barcode: p.code,
    name,
    brand: brand?.trim() || undefined,
    source: 'off',
    kcal: Math.round(kcal),
    protein: +(num(n['proteins_100g']) ?? 0).toFixed(1),
    carbs: +(num(n['carbohydrates_100g']) ?? 0).toFixed(1),
    fat: +(num(n['fat_100g']) ?? 0).toFixed(1),
    fiber: num(n['fiber_100g']) ?? undefined,
    portion: serving && serving > 0 ? { label: p.serving_size || `1 portion`, grams: serving } : undefined,
    imageUrl: p.image_front_small_url,
  };
}

async function fetchJson(path: string, signal?: AbortSignal): Promise<unknown> {
  let lastErr: unknown;
  for (const host of OFF_HOSTS) {
    try {
      const res = await fetch(`${host}${path}`, { signal });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      if ((e as Error).name === 'AbortError') throw e;
      lastErr = e;
    }
  }
  throw lastErr;
}

/** Produit par code-barres : cache local d'abord, puis Open Food Facts. */
export async function productByBarcode(code: string): Promise<Food | null> {
  const cached = await db.foods.where('barcode').equals(code).first();
  if (cached) return cached;
  const data = (await fetchJson(`/api/v2/product/${encodeURIComponent(code)}.json?fields=${OFF_FIELDS}`)) as {
    status?: number;
    product?: OffProduct;
  } | null;
  if (!data || !data.product) return null;
  const food = fromOff({ ...data.product, code: data.product.code ?? code });
  if (food) await cacheFood(food);
  return food;
}

/** Recherche en ligne sur Open Food Facts (limitée à ~10 requêtes/min par l'API). */
export async function searchOff(query: string, signal?: AbortSignal): Promise<Food[]> {
  const params = new URLSearchParams({
    search_terms: query,
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: '30',
    lc: 'fr',
    sort_by: 'unique_scans_n',
    fields: OFF_FIELDS,
  });
  const data = (await fetchJson(`/cgi/search.pl?${params}`, signal)) as { products?: OffProduct[] } | null;
  const out: Food[] = [];
  const seen = new Set<string>();
  for (const p of data?.products ?? []) {
    const f = fromOff(p);
    if (f && !seen.has(f.id)) {
      seen.add(f.id);
      out.push(f);
    }
  }
  return out;
}

const GENERIC: Food[] = GENERIC_FOODS.map((g) => ({
  id: g.id,
  name: g.name,
  source: 'generic',
  kcal: g.kcal,
  protein: g.protein,
  carbs: g.carbs,
  fat: g.fat,
  fiber: g.fiber,
  portion: g.portion,
}));

/** Recherche hors ligne : aliments génériques + cache local. */
export async function searchLocal(query: string): Promise<Food[]> {
  const q = normalize(query);
  const words = q.split(' ').filter(Boolean);
  const match = (f: Food) => {
    const hay = normalize(`${f.name} ${f.brand ?? ''}`);
    return words.every((w) => hay.includes(w));
  };
  const cached = (await db.foods.toArray()).filter(match);
  const cachedIds = new Set(cached.map((f) => f.id));
  const generic = GENERIC.filter((f) => !cachedIds.has(f.id) && match(f));
  cached.sort((a, b) => (b.useCount ?? 0) - (a.useCount ?? 0));
  return [...cached, ...generic].slice(0, 40);
}

export async function recentFoods(limit = 30): Promise<Food[]> {
  return db.foods.orderBy('lastUsedAt').reverse().filter((f) => !!f.lastUsedAt).limit(limit).toArray();
}

export async function cacheFood(food: Food): Promise<void> {
  const existing = await db.foods.get(food.id);
  await db.foods.put({ ...food, lastUsedAt: existing?.lastUsedAt, useCount: existing?.useCount });
}

export async function createManualFood(input: Omit<Food, 'id' | 'source'>): Promise<Food> {
  const food: Food = { ...input, id: `man-${uid()}`, source: 'manual' };
  await db.foods.put(food);
  return food;
}

export async function addToMeal(food: Food, grams: number, meal: MealKey, date: string): Promise<void> {
  const v = portionValues(food, grams);
  const entry: MealEntry = {
    date,
    meal,
    foodId: food.id,
    name: food.brand ? `${food.name} · ${food.brand}` : food.name,
    grams,
    ...v,
    createdAt: Date.now(),
  };
  await db.transaction('rw', db.meals, db.foods, async () => {
    await db.meals.add(entry);
    const existing = await db.foods.get(food.id);
    await db.foods.put({
      ...food,
      lastUsedAt: Date.now(),
      useCount: (existing?.useCount ?? 0) + 1,
    });
  });
}

export async function removeEntry(id: number): Promise<void> {
  await db.meals.delete(id);
}

export async function updateEntryGrams(entry: MealEntry, grams: number): Promise<void> {
  const food = await db.foods.get(entry.foodId);
  if (!food || !entry.id) return;
  await db.meals.update(entry.id, { grams, ...portionValues(food, grams) });
}
