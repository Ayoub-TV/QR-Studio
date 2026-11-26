import { useEffect, type ReactNode } from 'react';
import { Icon, type IconName } from './Icons';

export function Spinner({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
      aria-hidden="true"
    />
  );
}

export function PageLoader({ label = 'Chargement…' }: { label?: string }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-zinc-400">
      <Spinner className="h-5 w-5" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function Alert({
  variant = 'info',
  title,
  children,
  onClose,
}: {
  variant?: 'info' | 'success' | 'error';
  title?: string;
  children?: ReactNode;
  onClose?: () => void;
}) {
  const styles = {
    info: 'bg-zinc-50 border-line text-zinc-700',
    success: 'bg-emerald-50 border-emerald-100 text-emerald-900',
    error: 'bg-red-50 border-red-100 text-red-900',
  }[variant];
  const icons: Record<string, IconName> = { info: 'alert', success: 'check', error: 'alert' };
  return (
    <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${styles}`}>
      <Icon name={icons[variant]} size={17} className="mt-0.5 shrink-0 opacity-70" />
      <div className="min-w-0 flex-1 leading-relaxed">
        {title && <p className="font-medium">{title}</p>}
        {children}
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-md p-1 opacity-50 transition hover:bg-black/5 hover:opacity-100"
          aria-label="Fermer"
        >
          <Icon name="close" size={14} />
        </button>
      )}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 backdrop-blur-[2px] sm:items-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        className="animate-fade-up w-full max-w-md rounded-2xl border border-line bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold tracking-[-0.01em]">{title}</h2>
            {description && <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-ink"
            aria-label="Fermer"
          >
            <Icon name="close" size={16} />
          </button>
        </div>
        {children && <div className="mt-4">{children}</div>}
        {footer && <div className="mt-6 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon,
  hint,
  loading,
}: {
  label: string;
  value: string;
  icon: IconName;
  hint?: string;
  loading?: boolean;
}) {
  return (
    <div className="card animate-fade-up p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] font-medium text-zinc-500">{label}</p>
        <span className="grid h-8 w-8 place-items-center rounded-lg border border-line bg-zinc-50 text-zinc-500">
          <Icon name={icon} size={15} />
        </span>
      </div>
      <p className="tabular mt-3 text-[28px] leading-none font-semibold tracking-[-0.03em]">
        {loading ? <span className="inline-block h-6 w-16 animate-pulse rounded bg-zinc-100" /> : value}
      </p>
      {hint && <p className="mt-2 text-xs text-zinc-400">{hint}</p>}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: IconName;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-xl border border-line bg-zinc-50 text-zinc-400">
        <Icon name={icon} size={20} />
      </span>
      <h3 className="mt-4 text-sm font-medium">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-zinc-500">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function SectionTitle({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-[15px] font-semibold tracking-[-0.01em]">{title}</h2>
        {description && <p className="mt-0.5 text-[13px] text-zinc-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}
