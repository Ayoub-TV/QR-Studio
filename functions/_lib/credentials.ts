import type { Env } from './env.ts';

/**
 * Firestore access from a Cloudflare Worker.
 *
 * `firebase-admin` cannot run on workerd (it depends on Node's gRPC/HTTP2 and
 * filesystem modules), so this module talks to the Firestore REST API with an
 * OAuth 2.0 access token minted from the service account key using WebCrypto.
 * Functionally this is the same privileged access the Admin SDK had: Firestore
 * security rules are bypassed, so scans can be written by the function alone.
 */

export interface FirestoreTarget {
  projectId: string;
  baseUrl: string;
  token: string | null;
}

interface ServiceAccount {
  project_id?: string;
  client_email?: string;
  private_key?: string;
  token_uri?: string;
}

const DATABASE_SCOPE = 'https://www.googleapis.com/auth/datastore';
const DEFAULT_TOKEN_URI = 'https://oauth2.googleapis.com/token';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toBinary(bytes: Uint8Array): string {
  let out = '';
  for (let index = 0; index < bytes.length; index += 1) out += String.fromCharCode(bytes[index]);
  return out;
}

function toBase64(bytes: Uint8Array): string {
  return btoa(toBinary(bytes));
}

function toBase64Url(bytes: Uint8Array): string {
  return toBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function textToBase64Url(value: string): string {
  return toBase64Url(encoder.encode(value));
}

function pemToPkcs8(pem: string): ArrayBuffer {
  const body = pem
    .replace(/-----BEGIN [^-]+-----/g, '')
    .replace(/-----END [^-]+-----/g, '')
    .replace(/\s+/g, '');
  const bytes = fromBase64(body);
  // A fresh Uint8Array owns its buffer, so `buffer` is exactly the key length.
  return bytes.buffer as ArrayBuffer;
}

/**
 * Accepts the raw JSON of the service account key, or its base64 encoding
 * (useful when a dashboard mangles multi-line values).
 */
export function parseServiceAccount(raw: string): ServiceAccount {
  const trimmed = raw.trim();
  const json = trimmed.startsWith('{')
    ? trimmed
    : decoder.decode(fromBase64(trimmed));
  const account = JSON.parse(json) as ServiceAccount;
  if (typeof account.private_key === 'string') {
    // Some dashboards store the value with literal backslash-n sequences.
    account.private_key = account.private_key.replace(/\\n/g, '\n');
  }
  return account;
}

let tokenCache: { account: string; token: string; expiresAt: number } | null = null;

async function getAccessToken(account: ServiceAccount): Promise<string> {
  const clientEmail = account.client_email as string;
  const now = Date.now();
  if (tokenCache && tokenCache.account === clientEmail && tokenCache.expiresAt > now + 60_000) {
    return tokenCache.token;
  }

  const tokenUri = account.token_uri || DEFAULT_TOKEN_URI;
  const issuedAt = Math.floor(now / 1000);
  const header = textToBase64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = textToBase64Url(
    JSON.stringify({
      iss: clientEmail,
      scope: DATABASE_SCOPE,
      aud: tokenUri,
      iat: issuedAt,
      exp: issuedAt + 3600,
    }),
  );
  const unsigned = `${header}.${claims}`;

  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToPkcs8(account.private_key as string),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    encoder.encode(unsigned).buffer as ArrayBuffer,
  );

  const response = await fetch(tokenUri, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${unsigned}.${toBase64Url(new Uint8Array(signature))}`,
    }).toString(),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => '');
    throw new Error(
      `[qr-studio] authentification Firebase refusée (${response.status}). ${details.slice(0, 300)}`,
    );
  }

  const payload = (await response.json()) as { access_token?: string; expires_in?: number };
  if (!payload.access_token) throw new Error('[qr-studio] réponse OAuth sans access_token');

  tokenCache = {
    account: clientEmail,
    token: payload.access_token,
    expiresAt: now + (payload.expires_in ?? 3600) * 1000,
  };
  return payload.access_token;
}

/**
 * Resolves the Firestore endpoint and credentials for one request.
 * Supports the local emulator (`FIRESTORE_EMULATOR_HOST`), which needs no key.
 */
export async function getFirestoreTarget(env: Env): Promise<FirestoreTarget> {
  const emulator = env.FIRESTORE_EMULATOR_HOST?.trim();
  const raw = env.FIREBASE_SERVICE_ACCOUNT?.trim();
  const account = raw ? parseServiceAccount(raw) : null;
  const configuredProject = env.FIREBASE_PROJECT_ID?.trim();
  const projectId = account?.project_id || configuredProject || (emulator ? 'qr-studio-dev' : '');

  if (emulator) {
    const withProtocol = emulator.startsWith('http') ? emulator : `http://${emulator}`;
    return { projectId, baseUrl: withProtocol.replace(/\/+$/, ''), token: null };
  }

  if (!account) {
    throw new Error(
      '[qr-studio] FIREBASE_SERVICE_ACCOUNT manquant : ajoutez la clé de compte de service ' +
        'Firebase dans les variables chiffrées du projet Cloudflare Pages.',
    );
  }
  if (!account.client_email || !account.private_key) {
    throw new Error(
      '[qr-studio] FIREBASE_SERVICE_ACCOUNT invalide : client_email et private_key sont requis.',
    );
  }
  if (!projectId) {
    throw new Error('[qr-studio] FIREBASE_PROJECT_ID manquant (ou absent de la clé de service).');
  }

  return {
    projectId,
    baseUrl: 'https://firestore.googleapis.com',
    token: await getAccessToken(account),
  };
}
