import type { Env } from '../_lib/env.ts';
import { handleScan } from '../_lib/handler.ts';
import type { CfProperties } from '../_lib/request.ts';

/**
 * Cloudflare Pages Function — `/r/:slug` (and `/r/:slug/*`).
 *
 * `netlify.toml` used to rewrite `/r/*` to `netlify/functions/r`; Pages routes
 * by file path, so this single catch-all replaces that rewrite and `/r/<slug>`
 * URLs printed on physical QR codes keep working unchanged.
 *
 * Local development: `vite dev` forwards the same requests to `handleScan`
 * (see `vite.config.ts`), so no extra runtime is required.
 */
interface PagesRequest extends Request {
  cf?: CfProperties;
}

export interface PagesContext {
  request: PagesRequest;
  env: Env;
  params: Record<string, string | string[]>;
  data: Record<string, unknown>;
  next: () => Promise<Response>;
  waitUntil: (promise: Promise<unknown>) => void;
}

export const onRequest = async (context: PagesContext): Promise<Response> =>
  handleScan(context.request, {
    env: context.env,
    cf: context.request.cf ?? null,
    ip: context.request.headers.get('cf-connecting-ip'),
  });
