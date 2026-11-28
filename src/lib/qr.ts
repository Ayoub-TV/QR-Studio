import QRCode from 'qrcode';

/**
 * QR design.
 *
 * The `qrcode` package only draws plain black squares, so the module matrix it
 * produces is rendered here into our own SVG: that is what makes dot shapes,
 * custom eye (corner) styles, colours and a centered logo possible without
 * shipping a second QR library.
 */
export type QrDotStyle = 'square' | 'rounded' | 'dots' | 'diamond';
export type QrEyeStyle = 'square' | 'rounded' | 'circle';

export interface QrDesign {
  /** Modules colour, `#rrggbb`. */
  fg: string;
  /** Background colour, `#rrggbb`. */
  bg: string;
  dots: QrDotStyle;
  eyes: QrEyeStyle;
  /** Embedded image (data URL) shown in the middle, or `null`. */
  logo: string | null;
  /** Logo width as a fraction of the code width, 0.12 – 0.3. */
  logoScale: number;
}

export const DEFAULT_DESIGN: QrDesign = {
  fg: '#0a0a0b',
  bg: '#ffffff',
  dots: 'square',
  eyes: 'square',
  logo: null,
  logoScale: 0.22,
};

export const QR_DOT_STYLES: { value: QrDotStyle; label: string }[] = [
  { value: 'square', label: 'Carrés' },
  { value: 'rounded', label: 'Arrondis' },
  { value: 'dots', label: 'Points' },
  { value: 'diamond', label: 'Losanges' },
];

export const QR_EYE_STYLES: { value: QrEyeStyle; label: string }[] = [
  { value: 'square', label: 'Carrés' },
  { value: 'rounded', label: 'Arrondis' },
  { value: 'circle', label: 'Ronds' },
];

export const QR_COLOR_PRESETS: { fg: string; bg: string; label: string }[] = [
  { fg: '#0a0a0b', bg: '#ffffff', label: 'Encre' },
  { fg: '#4338ca', bg: '#ffffff', label: 'Indigo' },
  { fg: '#047857', bg: '#ffffff', label: 'Émeraude' },
  { fg: '#be123c', bg: '#ffffff', label: 'Framboise' },
  { fg: '#b45309', bg: '#ffffff', label: 'Ambre' },
  { fg: '#6d28d9', bg: '#f5f3ff', label: 'Violet' },
  { fg: '#ffffff', bg: '#0a0a0b', label: 'Nuit' },
];

const HEX = /^#[0-9a-f]{6}$/i;
const LOGO_MAX_CHARS = 120_000;

function isDotStyle(value: unknown): value is QrDotStyle {
  return value === 'square' || value === 'rounded' || value === 'dots' || value === 'diamond';
}

function isEyeStyle(value: unknown): value is QrEyeStyle {
  return value === 'square' || value === 'rounded' || value === 'circle';
}

/**
 * Anything read from Firestore (or a half-written document) is coerced into a
 * usable design: an invalid colour falls back to the default instead of
 * producing a blank preview.
 */
export function normalizeDesign(raw: unknown): QrDesign {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_DESIGN };
  const value = raw as Partial<Record<keyof QrDesign, unknown>>;
  const fg = typeof value.fg === 'string' && HEX.test(value.fg) ? value.fg.toLowerCase() : DEFAULT_DESIGN.fg;
  const bg = typeof value.bg === 'string' && HEX.test(value.bg) ? value.bg.toLowerCase() : DEFAULT_DESIGN.bg;
  const logo =
    typeof value.logo === 'string' && value.logo.startsWith('data:image/') && value.logo.length <= LOGO_MAX_CHARS
      ? value.logo
      : null;
  const scale =
    typeof value.logoScale === 'number' && Number.isFinite(value.logoScale)
      ? Math.min(0.3, Math.max(0.12, value.logoScale))
      : DEFAULT_DESIGN.logoScale;
  return {
    fg,
    bg,
    dots: isDotStyle(value.dots) ? value.dots : DEFAULT_DESIGN.dots,
    eyes: isEyeStyle(value.eyes) ? value.eyes : DEFAULT_DESIGN.eyes,
    logo,
    logoScale: scale,
  };
}

/** Quiet zone, in modules. Two is enough visually and keeps the code compact. */
const QUIET = 2;

function esc(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function dotShape(x: number, y: number, style: QrDotStyle): string {
  switch (style) {
    case 'dots':
      return `<circle cx="${x + 0.5}" cy="${y + 0.5}" r="0.46"/>`;
    case 'rounded':
      return `<rect x="${x + 0.04}" y="${y + 0.04}" width="0.92" height="0.92" rx="0.3"/>`;
    case 'diamond':
      return `<path d="M${x + 0.5} ${y + 0.03}L${x + 0.97} ${y + 0.5}L${x + 0.5} ${y + 0.97}L${x + 0.03} ${y + 0.5}Z"/>`;
    default:
      return `<rect x="${x}" y="${y}" width="1" height="1"/>`;
  }
}

/** One of the three 7×7 finder patterns ("eyes"). */
function eyeShape(ex: number, ey: number, style: QrEyeStyle, fg: string, bg: string): string {
  if (style === 'circle') {
    const cx = ex + 3.5;
    const cy = ey + 3.5;
    return (
      `<circle cx="${cx}" cy="${cy}" r="3.5" fill="${fg}"/>` +
      `<circle cx="${cx}" cy="${cy}" r="2.4" fill="${bg}"/>` +
      `<circle cx="${cx}" cy="${cy}" r="1.45" fill="${fg}"/>`
    );
  }
  const outerRadius = style === 'rounded' ? 2 : 0;
  const innerRadius = style === 'rounded' ? 1.1 : 0;
  const centerRadius = style === 'rounded' ? 0.8 : 0;
  return (
    `<rect x="${ex}" y="${ey}" width="7" height="7" rx="${outerRadius}" fill="${fg}"/>` +
    `<rect x="${ex + 1}" y="${ey + 1}" width="5" height="5" rx="${innerRadius}" fill="${bg}"/>` +
    `<rect x="${ex + 2}" y="${ey + 2}" width="3" height="3" rx="${centerRadius}" fill="${fg}"/>`
  );
}

function logoMarkup(design: QrDesign, total: number): string {
  if (!design.logo) return '';
  const size = total * design.logoScale;
  const pad = size * 0.09;
  const x = (total - size) / 2;
  const y = (total - size) / 2;
  return (
    `<rect x="${(x - pad).toFixed(3)}" y="${(y - pad).toFixed(3)}" ` +
    `width="${(size + pad * 2).toFixed(3)}" height="${(size + pad * 2).toFixed(3)}" ` +
    `rx="${(size * 0.16).toFixed(3)}" fill="${design.bg}"/>` +
    `<image href="${esc(design.logo)}" x="${x.toFixed(3)}" y="${y.toFixed(3)}" ` +
    `width="${size.toFixed(3)}" height="${size.toFixed(3)}" preserveAspectRatio="xMidYMid meet"/>`
  );
}

/**
 * Builds the whole SVG for `text`. `includeLogo: false` is used for the PNG
 * export, where the logo is drawn on the canvas directly (some browsers refuse
 * to paint a nested image when an SVG is rasterised).
 */
export function qrSvg(
  text: string,
  design: QrDesign = DEFAULT_DESIGN,
  size = 1024,
  options: { includeLogo?: boolean } = {},
): string {
  const style = normalizeDesign(design);
  const qr = QRCode.create(text, { errorCorrectionLevel: style.logo ? 'H' : 'M' });
  const modules = qr.modules.size;
  const bits = qr.modules.data;
  const total = modules + QUIET * 2;

  const eyes: [number, number][] = [
    [0, 0],
    [modules - 7, 0],
    [0, modules - 7],
  ];
  const inEye = (x: number, y: number) =>
    eyes.some(([ex, ey]) => x >= ex && x < ex + 7 && y >= ey && y < ey + 7);

  let dots = '';
  for (let y = 0; y < modules; y += 1) {
    for (let x = 0; x < modules; x += 1) {
      if (!bits[y * modules + x]) continue;
      if (inEye(x, y)) continue;
      dots += dotShape(x + QUIET, y + QUIET, style.dots);
    }
  }

  const eyesMarkup = eyes
    .map(([ex, ey]) => eyeShape(ex + QUIET, ey + QUIET, style.eyes, style.fg, style.bg))
    .join('');

  const logo = options.includeLogo === false ? '' : logoMarkup(style, total);

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" ` +
    `viewBox="0 0 ${total} ${total}" shape-rendering="geometricPrecision" role="img">` +
    `<rect width="${total}" height="${total}" fill="${style.bg}"/>` +
    `<g fill="${style.fg}">${dots}</g>` +
    eyesMarkup +
    logo +
    `</svg>`
  );
}

export function qrSvgDataUrl(text: string, design: QrDesign = DEFAULT_DESIGN, size = 1024): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(qrSvg(text, design, size))}`;
}

/** True when the text fits in a QR code at the chosen error correction level. */
export function canEncode(text: string, design: QrDesign = DEFAULT_DESIGN): boolean {
  try {
    QRCode.create(text, { errorCorrectionLevel: design.logo ? 'H' : 'M' });
    return true;
  } catch {
    return false;
  }
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function safeName(name: string): string {
  const cleaned = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  return cleaned || 'qr-code';
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Image du logo illisible'));
    image.src = src;
  });
}

/** Rasterises the designed QR at `width` px (default 2048) and downloads it. */
export async function downloadQrPng(
  text: string,
  name: string,
  design: QrDesign = DEFAULT_DESIGN,
  width = 2048,
): Promise<void> {
  const style = normalizeDesign(design);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = width;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas indisponible sur ce navigateur');

  context.fillStyle = style.bg;
  context.fillRect(0, 0, width, width);

  // Base code without the logo, then the logo painted natively so no browser
  // can silently drop the nested data URL.
  const svg = qrSvg(text, style, width, { includeLogo: false });
  const base = await loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
  context.drawImage(base, 0, 0, width, width);

  if (style.logo) {
    // The SVG viewBox spans the whole code, so the logo is `logoScale` of it.
    const logoSize = width * style.logoScale;
    const pad = logoSize * 0.09;
    const x = (width - logoSize) / 2;
    const y = (width - logoSize) / 2;
    const radius = logoSize * 0.16;

    context.fillStyle = style.bg;
    context.beginPath();
    const left = x - pad;
    const top = y - pad;
    const side = logoSize + pad * 2;
    context.moveTo(left + radius, top);
    context.arcTo(left + side, top, left + side, top + side, radius);
    context.arcTo(left + side, top + side, left, top + side, radius);
    context.arcTo(left, top + side, left, top, radius);
    context.arcTo(left, top, left + side, top, radius);
    context.closePath();
    context.fill();

    try {
      const logo = await loadImage(style.logo);
      context.drawImage(logo, x, y, logoSize, logoSize);
    } catch {
      // A logo that cannot be decoded must not block the download.
    }
  }

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('Export PNG impossible');
  triggerDownload(blob, `${safeName(name)}.png`);
}

export async function downloadQrSvg(
  text: string,
  name: string,
  design: QrDesign = DEFAULT_DESIGN,
): Promise<void> {
  const svg = qrSvg(text, design, 1024);
  triggerDownload(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }), `${safeName(name)}.svg`);
}

/**
 * Shrinks an uploaded image to a small PNG data URL that fits comfortably in a
 * Firestore document (the rules cap it at 120 000 characters).
 */
export async function fileToLogo(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Choisissez une image (PNG, JPEG, WebP…).');
  if (file.size > 4 * 1024 * 1024) throw new Error('Image trop lourde : 4 Mo maximum.');

  const bitmap = await loadImage(URL.createObjectURL(file));
  try {
    for (const side of [256, 224, 192, 160, 128]) {
      const canvas = document.createElement('canvas');
      canvas.width = side;
      canvas.height = side;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Canvas indisponible sur ce navigateur');
      const scale = Math.min(side / bitmap.width, side / bitmap.height);
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));
      context.drawImage(bitmap, (side - width) / 2, (side - height) / 2, width, height);
      const dataUrl = canvas.toDataURL('image/png');
      if (dataUrl.length <= LOGO_MAX_CHARS) return dataUrl;
    }
  } finally {
    URL.revokeObjectURL(bitmap.src);
  }
  throw new Error('Ce logo reste trop lourd, essayez une image plus simple.');
}

/** Backwards-compatible helper used by the landing page preview. */
export async function qrPreview(text: string, size = 480): Promise<string> {
  return qrSvgDataUrl(text, DEFAULT_DESIGN, size);
}
