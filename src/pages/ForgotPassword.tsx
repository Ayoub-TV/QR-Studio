import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { AuthShell } from '../components/AuthShell';
import { Alert, Spinner } from '../components/ui';
import { getFirebase } from '../lib/firebase';
import { authErrorMessage } from '../lib/authErrors';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { auth } = getFirebase();
      await sendPasswordResetEmail(auth, email.trim());
      setSent(true);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Mot de passe oublié"
      subtitle="Nous vous envoyons un lien sécurisé pour choisir un nouveau mot de passe."
      footer={
        <Link
          to="/login"
          className="font-medium text-ink underline decoration-zinc-300 underline-offset-4 hover:decoration-ink"
        >
          Retour à la connexion
        </Link>
      }
    >
      {sent ? (
        <div className="space-y-4">
          <Alert variant="success" title="Email envoyé">
            Si un compte existe pour <span className="font-medium">{email}</span>, vous recevrez un
            lien de réinitialisation dans quelques instants. Pensez à vérifier vos indésirables.
          </Alert>
          <button type="button" className="btn btn-secondary w-full" onClick={() => setSent(false)}>
            Renvoyer l’email
          </button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          {error && <Alert variant="error">{error}</Alert>}
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
          <button type="submit" className="btn btn-primary w-full" disabled={submitting}>
            {submitting ? <Spinner /> : null}
            Envoyer le lien
          </button>
        </form>
      )}
    </AuthShell>
  );
}
