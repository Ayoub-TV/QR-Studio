import { LogoMark } from '../components/Logo';
import { Icon } from '../components/Icons';

const VARS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
];

export default function SetupNotice() {
  return (
    <div className="min-h-screen bg-canvas px-5 py-12">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center gap-2.5">
          <LogoMark size={28} />
          <span className="text-[15px] font-semibold tracking-[-0.02em]">QR Studio</span>
        </div>

        <div className="card mt-6 p-6 sm:p-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-zinc-50 px-3 py-1 text-[11px] font-medium text-zinc-600">
            <Icon name="alert" size={12} />
            Configuration requise
          </span>

          <h1 className="mt-4 text-[24px] leading-tight font-semibold tracking-[-0.03em]">
            Connectez votre projet Firebase
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600">
            L’application est prête, mais elle a besoin des identifiants publics de votre projet
            Firebase (Authentication + Firestore) pour fonctionner.
          </p>

          <ol className="mt-6 space-y-4 text-sm text-zinc-600">
            <li className="flex gap-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ink text-[11px] font-semibold text-white">
                1
              </span>
              <span>
                Créez un projet sur{' '}
                <a
                  href="https://console.firebase.google.com"
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-ink underline decoration-zinc-300 underline-offset-4"
                >
                  console.firebase.google.com
                </a>
                , activez <strong className="font-medium">Authentication → Email/Password</strong> et{' '}
                <strong className="font-medium">Firestore Database</strong>.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ink text-[11px] font-semibold text-white">
                2
              </span>
              <span>
                Ajoutez une application Web et copiez les valeurs de configuration dans un fichier{' '}
                <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-[12px]">.env.local</code> à la
                racine du projet.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ink text-[11px] font-semibold text-white">
                3
              </span>
              <span>Redémarrez le serveur de développement. Cette page disparaîtra.</span>
            </li>
          </ol>

          <div className="mt-6 rounded-xl border border-line bg-zinc-50 p-4">
            <p className="text-[11px] font-medium tracking-wide text-zinc-400 uppercase">
              Variables attendues
            </p>
            <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
              {VARS.map((name) => (
                <li key={name} className="font-mono text-[11.5px] text-zinc-600">
                  {name}
                </li>
              ))}
            </ul>
          </div>

          <p className="hint mt-5">
            Pour tester immédiatement sans projet Firebase, lancez{' '}
            <code className="rounded bg-zinc-100 px-1.5 py-0.5">npm run emulators</code> puis mettez{' '}
            <code className="rounded bg-zinc-100 px-1.5 py-0.5">VITE_USE_EMULATORS=true</code> dans{' '}
            <code className="rounded bg-zinc-100 px-1.5 py-0.5">.env.local</code>. Les émulateurs
            Firebase nécessitent Java 11 ou plus.
          </p>
        </div>
      </div>
    </div>
  );
}
