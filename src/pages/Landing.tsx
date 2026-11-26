import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { Icon, TypeIcon, type IconName } from '../components/Icons';
import { Logo } from '../components/Logo';
import { QrImage } from '../components/QrImage';

const FEATURES: { icon: IconName; title: string; text: string }[] = [
  {
    icon: 'link',
    title: 'QR code dynamique',
    text: 'Le code imprimé pointe vers un lien court QR Studio. Vous changez la destination, le support reste valable.',
  },
  {
    icon: 'scan',
    title: 'Chaque scan enregistré',
    text: 'La fonction de redirection écrit le scan dans Firestore avant de rediriger le visiteur, en une seule transaction.',
  },
  {
    icon: 'chart',
    title: 'Statistiques réelles',
    text: 'Total, scans du jour, visiteurs uniques estimés, graphique par jour et classement de vos QR codes.',
  },
  {
    icon: 'users',
    title: 'Données cloisonnées',
    text: 'Les règles Firestore n’autorisent chaque compte qu’à lire et modifier ses propres QR codes et statistiques.',
  },
  {
    icon: 'download',
    title: 'Exports prêts à imprimer',
    text: 'PNG en 2048 px pour l’impression rapide, SVG vectoriel pour les imprimeurs et les maquettes.',
  },
  {
    icon: 'clock',
    title: 'Historique complet',
    text: 'Appareil, navigateur, ville et provenance de chaque scan, avec la date exacte et le QR code concerné.',
  },
];

const STEPS = [
  {
    title: 'Créez votre QR code',
    text: 'Choisissez un type (site web, Instagram, Facebook, WhatsApp, YouTube ou texte), nommez-le et ajoutez la destination.',
  },
  {
    title: 'Téléchargez et imprimez',
    text: 'Exportez en PNG ou SVG. Le QR code encode uniquement le lien QR Studio : il ne change plus jamais.',
  },
  {
    title: 'Suivez et ajustez',
    text: 'Modifiez la destination à tout moment et consultez les scans, appareils et provenances depuis le tableau de bord.',
  },
];

const FAQ = [
  {
    q: 'Quelle différence entre un QR code statique et dynamique ?',
    a: 'Un QR code statique contient directement l’adresse finale : pour la changer, il faut réimprimer. Un QR code QR Studio contient un lien court fixe. La destination est stockée dans Firestore et peut être modifiée autant de fois que nécessaire.',
  },
  {
    q: 'Les anciens QR codes continuent-ils de fonctionner après une modification ?',
    a: 'Oui. Le lien /r/… est immuable : seule la destination enregistrée change. Tous les supports déjà imprimés redirigent vers la nouvelle adresse au scan suivant.',
  },
  {
    q: 'Comment les scans sont-ils comptabilisés ?',
    a: 'Chaque visite de /r/:slug passe par une fonction Netlify qui identifie le QR code, incrémente les compteurs dans une transaction Firestore, enregistre le détail du scan, puis redirige immédiatement le visiteur.',
  },
  {
    q: 'Comment sont estimés les visiteurs uniques ?',
    a: 'Une empreinte hachée (IP + User-Agent + sel serveur) est conservée par QR code. Aucune adresse IP brute n’est stockée. Un même appareil qui scanne deux fois le même QR code ne compte qu’un visiteur unique.',
  },
  {
    q: 'Où sont hébergés mon application et mes données ?',
    a: 'Le frontend et la fonction de redirection sont hébergés sur Netlify ; l’authentification et la base de données sont gérées par Firebase. Les clés serveur restent dans les variables d’environnement Netlify.',
  },
];

export default function Landing() {
  const { user } = useAuth();
  const appLink = user ? '/app' : '/signup';

  return (
    <div className="bg-white">
      <header className="sticky top-0 z-40 border-b border-line bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link to="/" aria-label="QR Studio, accueil">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-7 text-[13px] text-zinc-600 md:flex">
            <a href="#fonctionnalites" className="transition hover:text-ink">
              Fonctionnalités
            </a>
            <a href="#fonctionnement" className="transition hover:text-ink">
              Fonctionnement
            </a>
            <a href="#types" className="transition hover:text-ink">
              Types de QR
            </a>
            <a href="#faq" className="transition hover:text-ink">
              FAQ
            </a>
          </nav>
          <div className="flex items-center gap-2">
            {user ? (
              <Link to="/app" className="btn btn-primary btn-sm">
                Ouvrir mon espace
              </Link>
            ) : (
              <>
                <Link to="/login" className="btn btn-ghost btn-sm">
                  Connexion
                </Link>
                <Link to="/signup" className="btn btn-primary btn-sm">
                  Créer un compte
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="grid-pattern pointer-events-none absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_at_top,black,transparent_72%)]" />
        <div className="relative mx-auto grid max-w-6xl gap-14 px-5 py-16 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:py-24">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1 text-[11px] font-medium tracking-wide text-zinc-600">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              QR codes dynamiques · suivi des scans
            </span>

            <h1 className="mt-6 text-[40px] leading-[1.05] font-semibold tracking-[-0.04em] sm:text-[54px]">
              Vos QR codes imprimés ne seront plus jamais obsolètes.
            </h1>

            <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-zinc-600 sm:text-base">
              QR Studio crée des QR codes dynamiques, mesure chaque scan et vous laisse changer la
              destination à tout moment — sans réimprimer le moindre support.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to={appLink} className="btn btn-primary h-11 px-5">
                {user ? 'Ouvrir mon espace' : 'Créer mon premier QR code'}
                <Icon name="arrowRight" size={16} />
              </Link>
              <a href="#fonctionnement" className="btn btn-secondary h-11 px-5">
                Voir comment ça marche
              </a>
            </div>

            <ul className="mt-9 flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-zinc-500">
              {['Redirection immédiate', 'Statistiques réelles', 'Exports PNG & SVG'].map((item) => (
                <li key={item} className="inline-flex items-center gap-1.5">
                  <Icon name="check" size={13} className="text-emerald-600" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="animate-fade-up [animation-delay:120ms]">
            <div className="relative">
              <div className="absolute -inset-4 rounded-[26px] bg-gradient-to-br from-zinc-100 to-white" />
              <div className="relative overflow-hidden rounded-2xl border border-line bg-white shadow-[0_24px_60px_-32px_rgba(10,10,11,0.35)]">
                <div className="flex items-center gap-2 border-b border-line px-4 py-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-zinc-200" />
                  <span className="h-2.5 w-2.5 rounded-full bg-zinc-200" />
                  <span className="h-2.5 w-2.5 rounded-full bg-zinc-200" />
                  <span className="ml-2 text-[11px] text-zinc-400">Aperçu du tableau de bord</span>
                </div>

                <div className="grid gap-4 p-4 sm:grid-cols-[auto_1fr]">
                  <div className="flex flex-col items-center gap-2 rounded-xl border border-line bg-zinc-50/70 p-3.5">
                    <QrImage
                      value={typeof window !== 'undefined' ? window.location.origin : 'https://qr-studio.app'}
                      size={132}
                      className="shadow-sm"
                    />
                    <span className="font-mono text-[10px] text-zinc-400">/r/abc123</span>
                  </div>

                  <div className="space-y-2.5">
                    <div className="rounded-xl border border-line p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-[12px] font-medium">Affiche — Campagne hiver</p>
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                          Actif
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-zinc-400">Site web · destination modifiable</p>
                    </div>

                    <div className="rounded-xl border border-line p-3">
                      <p className="text-[10px] font-medium tracking-wide text-zinc-400 uppercase">
                        Scans par jour
                      </p>
                      <svg viewBox="0 0 220 48" className="mt-2 h-12 w-full" aria-hidden="true">
                        <defs>
                          <linearGradient id="landingSpark" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.18" />
                            <stop offset="100%" stopColor="#4f46e5" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        <path
                          d="M0 36 L26 32 L52 34 L78 24 L104 27 L130 16 L156 20 L182 10 L208 13 L220 8"
                          fill="none"
                          stroke="#4f46e5"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                        />
                        <path
                          d="M0 36 L26 32 L52 34 L78 24 L104 27 L130 16 L156 20 L182 10 L208 13 L220 8 L220 48 L0 48 Z"
                          fill="url(#landingSpark)"
                        />
                      </svg>
                    </div>

                    <div className="flex items-center gap-2 rounded-xl border border-line px-3 py-2.5">
                      <Icon name="link" size={13} className="text-zinc-400" />
                      <p className="text-[11px] text-zinc-500">
                        Destination mise à jour sans réimprimer
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="fonctionnalites" className="border-t border-line bg-canvas py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="max-w-2xl">
            <p className="text-[11px] font-medium tracking-[0.14em] text-zinc-400 uppercase">
              Fonctionnalités
            </p>
            <h2 className="mt-3 text-[30px] leading-tight font-semibold tracking-[-0.03em]">
              Tout le cycle de vie de vos QR codes, au même endroit.
            </h2>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="card p-5 transition hover:border-zinc-300">
                <span className="grid h-9 w-9 place-items-center rounded-lg border border-line bg-zinc-50 text-zinc-600">
                  <Icon name={feature.icon} size={16} />
                </span>
                <h3 className="mt-4 text-sm font-medium">{feature.title}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-500">{feature.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="fonctionnement" className="py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.3fr] lg:items-start">
            <div>
              <p className="text-[11px] font-medium tracking-[0.14em] text-zinc-400 uppercase">
                Fonctionnement
              </p>
              <h2 className="mt-3 text-[30px] leading-tight font-semibold tracking-[-0.03em]">
                Trois étapes, aucun réglage technique.
              </h2>
              <p className="mt-4 max-w-md text-[15px] leading-relaxed text-zinc-600">
                Le QR code encode uniquement un lien court. C’est la redirection, côté serveur, qui
                connaît la destination actuelle et enregistre le scan.
              </p>
              <Link to={appLink} className="btn btn-primary mt-7">
                {user ? 'Ouvrir mon espace' : 'Commencer maintenant'}
                <Icon name="arrowRight" size={15} />
              </Link>
            </div>

            <ol className="space-y-3">
              {STEPS.map((step, index) => (
                <li key={step.title} className="card flex gap-4 p-5">
                  <span className="tabular mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink text-[13px] font-semibold text-white">
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="text-sm font-medium">{step.title}</h3>
                    <p className="mt-1 text-[13px] leading-relaxed text-zinc-500">{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section id="types" className="border-y border-line bg-canvas py-14">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-medium tracking-[0.14em] text-zinc-400 uppercase">
                Types pris en charge
              </p>
              <h2 className="mt-3 text-[24px] leading-tight font-semibold tracking-[-0.02em]">
                Six formats, un seul tableau de bord.
              </h2>
            </div>
            <p className="max-w-sm text-[13px] leading-relaxed text-zinc-500">
              Les QR codes « texte » affichent le message sur une page QR Studio, ce qui permet de
              compter le scan malgré l’absence de redirection.
            </p>
          </div>

          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              { type: 'url', label: 'Site web' },
              { type: 'instagram', label: 'Instagram' },
              { type: 'facebook', label: 'Facebook' },
              { type: 'whatsapp', label: 'WhatsApp' },
              { type: 'youtube', label: 'YouTube' },
              { type: 'text', label: 'Texte simple' },
            ].map((item) => (
              <div key={item.type} className="card flex items-center gap-2.5 px-3 py-3">
                <span className="text-zinc-500">
                  <TypeIcon type={item.type} size={16} />
                </span>
                <span className="text-[13px] font-medium">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="py-16 sm:py-20">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 sm:px-8 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <p className="text-[11px] font-medium tracking-[0.14em] text-zinc-400 uppercase">FAQ</p>
            <h2 className="mt-3 text-[30px] leading-tight font-semibold tracking-[-0.03em]">
              Les questions que l’on nous pose le plus.
            </h2>
          </div>

          <div className="divide-y divide-line rounded-xl border border-line">
            {FAQ.map((item) => (
              <details key={item.q} className="group px-5 py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium">
                  {item.q}
                  <Icon
                    name="chevronDown"
                    size={16}
                    className="shrink-0 text-zinc-400 transition group-open:rotate-180"
                  />
                </summary>
                <p className="mt-2.5 max-w-2xl text-[13px] leading-relaxed text-zinc-500">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 pb-16 sm:px-8">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-2xl bg-ink px-6 py-12 text-white sm:px-10">
          <div className="dark-grid-pattern pointer-events-none absolute inset-0 opacity-60" />
          <div className="relative flex flex-wrap items-center justify-between gap-6">
            <div className="max-w-xl">
              <h2 className="text-[26px] leading-tight font-semibold tracking-[-0.03em] sm:text-[30px]">
                Créez votre premier QR code dynamique en moins d’une minute.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-white/50">
                Compte gratuit, exports illimités, statistiques en temps réel. Aucune carte bancaire
                requise.
              </p>
            </div>
            <Link
              to={appLink}
              className="btn h-11 bg-white px-5 text-ink hover:bg-white/90"
            >
              {user ? 'Ouvrir mon espace' : 'Créer mon compte'}
              <Icon name="arrowRight" size={15} />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-line bg-white py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 text-[13px] text-zinc-500 sm:flex-row sm:px-8">
          <div className="flex items-center gap-2.5">
            <Logo size={22} />
          </div>
          <p>© {new Date().getFullYear()} QR Studio · Frontend Netlify · Données Firebase</p>
          <div className="flex gap-5">
            {user ? (
              <Link to="/app" className="hover:text-ink">
                Tableau de bord
              </Link>
            ) : (
              <>
                <Link to="/login" className="hover:text-ink">
                  Connexion
                </Link>
                <Link to="/signup" className="hover:text-ink">
                  Inscription
                </Link>
              </>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
