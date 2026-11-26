export interface GeoInfo {
  city?: string | null;
  country?: string | null;
  region?: string | null;
}

interface NetlifyGeo {
  city?: string;
  country?: { code?: string; name?: string };
  subdivision?: { code?: string; name?: string };
}

function decodeNetlifyGeo(header: string | null): NetlifyGeo | null {
  if (!header) return null;
  try {
    const json = Buffer.from(header, 'base64').toString('utf8');
    return JSON.parse(json) as NetlifyGeo;
  } catch {
    return null;
  }
}

export function readGeo(headers: Headers, contextGeo?: unknown): GeoInfo | null {
  const fromContext = contextGeo as NetlifyGeo | undefined;
  const geo = fromContext ?? decodeNetlifyGeo(headers.get('x-nf-geo'));
  if (!geo) return null;
  return {
    city: geo.city ?? null,
    country: geo.country?.code ?? geo.country?.name ?? null,
    region: geo.subdivision?.name ?? geo.subdivision?.code ?? null,
  };
}

export function readIp(headers: Headers, contextIp?: string): string {
  const forwarded = headers.get('x-forwarded-for') ?? headers.get('x-nf-client-connection-ip');
  const candidate = contextIp || forwarded?.split(',')[0]?.trim() || headers.get('client-ip') || '';
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
