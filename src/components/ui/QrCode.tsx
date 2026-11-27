'use client';
import React, { useEffect, useState } from 'react';

/** A QR code drawn in the browser (nothing is sent anywhere). Dark on white, with a quiet border so phones scan it easily. */
export const QrCode: React.FC<{ value: string; size?: number; label?: string }> = ({ value, size = 168, label = 'QR kod' }) => {
  const [src, setSrc] = useState('');
  useEffect(() => {
    let alive = true;
    import('qrcode')
      .then((m) => m.toDataURL(value, { width: size * 2, margin: 2, errorCorrectionLevel: 'M', color: { dark: '#12100e', light: '#ffffff' } }))
      .then((url) => alive && setSrc(url))
      .catch(() => alive && setSrc(''));
    return () => {
      alive = false;
    };
  }, [value, size]);
  return src ? (
    <img src={src} alt={label} width={size} height={size} className="rounded-2xl bg-white p-1 shadow-sm" style={{ width: size, height: size }} />
  ) : (
    <div role="img" aria-label={label} className="animate-pulse rounded-2xl bg-ink/10" style={{ width: size, height: size }} />
  );
};
