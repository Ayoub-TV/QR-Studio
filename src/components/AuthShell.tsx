import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { LogoMark } from '../components/Logo';
import { Icon } from '../components/Icons';

const POINTS = [
  {
    icon: 'link' as const,
    title: 'Lien modifiable, QR code inchangé',
    text: 'Changez la destination sans réimprimer vos supports.',
  },
  {
    icon: 'chart' as const,
    title: 'Chaque scan enregistré',
    text: 'Total, scans du jour, visiteurs uniques et historique.',
  },
  {
    icon: 'download' as const,
    title: 'Exports prêts à imprimer',
    text: 'PNG haute résolution et SVG vectoriel en un clic.',
  },
];

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <div className="relative hidden overflow-hidden bg-ink p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="dark-grid-pattern pointer-events-none absolute inset-0 opacity-70" />
        <div className="relative">
          <Link to="/" className="inline-flex items-center gap-2.5">
            <LogoMark size={28} inverted />
            <span className="text-[15px] font-semibold tracking-[-0.02em]">QR Studio</span>
          </Link>
        </div>

        <div className="relative max-w-md">
          <h2 className="text-[34px] leading-[1.1] font-semibold tracking-[-0.035em]">
            Un QR code imprimé.
            <br />
            <span className="text-white/45">Un lien qui reste vivant.</span>
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-white/50">
            Créez, modifiez et mesurez vos QR codes dynamiques depuis un seul espace de travail.
          </p>

          <ul className="mt-9 space-y-5">
            {POINTS.map((point) => (
              <li key={point.title} className="flex gap-3.5">
                <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/12 bg-white/6 text-white/70">
                  <Icon name={point.icon} size={15} />
                </span>
                <div>
                  <p className="text-sm font-medium text-white/90">{point.title}</p>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-white/40">{point.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/30">
          © {new Date().getFullYear()} QR Studio · Statistiques réelles, stockées dans Firestore
        </p>
      </div>

      <div className="flex flex-col justify-center bg-white px-5 py-10 sm:px-10 lg:px-16">
        <div className="mx-auto w-full max-w-[380px]">
          <Link to="/" className="mb-10 inline-flex items-center gap-2.5 lg:hidden">
            <LogoMark size={26} />
            <span className="text-[15px] font-semibold tracking-[-0.02em]">QR Studio</span>
          </Link>

          <h1 className="text-[26px] leading-tight font-semibold tracking-[-0.03em]">{title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-500">{subtitle}</p>

          <div className="mt-8">{children}</div>

          {footer && <div className="mt-8 text-sm text-zinc-500">{footer}</div>}
        </div>
      </div>
    </div>
  );
}
