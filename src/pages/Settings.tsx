import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  signOut,
  updatePassword,
  updateProfile,
} from 'firebase/auth';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useAuth } from '../auth/AuthProvider';
import { firebaseProjectId, getFirebase, useEmulators } from '../lib/firebase';
import { authErrorMessage } from '../lib/authErrors';
import { Alert, Spinner } from '../components/ui';
import { Icon } from '../components/Icons';
import { formatDate } from '../lib/format';

export default function Settings() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [nameNotice, setNameNotice] = useState<{ variant: 'success' | 'error'; text: string } | null>(
    null,
  );

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordNotice, setPasswordNotice] = useState<{
    variant: 'success' | 'error';
    text: string;
  } | null>(null);

  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    setName(profile?.displayName ?? '');
  }, [profile?.displayName]);

  const handleProfile = async (event: FormEvent) => {
    event.preventDefault();
    if (!user) return;
    setNameNotice(null);
    if (name.trim().length < 2) {
      setNameNotice({ variant: 'error', text: 'Entrez un nom d’au moins 2 caractères.' });
      return;
    }
    setSavingName(true);
    try {
      const { db } = getFirebase();
      await updateProfile(user, { displayName: name.trim() });
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: name.trim(),
        updatedAt: serverTimestamp(),
      });
      await refreshProfile();
      setNameNotice({ variant: 'success', text: 'Profil mis à jour.' });
    } catch (err) {
      setNameNotice({ variant: 'error', text: authErrorMessage(err) });
    } finally {
      setSavingName(false);
    }
  };

  const handlePassword = async (event: FormEvent) => {
    event.preventDefault();
    if (!user || !user.email) return;
    setPasswordNotice(null);

    if (newPassword.length < 6) {
      setPasswordNotice({
        variant: 'error',
        text: 'Le nouveau mot de passe doit contenir au moins 6 caractères.',
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordNotice({ variant: 'error', text: 'Les deux nouveaux mots de passe diffèrent.' });
      return;
    }

    setSavingPassword(true);
    try {
      const { auth } = getFirebase();
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(auth.currentUser ?? user, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordNotice({ variant: 'success', text: 'Mot de passe mis à jour.' });
    } catch (err) {
      setPasswordNotice({ variant: 'error', text: authErrorMessage(err) });
    } finally {
      setSavingPassword(false);
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      const { auth } = getFirebase();
      await signOut(auth);
      navigate('/login', { replace: true });
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[26px] leading-tight font-semibold tracking-[-0.03em]">Paramètres</h1>
        <p className="mt-1 text-sm text-zinc-500">Votre compte, votre sécurité et votre projet.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <div className="card p-5 sm:p-6">
          <h2 className="text-[15px] font-semibold tracking-[-0.01em]">Profil</h2>
          <p className="mt-0.5 text-[13px] text-zinc-500">
            Ce nom apparaît dans la barre latérale de votre espace.
          </p>

          <form onSubmit={handleProfile} className="mt-4 space-y-4" noValidate>
            {nameNotice && (
              <Alert variant={nameNotice.variant} onClose={() => setNameNotice(null)}>
                {nameNotice.text}
              </Alert>
            )}

            <div>
              <label className="label" htmlFor="display-name">
                Nom
              </label>
              <input
                id="display-name"
                className="input"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>

            <div>
              <label className="label" htmlFor="account-email">
                Adresse email
              </label>
              <input
                id="account-email"
                className="input"
                value={user?.email ?? ''}
                disabled
                readOnly
              />
              <p className="hint mt-1.5">
                L’adresse email se modifie depuis la console Firebase Authentication.
              </p>
            </div>

            <button type="submit" className="btn btn-primary btn-sm" disabled={savingName}>
              {savingName ? <Spinner /> : null}
              Enregistrer
            </button>
          </form>
        </div>

        <div className="card p-5 sm:p-6">
          <h2 className="text-[15px] font-semibold tracking-[-0.01em]">Sécurité</h2>
          <p className="mt-0.5 text-[13px] text-zinc-500">
            Confirmez votre mot de passe actuel pour en choisir un nouveau.
          </p>

          <form onSubmit={handlePassword} className="mt-4 space-y-4" noValidate>
            {passwordNotice && (
              <Alert variant={passwordNotice.variant} onClose={() => setPasswordNotice(null)}>
                {passwordNotice.text}
              </Alert>
            )}

            <div>
              <label className="label" htmlFor="current-password">
                Mot de passe actuel
              </label>
              <input
                id="current-password"
                type="password"
                autoComplete="current-password"
                className="input"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
              />
            </div>

            <div>
              <label className="label" htmlFor="new-password">
                Nouveau mot de passe
              </label>
              <input
                id="new-password"
                type="password"
                autoComplete="new-password"
                className="input"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
              />
            </div>

            <div>
              <label className="label" htmlFor="confirm-password">
                Confirmer le nouveau mot de passe
              </label>
              <input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                className="input"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-secondary btn-sm" disabled={savingPassword}>
              {savingPassword ? <Spinner /> : <Icon name="lock" size={14} />}
              Mettre à jour le mot de passe
            </button>
          </form>
        </div>

        <div className="card p-5 sm:p-6">
          <h2 className="text-[15px] font-semibold tracking-[-0.01em]">Compte</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-zinc-500">Créé le</dt>
              <dd className="font-medium">{formatDate(profile?.createdAt)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-zinc-500">Identifiant</dt>
              <dd className="max-w-[55%] truncate font-mono text-xs text-zinc-600">{user?.uid}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-zinc-500">Projet Firebase</dt>
              <dd className="font-mono text-xs text-zinc-600">{firebaseProjectId}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-zinc-500">Mode</dt>
              <dd className="text-xs font-medium">
                {useEmulators ? 'Émulateurs locaux' : 'Firebase (production)'}
              </dd>
            </div>
          </dl>

          <button
            type="button"
            className="btn btn-secondary btn-sm mt-5"
            onClick={handleSignOut}
            disabled={signingOut}
          >
            {signingOut ? <Spinner /> : <Icon name="logout" size={14} />}
            Se déconnecter
          </button>
        </div>

        <div className="card p-5 sm:p-6">
          <h2 className="text-[15px] font-semibold tracking-[-0.01em]">Liens de redirection</h2>
          <p className="mt-0.5 text-[13px] text-zinc-500">
            Chaque QR code pointe vers son propre lien sur ce domaine.
          </p>
          <div className="mt-4 rounded-lg border border-line bg-zinc-50 px-3 py-2.5">
            <p className="font-mono text-[12px] break-all text-zinc-600">
              {window.location.origin}/r/<span className="text-zinc-400">{'{slug}'}</span>
            </p>
          </div>
          <p className="hint mt-3">
            Pour un domaine personnalisé, configurez-le dans Netlify : les QR codes déjà imprimés
            continueront de fonctionner si le domaine reste actif.
          </p>
        </div>
      </div>
    </div>
  );
}
