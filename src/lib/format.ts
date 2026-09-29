// Formats français (nombres, dates, semaines).

export function fmt(n: number, decimals = 0): string {
  return n.toLocaleString('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** 74.2 → "74,2" ; 74 → "74" */
export function fmtMax(n: number, maxDecimals = 1): string {
  return n.toLocaleString('fr-FR', { maximumFractionDigits: maxDecimals });
}

export function todayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function dateFromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

/** 0 = lundi … 6 = dimanche */
export function weekdayMon0(d: Date): number {
  return (d.getDay() + 6) % 7;
}

export function startOfWeek(d = new Date()): Date {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  r.setDate(r.getDate() - weekdayMon0(r));
  return r;
}

export function isoWeek(d = new Date()): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export function longDate(d = new Date()): string {
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

export function fullDate(d: Date): string {
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function shortDate(d: Date): string {
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export const WEEKDAY_LETTERS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
export const WEEKDAY_NAMES = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

/** « Aujourd'hui », « Hier », « Il y a 3 j » */
export function relativeDay(ts: number, now = Date.now()): string {
  const a = new Date(ts);
  const b = new Date(now);
  const d0 = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const d1 = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  const days = Math.round((d1 - d0) / 86400000);
  if (days <= 0) return "Aujourd'hui";
  if (days === 1) return 'Hier';
  return `Il y a ${days} j`;
}

export function chrono(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** Convertit « 74,2 » ou « 74.2 » en nombre. */
export function parseNum(v: string): number | null {
  const n = Number(v.replace(',', '.').trim());
  return v.trim() === '' || Number.isNaN(n) ? null : n;
}
