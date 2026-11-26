import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

let cached: Firestore | null = null;

function parseServiceAccount(raw: string): Record<string, unknown> {
  const trimmed = raw.trim();
  const json = trimmed.startsWith('{') ? trimmed : Buffer.from(trimmed, 'base64').toString('utf8');
  return JSON.parse(json) as Record<string, unknown>;
}

/**
 * Initialises firebase-admin once per function instance.
 *
 * Production: set FIREBASE_SERVICE_ACCOUNT (raw JSON or base64 of the service
 * account key) in Netlify. Never expose it to the browser.
 * Local/emulator: FIRESTORE_EMULATOR_HOST is set by the Firebase emulator, in
 * which case no credentials are needed.
 */
export function getDb(): Firestore {
  if (cached) return cached;

  const projectId = process.env.FIREBASE_PROJECT_ID || undefined;
  const usingEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

  if (getApps().length === 0) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;

    if (raw && raw.trim().length > 0) {
      const credentials = parseServiceAccount(raw);
      // Netlify stores the private key with escaped newlines.
      if (typeof credentials.private_key === 'string') {
        credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
      }
      initializeApp({
        credential: cert(credentials),
        projectId: (credentials.project_id as string | undefined) ?? projectId,
      });
    } else if (usingEmulator) {
      initializeApp({ projectId: projectId ?? 'qr-studio-dev' });
    } else {
      initializeApp({ credential: applicationDefault(), projectId });
    }
  }

  cached = getFirestore();
  return cached;
}
