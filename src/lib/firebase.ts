import { initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore';

const env = import.meta.env;

export const useEmulators = env.VITE_USE_EMULATORS === 'true';

const rawConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: env.VITE_FIREBASE_APP_ID as string | undefined,
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
};

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
