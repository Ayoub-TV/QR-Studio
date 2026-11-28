/**
 * Bindings available to the Pages Function.
 *
 * They are configured in the Cloudflare dashboard:
 *   Workers & Pages → qr-studio-dne → Settings → Variables and Secrets.
 *
 * The `FIREBASE_*` values here are SERVER secrets (service account), never the
 * public `VITE_FIREBASE_*` build variables used by the frontend.
 */
export interface Env {
  FIREBASE_SERVICE_ACCOUNT?: string;
  FIREBASE_PROJECT_ID?: string;
  SCAN_HASH_SALT?: string;
  /** Local Firestore emulator, e.g. `127.0.0.1:8080`. Never set in production. */
  FIRESTORE_EMULATOR_HOST?: string;
}

/**
 * Returns the bindings for the current request.
 *
 * In production (Cloudflare) `env` is always provided by the runtime. During
 * `vite dev` there is no runtime binding, so we fall back to `process.env`,
 * which `vite.config.ts` fills from `.env.local`.
 */
export function resolveEnv(bindings?: Env | Record<string, unknown> | null): Env {
  if (bindings && Object.keys(bindings).length > 0) return bindings as Env;
  const fromProcess =
    typeof process !== 'undefined' && process.env
      ? (process.env as Record<string, string | undefined>)
      : {};
  return fromProcess as Env;
}
