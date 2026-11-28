export interface GeoInfo {
  city?: string | null;
  country?: string | null;
  region?: string | null;
}

/** Subset of Cloudflare's `request.cf` object that we use. */
export interface CfProperties {
  city?: string;
  country?: string;
  region?: string;
  regionCode?: string;
}

/**
 * Cloudflare exposes the visitor location on `request.cf`, and the country on
 * the `cf-ipcountry` header. Values are already ISO/plain strings, unlike the
 * base64 `x-nf-geo` header Netlify used.
 */
export function readGeo(headers: Headers, cf?: CfProperties | null): GeoInfo | null {
  const country = cf?.country || headers.get('cf-ipcountry') || null;
  const region = cf?.region || cf?.regionCode || headers.get('cf-region') || null;
  const city = cf?.city || headers.get('cf-ipcity') || null;

  if (!country && !region && !city) return null;
  return { city: city || null, country: country || null, region: region || null };
}

export function readIp(headers: Headers, contextIp?: string | null): string {
  const candidate =
    contextIp ||
    headers.get('cf-connecting-ip') ||
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    '';
  return candidate;
}

export function readReferrer(headers: Headers): string | null {
  const raw = headers.get('referer') ?? headers.get('referrer');
  if (!raw) return null;
  try {
    const host = new URL(raw).hostname;
    return host || null;
  } catch {
    return null;
  }
}

export type DeviceType = 'Mobile' | 'Tablet' | 'Ordinateur' | 'Robot';

export interface ClientInfo {
  device: DeviceType;
  os: string;
  browser: string;
}

export function parseUserAgent(userAgent: string): ClientInfo {
  const ua = userAgent || '';
  const isTablet = /iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobile))/i.test(ua);
  const isMobile = /iPhone|iPod|Android.*Mobile|Windows Phone|BlackBerry|Opera Mini|IEMobile/i.test(ua);
  const isBot = /bot|crawler|spider|preview|headless|curl|wget|python|facebookexternalhit/i.test(ua);

  let os = 'Inconnu';
  if (/Windows NT 10/i.test(ua)) os = 'Windows';
  else if (/Windows/i.test(ua)) os = 'Windows';
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/Mac OS X/i.test(ua)) os = 'macOS';
  else if (/CrOS/i.test(ua)) os = 'ChromeOS';
  else if (/Linux/i.test(ua)) os = 'Linux';

  let browser = 'Inconnu';
  if (/Edg\//i.test(ua)) browser = 'Edge';
  else if (/OPR\/|Opera/i.test(ua)) browser = 'Opera';
  else if (/Firefox\//i.test(ua)) browser = 'Firefox';
  else if (/Chrome\/|CriOS/i.test(ua)) browser = 'Chrome';
  else if (/Safari\//i.test(ua)) browser = 'Safari';

  return {
    device: isBot ? 'Robot' : isTablet ? 'Tablet' : isMobile ? 'Mobile' : 'Ordinateur',
    os,
    browser,
  };
}
