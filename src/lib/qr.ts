import QRCode from 'qrcode';

const OPTIONS = {
  errorCorrectionLevel: 'M' as const,
  margin: 2,
  color: { dark: '#0a0a0b', light: '#ffffff' },
};

/** PNG data URL used for previews. */
export async function qrPreview(text: string, size = 480): Promise<string> {
  return QRCode.toDataURL(text, { ...OPTIONS, width: size });
}

export async function qrSvgString(text: string): Promise<string> {
  return QRCode.toString(text, { ...OPTIONS, type: 'svg', width: 1024 });
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

export async function downloadQrPng(text: string, name: string): Promise<void> {
  const dataUrl = await QRCode.toDataURL(text, { ...OPTIONS, width: 2048 });
  const response = await fetch(dataUrl);
  triggerDownload(await response.blob(), `${safeName(name)}.png`);
}

export async function downloadQrSvg(text: string, name: string): Promise<void> {
  const svg = await qrSvgString(text);
  triggerDownload(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }), `${safeName(name)}.svg`);
}
