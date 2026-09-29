// Petites API de l'appareil : écran allumé, vibration, son.

let wakeLock: WakeLockSentinel | null = null;
let wantWakeLock = false;

async function acquire() {
  try {
    if (!('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
    wakeLock = await navigator.wakeLock.request('screen');
    wakeLock.addEventListener('release', () => {
      wakeLock = null;
    });
  } catch {
    wakeLock = null;
  }
}

function onVisibility() {
  if (wantWakeLock && document.visibilityState === 'visible' && !wakeLock) void acquire();
}

/** Garde l'écran allumé (Wake Lock API). Réacquis automatiquement au retour dans l'app. */
export async function keepScreenOn(on: boolean): Promise<void> {
  wantWakeLock = on;
  if (on) {
    document.addEventListener('visibilitychange', onVisibility);
    if (!wakeLock) await acquire();
  } else {
    document.removeEventListener('visibilitychange', onVisibility);
    try {
      await wakeLock?.release();
    } catch {
      /* déjà libéré */
    }
    wakeLock = null;
  }
}

export function wakeLockSupported(): boolean {
  return 'wakeLock' in navigator;
}

export function haptic(ms = 12): void {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* non supporté (iPhone) */
  }
}

let audioCtx: AudioContext | null = null;

/** À appeler lors d'un geste utilisateur pour « déverrouiller » le son sur iOS. */
export function unlockAudio(): void {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!audioCtx) audioCtx = new Ctx();
    if (audioCtx.state === 'suspended') void audioCtx.resume();
  } catch {
    audioCtx = null;
  }
}

/** Bip de fin de repos. */
export function beep(times = 3): void {
  if (!audioCtx) return;
  const ctx = audioCtx;
  for (let i = 0; i < times; i++) {
    const t = ctx.currentTime + i * 0.28;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = i === times - 1 ? 1320 : 880;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.22);
  }
  haptic(200);
}

export function isStandalone(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function isIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}
