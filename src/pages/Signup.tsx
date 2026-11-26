import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { AuthShell } from '../components/AuthShell';
import { Alert, Spinner } from '../components/ui';
import { useAuth } from '../auth/AuthProvider';
import { getFirebase } from '../lib/firebase';
import { authErrorMessage } from '../lib/authErrors';

export default function Signup() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) return <Navigate to="/app" replace />;

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (name.trim().length < 2) {
      setError('Entrez votre nom.');
      return;
    }
    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    if (password !== confirm) {
      setError('Les deux mots de passe ne correspondent pas.');
      return;
    }

    setSubmitting(true);
    try {
      const { auth } = getFirebase();
      const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateProfile(credential.user, { displayName: name.trim() });
      navigate('/app', { replace: true });
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Créer un compte"
      subtitle="Vos QR codes, vos statistiques, votre espace."
      footer={
        <>
          Vous avez déjà un compte ?{' '}
          <Link to="/login" className="font-medium text-ink underline decoration-zinc-300 underline-offset-4 hover:decoration-ink">
            Se connecter
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {error && <Alert variant="error">{error}</Alert>}

        <div>
          <label className="label" htmlFor="name">
            Nom complet
          </label>
          <input
            id="name"
            className="input"
            autoComplete="name"
            placeholder="Camille Martin"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>

        <div>
          <label className="label" htmlFor="email">
            Adresse email
          </label>
          <input
            id="email"
            type="email"
            className="input"
            autoComplete="email"
            placeholder="vous@exemple.com"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        <div>
          <label className="label" htmlFor="password">
            Mot de passe
          </label>
          <input
            id="password"
            type="password"
            className="input"
            autoComplete="new-password"
            placeholder="6 caractères minimum"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>

        <div>
          <label className="label" htmlFor="confirm">
            Confirmer le mot de passe
          </label>
          <input
            id="confirm"
            type="password"
            className="input"
            autoComplete="new-password"
            placeholder="••••••••"
            required
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
          />
        </div>

        <button type="submit" className="btn btn-primary w-full" disabled={submitting}>
          {submitting ? <Spinner /> : null}
          Créer mon compte
        </button>

        <p className="hint text-center">
          En créant un compte, vous acceptez que vos QR codes et statistiques soient stockés dans
          Firestore.
        </p>
      </form>
    </AuthShell>
  );
}
