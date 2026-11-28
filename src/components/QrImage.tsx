import { useMemo } from 'react';
import { DEFAULT_DESIGN, normalizeDesign, qrSvg, type QrDesign } from '../lib/qr';

/**
 * Renders the QR code as inline SVG, so custom colours, dot shapes and a logo
 * are painted exactly like in the downloaded file (no rasterisation step, so
 * the preview stays sharp at any size).
 */
export function QrImage({
  value,
  size = 240,
  className = '',
  alt = 'QR code',
  design,
}: {
  value: string;
  size?: number;
  className?: string;
  alt?: string;
  design?: QrDesign | null;
}) {
  const style = normalizeDesign(design ?? DEFAULT_DESIGN);

  const markup = useMemo(() => {
    if (!value) return null;
    try {
      return qrSvg(value, style, size);
    } catch {
      return null;
    }
  }, [value, style, size]);

  if (!markup) {
    return (
      <div
        className={`grid place-items-center rounded-lg border border-dashed border-line bg-zinc-50 px-2 text-center text-xs text-zinc-400 ${className}`}
        style={{ width: size, height: size }}
      >
        {value ? 'Lien trop long pour un QR code' : null}
      </div>
    );
  }

  return (
    <div
      role="img"
      aria-label={alt}
      className={`overflow-hidden rounded-lg ${className}`}
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}
