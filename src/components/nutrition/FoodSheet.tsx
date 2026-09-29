import { ChevronLeft, History, PenLine, ScanBarcode, Search, WifiOff } from 'lucide-react';
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { addToMeal, createManualFood, MEAL_LABEL, productByBarcode, recentFoods, searchLocal, searchOff } from '../../lib/food';
import { fmt, fmtMax } from '../../lib/format';
import { useOnline } from '../../lib/hooks';
import { portionValues } from '../../lib/nutrition';
import type { Food, MealKey } from '../../lib/types';
import { Chip, Field, NumberField, Sheet, useToast } from '../ui';

const BarcodeScanner = lazy(() => import('./BarcodeScanner').then((m) => ({ default: m.BarcodeScanner })));

type Tab = 'recherche' | 'scan' | 'recents' | 'manuel';

export function FoodSheet({
  open,
  meal,
  date,
  onClose,
}: {
  open: boolean;
  meal: MealKey;
  date: string;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>('recherche');
  const [selected, setSelected] = useState<Food | null>(null);
  const [prefillBarcode, setPrefillBarcode] = useState<string | undefined>();

  useEffect(() => {
    if (open) {
      setSelected(null);
      setTab('recherche');
      setPrefillBarcode(undefined);
    }
  }, [open]);

  const title = selected ? 'Quantité' : `Ajouter · ${MEAL_LABEL[meal]}`;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      full
      title={
        selected ? (
          <button className="row" style={{ gap: 4 }} onClick={() => setSelected(null)}>
            <ChevronLeft size={22} /> {title}
          </button>
        ) : (
          title
        )
      }
    >
      {selected ? (
        <QuantityStep food={selected} meal={meal} date={date} onDone={onClose} />
      ) : (
        <>
          <div className="chips" role="tablist">
            <Chip small active={tab === 'recherche'} onClick={() => setTab('recherche')}>
              <Search size={15} /> Rechercher
            </Chip>
            <Chip small active={tab === 'scan'} onClick={() => setTab('scan')}>
              <ScanBarcode size={15} /> Scanner
            </Chip>
            <Chip small active={tab === 'recents'} onClick={() => setTab('recents')}>
              <History size={15} /> Récents
            </Chip>
            <Chip small active={tab === 'manuel'} onClick={() => setTab('manuel')}>
              <PenLine size={15} /> Manuel
            </Chip>
          </div>
          {tab === 'recherche' && <SearchTab onPick={setSelected} />}
          {tab === 'scan' && (
            <ScanTab
              onPick={setSelected}
              onNotFound={(code) => {
                setPrefillBarcode(code);
                setTab('manuel');
              }}
            />
          )}
          {tab === 'recents' && <RecentTab onPick={setSelected} />}
          {tab === 'manuel' && <ManualTab barcode={prefillBarcode} onCreated={setSelected} />}
        </>
      )}
    </Sheet>
  );
}

function FoodList({ foods, onPick }: { foods: Food[]; onPick: (f: Food) => void }) {
  return (
    <div className="list">
      {foods.map((f) => (
        <button key={f.id} className="list-item" onClick={() => onPick(f)}>
          {f.imageUrl ? (
            <img className="thumb" src={f.imageUrl} alt="" loading="lazy" />
          ) : (
            <div className="thumb" style={{ display: 'grid', placeItems: 'center', color: 'var(--text-2)', fontSize: 12 }}>
              {f.source === 'generic' ? 'Base' : f.source === 'manual' ? 'Perso' : 'OFF'}
            </div>
          )}
          <div className="grow">
            <div className="body ellipsis">{f.name}</div>
            <div className="caption ellipsis">
              {f.brand ? `${f.brand} · ` : ''}
              {fmt(f.kcal)} kcal · P {fmtMax(f.protein)} · G {fmtMax(f.carbs)} · L {fmtMax(f.fat)} /100 g
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

function SearchTab({ onPick }: { onPick: (f: Food) => void }) {
  const online = useOnline();
  const [q, setQ] = useState('');
  const [local, setLocal] = useState<Food[]>([]);
  const [remote, setRemote] = useState<Food[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    let alive = true;
    if (q.trim().length < 2) {
      setLocal([]);
      return;
    }
    void searchLocal(q).then((r) => alive && setLocal(r));
    return () => {
      alive = false;
    };
  }, [q]);

  async function runRemote() {
    if (q.trim().length < 2 || !online) return;
    abort.current?.abort();
    const ctrl = new AbortController();
    abort.current = ctrl;
    setLoading(true);
    setError(null);
    try {
      const r = await searchOff(q.trim(), ctrl.signal);
      setRemote(r);
      if (!r.length) setError('Aucun produit trouvé sur Open Food Facts. Essaie un autre mot ou la saisie manuelle.');
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        setError('Open Food Facts ne répond pas pour le moment (service gratuit parfois saturé). Réessaie dans un instant.');
      }
    } finally {
      setLoading(false);
    }
  }

  const localIds = new Set(local.map((f) => f.id));

  return (
    <div className="stack">
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          (document.activeElement as HTMLElement | null)?.blur();
          void runRemote();
        }}
      >
        <input
          className="input"
          type="search"
          enterKeyHint="search"
          placeholder="Ex. skyr, poulet, flocons d'avoine…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setRemote([]);
            setError(null);
          }}
          autoFocus
        />
        <button className="round-btn" type="submit" aria-label="Rechercher en ligne" disabled={!online || q.trim().length < 2}>
          {loading ? <div className="spinner" /> : <Search size={18} />}
        </button>
      </form>
      {!online && (
        <div className="alert">
          <WifiOff size={16} /> Hors ligne : seuls les aliments de base et ceux déjà utilisés sont disponibles.
        </div>
      )}
      {local.length > 0 && (
        <div className="stack-sm">
          <div className="caption">Sur ton téléphone</div>
          <FoodList foods={local} onPick={onPick} />
        </div>
      )}
      {online && q.trim().length >= 2 && remote.length === 0 && !loading && !error && (
        <button className="btn-secondary full" onClick={() => void runRemote()}>
          <Search size={16} /> Chercher « {q.trim()} » sur Open Food Facts
        </button>
      )}
      {error && <div className="alert warning">{error}</div>}
      {remote.length > 0 && (
        <div className="stack-sm">
          <div className="caption">Open Food Facts</div>
          <FoodList foods={remote.filter((f) => !localIds.has(f.id))} onPick={onPick} />
        </div>
      )}
      {q.trim().length < 2 && (
        <p className="caption">
          Tape au moins 2 lettres. La base générique (poulet, riz, œufs…) fonctionne hors ligne ; la recherche Open Food Facts trouve les
          produits de marque.
        </p>
      )}
    </div>
  );
}

function ScanTab({ onPick, onNotFound }: { onPick: (f: Food) => void; onNotFound: (code: string) => void }) {
  const toast = useToast();
  const [status, setStatus] = useState<'scan' | 'loading' | 'error'>('scan');
  const [code, setCode] = useState<string>('');
  const [manualCode, setManualCode] = useState('');

  const lookup = useCallback(
    async (c: string) => {
      setCode(c);
      setStatus('loading');
      try {
        const food = await productByBarcode(c);
        if (food) onPick(food);
        else {
          toast('Produit introuvable : saisis-le à la main');
          onNotFound(c);
        }
      } catch {
        setStatus('error');
      }
    },
    [onPick, onNotFound, toast],
  );

  const onDetected = useCallback((c: string) => void lookup(c), [lookup]);

  if (status === 'loading') {
    return (
      <div className="empty">
        <div className="spinner" />
        Recherche du code {code}…
      </div>
    );
  }
  return (
    <div className="stack">
      {status === 'error' && (
        <div className="alert warning">
          Impossible de joindre Open Food Facts (hors ligne ?). Code lu : {code}.{' '}
          <button className="btn-link" onClick={() => onNotFound(code)}>
            Saisir à la main
          </button>
        </div>
      )}
      {status === 'scan' && (
        <Suspense fallback={<div className="scanner" />}>
          <BarcodeScanner onDetected={onDetected} />
        </Suspense>
      )}
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          if (manualCode.trim().length >= 6) void lookup(manualCode.trim());
        }}
      >
        <input
          className="input num"
          inputMode="numeric"
          placeholder="Ou tape le code-barres"
          value={manualCode}
          onChange={(e) => setManualCode(e.target.value.replace(/\D/g, ''))}
        />
        <button className="round-btn" type="submit" aria-label="Chercher ce code">
          <Search size={18} />
        </button>
      </form>
    </div>
  );
}

function RecentTab({ onPick }: { onPick: (f: Food) => void }) {
  const [foods, setFoods] = useState<Food[] | null>(null);
  useEffect(() => {
    void recentFoods().then(setFoods);
  }, []);
  if (!foods) return <div className="empty"><div className="spinner" /></div>;
  if (!foods.length) return <div className="empty">Les aliments que tu ajoutes apparaîtront ici, même hors ligne.</div>;
  return <FoodList foods={foods} onPick={onPick} />;
}

function ManualTab({ barcode, onCreated }: { barcode?: string; onCreated: (f: Food) => void }) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [kcal, setKcal] = useState<number | null>(null);
  const [protein, setProtein] = useState<number | null>(null);
  const [carbs, setCarbs] = useState<number | null>(null);
  const [fat, setFat] = useState<number | null>(null);
  const [portion, setPortion] = useState<number | null>(null);

  const estimated = Math.round((protein ?? 0) * 4 + (carbs ?? 0) * 4 + (fat ?? 0) * 9);

  async function save() {
    if (!name.trim()) return toast('Donne un nom à l’aliment');
    const k = kcal ?? estimated;
    if (!k && !protein && !carbs && !fat) return toast('Renseigne au moins les calories ou les macros');
    const food = await createManualFood({
      name: name.trim(),
      brand: brand.trim() || undefined,
      barcode,
      kcal: k,
      protein: protein ?? 0,
      carbs: carbs ?? 0,
      fat: fat ?? 0,
      portion: portion ? { label: '1 portion', grams: portion } : undefined,
    });
    onCreated(food);
  }

  return (
    <div className="stack">
      {barcode && <div className="alert">Code {barcode} introuvable dans Open Food Facts. Recopie l’étiquette nutritionnelle (valeurs pour 100 g).</div>}
      <Field label="Nom">
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Galette maison" />
      </Field>
      <Field label="Marque (facultatif)">
        <input className="input" value={brand} onChange={(e) => setBrand(e.target.value)} />
      </Field>
      <div className="grid-2">
        <NumberField label="Calories /100 g" value={kcal} onChange={setKcal} suffix="kcal" placeholder={estimated ? String(estimated) : ''} />
        <NumberField label="Protéines /100 g" value={protein} onChange={setProtein} suffix="g" />
        <NumberField label="Glucides /100 g" value={carbs} onChange={setCarbs} suffix="g" />
        <NumberField label="Lipides /100 g" value={fat} onChange={setFat} suffix="g" />
      </div>
      <NumberField label="Portion habituelle (facultatif)" value={portion} onChange={setPortion} suffix="g" />
      {!kcal && estimated > 0 && <p className="caption">Calories estimées à partir des macros : {fmt(estimated)} kcal / 100 g.</p>}
      <button className="btn-primary" onClick={() => void save()}>
        Enregistrer l’aliment
      </button>
    </div>
  );
}

function QuantityStep({ food, meal, date, onDone }: { food: Food; meal: MealKey; date: string; onDone: () => void }) {
  const toast = useToast();
  const [grams, setGrams] = useState<number | null>(food.portion?.grams ?? 100);
  const g = grams ?? 0;
  const v = portionValues(food, g);
  const quick = [
    ...(food.portion ? [{ label: food.portion.label, grams: food.portion.grams }] : []),
    { label: '50 g', grams: 50 },
    { label: '100 g', grams: 100 },
    { label: '150 g', grams: 150 },
    { label: '200 g', grams: 200 },
  ];

  async function add() {
    if (!g || g <= 0) return toast('Indique une quantité');
    await addToMeal(food, g, meal, date);
    toast(`${food.name} ajouté`);
    onDone();
  }

  return (
    <div className="stack">
      <div className="row">
        {food.imageUrl && <img className="thumb" src={food.imageUrl} alt="" />}
        <div className="grow">
          <div className="h2">{food.name}</div>
          <div className="caption">
            {food.brand ? `${food.brand} · ` : ''}
            {fmt(food.kcal)} kcal / 100 g
          </div>
        </div>
      </div>
      <NumberField label="Quantité" value={grams} onChange={setGrams} suffix="g" />
      <div className="chips">
        {quick.map((q) => (
          <Chip key={q.label} small active={g === q.grams} onClick={() => setGrams(q.grams)}>
            {q.label}
          </Chip>
        ))}
      </div>
      <div className="glass card" style={{ borderRadius: 20 }}>
        <div className="stat-grid">
          <div className="stat">
            <span className="caption">Calories</span>
            <span className="value">{fmt(v.kcal)} kcal</span>
          </div>
          <div className="stat">
            <span className="caption">Protéines</span>
            <span className="value">{fmtMax(v.protein)} g</span>
          </div>
          <div className="stat">
            <span className="caption">Glucides</span>
            <span className="value">{fmtMax(v.carbs)} g</span>
          </div>
          <div className="stat">
            <span className="caption">Lipides</span>
            <span className="value">{fmtMax(v.fat)} g</span>
          </div>
        </div>
      </div>
      <button className="btn-primary" onClick={() => void add()}>
        Ajouter {meal === 'collation' ? 'à la collation' : `au ${MEAL_LABEL[meal].toLowerCase()}`}
      </button>
      {food.source === 'off' && (
        <p className="caption">Données Open Food Facts (licence ODbL), saisies par la communauté : vérifie l’étiquette en cas de doute.</p>
      )}
    </div>
  );
}
