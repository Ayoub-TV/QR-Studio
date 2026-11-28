import { initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore';

const env = import.meta.env;

export const useEmulators = env.VITE_USE_EMULATORS === 'true';

/**
 * Configuration Web publique du projet Firebase `qr-studio-d2ebd`.
 *
 * Ces identifiants ne sont pas des secrets : ils sont de toute façon présents
 * dans le bundle envoyé à chaque navigateur, et l'accès aux données est régi
 * par `firestore.rules` (propriétaire uniquement, compteurs réservés au
 * serveur). Ils servent de valeurs par défaut pour qu'un build lancé sans
 * variables `VITE_FIREBASE_*` (build CI Cloudflare Pages par exemple) fasse
 * tourner le vrai projet au lieu d'afficher la page « Configuration requise ».
 *
 * Toute variable `VITE_FIREBASE_*` définie au moment du build reste prioritaire.
 * Aucune clé serveur (compte de service) ne figure ici.
 */
const DEFAULT_FIREBASE_CONFIG = {
  apiKey: 'AIzaSyDw4mb0vV9pCTZhYM7NH7KVfnCvgd_pMGs',
  authDomain: 'qr-studio-d2ebd.firebaseapp.com',
  projectId: 'qr-studio-d2ebd',
  storageBucket: 'qr-studio-d2ebd.firebasestorage.app',
  messagingSenderId: '10220635001',
  appId: '1:10220635001:web:8d816b2c909a230e3725a8',
  measurementId: 'G-101R8EGB1E',
} as const;

function pick(value: string | undefined, fallback: string): string {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : fallback;
}

const rawConfig = {
  apiKey: pick(env.VITE_FIREBASE_API_KEY as string | undefined, DEFAULT_FIREBASE_CONFIG.apiKey),
  authDomain: pick(
    env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
    DEFAULT_FIREBASE_CONFIG.authDomain,
  ),
  projectId: pick(
    env.VITE_FIREBASE_PROJECT_ID as string | undefined,
    DEFAULT_FIREBASE_CONFIG.projectId,
  ),
  storageBucket: pick(
    env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
    DEFAULT_FIREBASE_CONFIG.storageBucket,
  ),
  messagingSenderId: pick(
    env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
    DEFAULT_FIREBASE_CONFIG.messagingSenderId,
  ),
  appId: pick(env.VITE_FIREBASE_APP_ID as string | undefined, DEFAULT_FIREBASE_CONFIG.appId),
  // Optional: when empty, Firebase Analytics is simply not initialised.
  measurementId: pick(
    env.VITE_FIREBASE_MEASUREMENT_ID as string | undefined,
    DEFAULT_FIREBASE_CONFIG.measurementId,
  ),
};

/** True when the frontend has enough Firebase configuration to start. */
export const isFirebaseConfigured = useEmulators || Boolean(rawConfig.apiKey && rawConfig.projectId);

const firebaseConfig = {
  apiKey: rawConfig.apiKey || 'demo-key',
  authDomain: rawConfig.authDomain || 'localhost',
  projectId: rawConfig.projectId || 'qr-studio-dev',
  storageBucket: rawConfig.storageBucket,
  messagingSenderId: rawConfig.messagingSenderId,
  appId: rawConfig.appId,
  measurementId: rawConfig.measurementId,
};

/** GA4 measurement id, empty when Analytics is not configured. */
export const firebaseMeasurementId = rawConfig.measurementId ?? '';

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;
let emulatorsConnected = false;

export function getFirebase(): { app: FirebaseApp; auth: Auth; db: Firestore } {
  if (!isFirebaseConfigured) {
    throw new Error(
      "Firebase n'est pas configuré. Renseignez les variables VITE_FIREBASE_* dans .env.local.",
    );
  }

  if (!app) {
    app = initializeApp(firebaseConfig);
    authInstance = getAuth(app);
    dbInstance = getFirestore(app);

    if (useEmulators && authInstance && dbInstance) {
      connectAuthEmulator(authInstance, 'http://127.0.0.1:9099', { disableWarnings: true });
      connectFirestoreEmulator(dbInstance, '127.0.0.1', 8080);
      emulatorsConnected = true;
    }
  }

  return { app: app!, auth: authInstance!, db: dbInstance! };
}

export function emulatorsAreConnected(): boolean {
  return emulatorsConnected;
}

/** Current project id, displayed in the account settings. */
export const firebaseProjectId = firebaseConfig.projectId;
