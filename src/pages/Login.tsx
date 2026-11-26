import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { AuthShell } from '../components/AuthShell';
import { Alert, Spinner } from '../components/ui';
import { useAuth } from '../auth/AuthProvider';
import { getFirebase } from '../lib/firebase';
import { authErrorMessage } from '../lib/authErrors';

export default function Login() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const from = (location.state as { from?: string } | null)?.from ?? '/app';

  if (!loading && user) return <Navigate to={from} replace />;

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { auth } = getFirebase();
      await signInWithEmailAndPassword(auth, email.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Connexion"
      subtitle="Accédez à vos QR codes et à leurs statistiques."
      footer={
        <>
          Pas encore de compte ?{' '}
          <Link to="/signup" className="font-medium text-ink underline decoration-zinc-300 underline-offset-4 hover:decoration-ink">
            Créer un compte
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {error && <Alert variant="error">{error}</Alert>}

        <div>
          <label className="label" htmlFor="email">
            Adresse email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            className="input"
            placeholder="vous@exemple.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="label" htmlFor="password">
              Mot de passe
            </label>
            <Link
              to="/forgot-password"
              className="mb-1.5 text-xs text-zinc-500 underline decoration-zinc-200 underline-offset-4 hover:text-ink"
            >
              Mot de passe oublié ?
            </Link>
          </div>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            className="input"
            placeholder="••••••••"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>

        <button type="submit" className="btn btn-primary w-full" disabled={submitting}>
          {submitting ? <Spinner /> : null}
          Se connecter
        </button>
      </form>
    </AuthShell>
  );
}
