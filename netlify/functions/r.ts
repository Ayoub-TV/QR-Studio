import { readGeo, readIp, readReferrer } from '../lib/request.ts';
import { trackScan } from '../lib/scan.ts';
import { errorPage, inactivePage, notFoundPage, textPage } from '../lib/pages.ts';

interface NetlifyContextLike {
  ip?: string;
  geo?: unknown;
}

const NO_STORE = {
  'cache-control': 'no-store, no-cache, must-revalidate, max-age=0',
  'x-robots-tag': 'noindex',
};

function extractSlug(url: URL): string | null {
  const path = url.pathname.replace(/^\/+|\/+$/g, '');
  const parts = path.split('/');
  // Netlify rewrite keeps `/r/<slug>`; the function path is also accepted so
  // the endpoint can be tested directly.
  const candidate = parts[0] === 'r' ? parts[1] : parts[parts.length - 1];
  if (!candidate || !/^[a-z0-9-]{4,32}$/i.test(candidate)) return null;
  return candidate.toLowerCase();
}

function html(body: string, status: number): Response {
  return new Response(body, {
    status,
    headers: { 'content-type': 'text/html; charset=utf-8', ...NO_STORE },
  });
}

/**
 * GET /r/:slug
 * Identifies the QR code, records the scan, then redirects immediately.
 */
export default async function handler(
  request: Request,
  context: NetlifyContextLike = {},
): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method Not Allowed', { status: 405, headers: { allow: 'GET, HEAD' } });
  }

  const url = new URL(request.url);
  const slug = extractSlug(url);
  if (!slug) return html(notFoundPage(), 404);

  try {
    const outcome = await trackScan({
      slug,
      ip: readIp(request.headers, context.ip),
      userAgent: request.headers.get('user-agent') ?? '',
      referrer: readReferrer(request.headers),
      geo: readGeo(request.headers, context.geo),
    });

    if (outcome.status === 'not-found') return html(notFoundPage(), 404);
    if (outcome.status === 'inactive') return html(inactivePage(), 410);

    if (outcome.kind === 'text') {
      return html(textPage(outcome.destination, outcome.qrName), 200);
    }

    return new Response(null, {
      status: 302,
      headers: { location: outcome.destination, ...NO_STORE },
    });
  } catch (error) {
    console.error('[qr-studio] scan failed', error);
    return html(errorPage(), 500);
  }
}
