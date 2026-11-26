import { useEffect, useState } from 'react';
import { qrPreview } from '../lib/qr';

export function QrImage({
  value,
  size = 240,
  className = '',
  alt = 'QR code',
}: {
  value: string;
  size?: number;
  className?: string;
  alt?: string;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    if (!value) {
      setSrc(null);
      return;
    }
    qrPreview(value, Math.min(1024, Math.max(size * 2, 320)))
      .then((dataUrl) => {
        if (!cancelled) setSrc(dataUrl);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [value, size]);

  if (failed) {
    return (
      <div
        className={`grid place-items-center rounded-lg border border-dashed border-line bg-zinc-50 text-center text-xs text-zinc-400 ${className}`}
        style={{ width: size, height: size }}
      >
        Lien trop long pour un QR code
      </div>
    );
  }

  if (!src) {
    return (
      <div
        className={`animate-pulse rounded-lg bg-zinc-100 ${className}`}
        style={{ width: size, height: size }}
        aria-hidden="true"
      />
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={`rounded-lg bg-white ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
