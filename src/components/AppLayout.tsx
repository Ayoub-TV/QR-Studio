import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { useAuth } from '../auth/AuthProvider';
import { getFirebase } from '../lib/firebase';
import { Icon, type IconName } from './Icons';
import { Logo, LogoMark } from './Logo';

interface NavItem {
  to: string;
  label: string;
  icon: IconName;
  end?: boolean;
}

const NAV: NavItem[] = [
  { to: '/app', label: 'Tableau de bord', icon: 'dashboard', end: true },
  { to: '/app/qrcodes', label: 'Mes QR codes', icon: 'qr' },
  { to: '/app/settings', label: 'Paramètres', icon: 'settings' },
];

function initials(name: string, email: string): string {
  const source = (name || email || '?').trim();
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export default function AppLayout() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

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

  const displayName = profile?.displayName || user?.displayName || 'Compte';
  const email = profile?.email || user?.email || '';

  const sidebar = (
    <div className="flex h-full flex-col bg-ink text-white">
      <div className="flex h-16 items-center justify-between px-5">
        <span className="inline-flex items-center gap-2.5">
          <LogoMark size={26} inverted />
          <span className="text-[15px] font-semibold tracking-[-0.02em] text-white">QR Studio</span>
        </span>
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="rounded-md p-1.5 text-white/60 hover:bg-white/10 hover:text-white lg:hidden"
          aria-label="Fermer le menu"
        >
          <Icon name="close" size={16} />
        </button>
      </div>

      <div className="px-3 pt-2">
        <NavLink
          to="/app/new"
          className={({ isActive }) =>
            `flex h-9 w-full items-center justify-center gap-2 rounded-lg text-sm font-medium transition ${
              isActive ? 'bg-white/90 text-ink' : 'bg-white text-ink hover:bg-white/90'
            }`
          }
        >
          <Icon name="plus" size={15} />
          Nouveau QR code
        </NavLink>
      </div>

      <nav className="mt-6 flex-1 space-y-1 px-3">
        <p className="px-3 pb-2 text-[10px] font-medium tracking-[0.14em] text-white/30 uppercase">
          Espace de travail
        </p>
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                isActive
                  ? 'bg-white/12 font-medium text-white'
                  : 'text-white/60 hover:bg-white/6 hover:text-white'
              }`
            }
          >
            <Icon name={item.icon} size={17} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/12 text-[11px] font-semibold text-white">
            {initials(displayName, email)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-white">{displayName}</p>
            <p className="truncate text-[11px] text-white/40">{email}</p>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            title="Se déconnecter"
            aria-label="Se déconnecter"
            className="rounded-md p-1.5 text-white/50 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
          >
            <Icon name="logout" size={16} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-canvas">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] lg:block">{sidebar}</aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-ink/50 backdrop-blur-[1px]"
            onClick={() => setMobileOpen(false)}
            role="presentation"
          />
          <div className="animate-fade absolute inset-y-0 left-0 w-[268px] shadow-2xl">{sidebar}</div>
        </div>
      )}

      <div className="lg:pl-[248px]">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-line bg-canvas/85 px-4 backdrop-blur-md lg:hidden">
          <Logo size={24} />
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-md border border-line bg-white p-2 text-zinc-600"
            aria-label="Ouvrir le menu"
          >
            <Icon name="menu" size={16} />
          </button>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
