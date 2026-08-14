'use client';

import { useEffect, useState } from 'react';

export default function QrCode({ value, size = 168 }) {
  const [src, setSrc] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const QRCode = (await import('qrcode')).default;
        const url = await QRCode.toDataURL(value, {
          width: size * 2,
          margin: 1,
          color: { dark: '#0b0f19', light: '#e8fbff' },
          errorCorrectionLevel: 'M',
        });
        if (!cancelled) setSrc(url);
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => { cancelled = true; };
  }, [value, size]);

  if (error) return <p className="text-xs text-slate-500">QR unavailable.</p>;

  return (
    <div
      className="grid place-items-center rounded-xl bg-white/90 p-2 shadow-glow"
      style={{ width: size + 16, height: size + 16 }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="Share QR code" width={size} height={size} className="rounded-md" />
      ) : (
        <div className="h-full w-full animate-pulse rounded-md bg-slate-300/50" />
      )}
    </div>
  );
}
