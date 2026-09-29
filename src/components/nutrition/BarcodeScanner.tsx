import { useEffect, useRef, useState } from 'react';

// Scan de code-barres avec @zxing/browser (BarcodeDetector n'existe pas sur Safari iOS).
// Nécessite HTTPS et l'autorisation d'accès à la caméra.

export function BarcodeScanner({ onDetected }: { onDetected: (code: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(true);
  const detected = useRef(false);

  useEffect(() => {
    let stop: (() => void) | undefined;
    let cancelled = false;
    (async () => {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        setError('La caméra nécessite une connexion sécurisée (HTTPS). Ouvre l’app depuis son adresse https.');
        setStarting(false);
        return;
      }
      try {
        const { BrowserMultiFormatReader } = await import('@zxing/browser');
        const { BarcodeFormat, DecodeHintType } = await import('@zxing/library');
        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.UPC_A,
          BarcodeFormat.UPC_E,
          BarcodeFormat.CODE_128,
        ]);
        const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 120 });
        if (cancelled || !videoRef.current) return;
        const controls = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
          videoRef.current,
          (result) => {
            if (result && !detected.current) {
              detected.current = true;
              navigator.vibrate?.(60);
              onDetected(result.getText());
            }
          },
        );
        stop = () => controls.stop();
        if (cancelled) stop();
        setStarting(false);
      } catch (e) {
        const name = (e as Error).name;
        setError(
          name === 'NotAllowedError'
            ? 'Accès à la caméra refusé. Autorise-le dans Réglages > Safari > Caméra (ou dans les réglages de l’app installée).'
            : 'Impossible de démarrer la caméra sur cet appareil.',
        );
        setStarting(false);
      }
    })();
    return () => {
      cancelled = true;
      stop?.();
    };
  }, [onDetected]);

  return (
    <div className="stack-sm">
      <div className="scanner">
        <video ref={videoRef} playsInline muted autoPlay />
        {!error && (
          <>
            <div className="scanner-frame" />
            <div className="scanner-line" />
          </>
        )}
        {starting && !error && (
          <div className="ring-center">
            <div className="spinner" />
          </div>
        )}
      </div>
      {error ? (
        <div className="alert danger">{error}</div>
      ) : (
        <p className="caption" style={{ textAlign: 'center' }}>
          Place le code-barres dans le cadre, bien éclairé.
        </p>
      )}
    </div>
  );
}
