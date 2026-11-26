import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getFirebase, isFirebaseConfigured } from '../lib/firebase';
import type { UserProfile } from '../lib/types';

interface AuthValue {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(isFirebaseConfigured);

  const loadProfile = useCallback(async (current: User) => {
    const { db } = getFirebase();
    const ref = doc(db, 'users', current.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      const initial: UserProfile = {
        email: current.email ?? '',
        displayName: current.displayName ?? (current.email ?? '').split('@')[0] ?? '',
      };
      await setDoc(ref, { ...initial, createdAt: serverTimestamp() });
      setProfile(initial);
      return initial;
    }
    const data = snap.data() as UserProfile;
    // Keep the stored name in sync with the auth profile (the listener can fire
    // before signup finishes writing displayName).
    if (current.displayName && data.displayName !== current.displayName) {
      const synced = { ...data, displayName: current.displayName };
      await setDoc(ref, { displayName: current.displayName, updatedAt: serverTimestamp() }, { merge: true });
      setProfile(synced);
      return synced;
    }
    setProfile(data);
    return data;
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }
    const { auth } = getFirebase();
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      if (!nextUser) {
        setProfile(null);
        setLoading(false);
        return;
      }
      void loadProfile(nextUser)
        .catch((error) => {
          console.error('[qr-studio] profil introuvable', error);
          setProfile({ email: nextUser.email ?? '', displayName: nextUser.displayName ?? '' });
        })
        .finally(() => setLoading(false));
    });
    return unsubscribe;
  }, [loadProfile]);

  const refreshProfile = useCallback(async () => {
    const { auth } = getFirebase();
    if (auth.currentUser) await loadProfile(auth.currentUser);
  }, [loadProfile]);

  const value = useMemo(
    () => ({ user, profile, loading, refreshProfile }),
    [user, profile, loading, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth doit être utilisé dans AuthProvider');
  return context;
}
