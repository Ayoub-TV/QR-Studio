import { resolveEnv, type Env } from './env.ts';
import { errorPage, inactivePage, notFoundPage, textPage } from './pages.ts';
import { readGeo, readIp, readReferrer, type CfProperties } from './request.ts';
import { trackScan } from './scan.ts';

const NO_STORE = {
  'cache-control': 'no-store, no-cache, must-revalidate, max-age=0',
  'x-robots-tag': 'noindex',
};

export interface ScanRequestContext {
  /** Cloudflare Pages bindings; defaults to process.env during `vite dev`. */
  env?: Env | Record<string, unknown> | null;
  /** `request.cf` (visitor location, provided by Cloudflare). */
  cf?: CfProperties | null;
  /** Visitor IP, normally `cf-connecting-ip`. */
  ip?: string | null;
}

function extractSlug(url: URL): string | null {
  const path = url.pathname.replace(/^\/+|\/+$/g, '');
  const parts = path.split('/');
  // Pages Functions route `/r/*` here; a direct `/r/<slug>` call is identical,
  // and `/functions/r` style paths are tolerated for manual testing.
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
 *
 * Runtime-agnostic: Cloudflare Pages calls it from `functions/r/[[slug]].ts`,
 * and `vite dev` calls it through the middleware in `vite.config.ts`.
 */
export async function handleScan(
  request: Request,
  context: ScanRequestContext = {},
): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method Not Allowed', { status: 405, headers: { allow: 'GET, HEAD' } });
  }

  const url = new URL(request.url);
  const slug = extractSlug(url);
  if (!slug) return html(notFoundPage(), 404);

  try {
    const env = resolveEnv(context.env);
    const outcome = await trackScan(
      {
        slug,
        ip: readIp(request.headers, context.ip),
        userAgent: request.headers.get('user-agent') ?? '',
        referrer: readReferrer(request.headers),
        geo: readGeo(request.headers, context.cf),
      },
      env,
    );

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
