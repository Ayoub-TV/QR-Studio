import { Link } from 'react-router-dom';
import { Icon } from '../components/Icons';
import { Logo } from '../components/Logo';

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center bg-canvas px-5">
      <div className="w-full max-w-md text-center">
        <div className="flex justify-center">
          <Logo size={30} />
        </div>
        <p className="tabular mt-8 text-[13px] font-medium tracking-[0.2em] text-zinc-400">404</p>
        <h1 className="mt-2 text-[26px] font-semibold tracking-[-0.03em]">Page introuvable</h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-500">
          Cette page n’existe pas. Si vous cherchiez un QR code, demandez un nouveau scan au
          propriétaire du support imprimé.
        </p>
        <div className="mt-7 flex justify-center gap-2">
          <Link to="/" className="btn btn-secondary">
            Retour à l’accueil
          </Link>
          <Link to="/app" className="btn btn-primary">
            Mon espace
            <Icon name="arrowRight" size={15} />
          </Link>
        </div>
      </div>
    </div>
  );
}
