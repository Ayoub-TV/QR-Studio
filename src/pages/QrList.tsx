import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { useQrCodes } from '../hooks/useData';
import { formatDate, formatNumber } from '../lib/format';
import { deleteQrCode, shortUrl } from '../lib/qrcodes';
import { displayDestination, qrTypeMeta, QR_TYPES } from '../lib/destinations';
import type { QrCode, QrType } from '../lib/types';
import { Alert, EmptyState, Modal, Spinner } from '../components/ui';
import { Icon, TypeIcon } from '../components/Icons';
import { QrImage } from '../components/QrImage';
import { copyText } from '../lib/clipboard';

export default function QrList() {
  const { user } = useAuth();
  const { qrcodes, loading, error } = useQrCodes(user?.uid);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | QrType>('all');
  const [target, setTarget] = useState<QrCode | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return qrcodes.filter((qr) => {
      if (typeFilter !== 'all' && qr.type !== typeFilter) return false;
      if (!term) return true;
      return (
        qr.name.toLowerCase().includes(term) ||
        qr.destination.toLowerCase().includes(term) ||
        qr.slug.toLowerCase().includes(term)
      );
    });
  }, [qrcodes, search, typeFilter]);

  const handleCopy = async (qr: QrCode) => {
    const ok = await copyText(shortUrl(qr.slug));
    if (!ok) {
      setActionError('Impossible de copier le lien sur ce navigateur.');
      return;
    }
    setCopiedId(qr.id);
    setTimeout(() => setCopiedId((current) => (current === qr.id ? null : current)), 1800);
  };

  const handleDelete = async () => {
    if (!target) return;
    setDeleting(true);
    setActionError(null);
    try {
      await deleteQrCode(target);
      setTarget(null);
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] leading-tight font-semibold tracking-[-0.03em]">Mes QR codes</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {loading
              ? 'Chargement de vos QR codes…'
              : `${formatNumber(qrcodes.length)} QR code${qrcodes.length > 1 ? 's' : ''} · ${formatNumber(
                  qrcodes.reduce((sum, qr) => sum + (qr.totalScans ?? 0), 0),
                )} scans cumulés`}
          </p>
        </div>
        <Link to="/app/new" className="btn btn-primary">
          <Icon name="plus" size={16} />
          Nouveau QR code
        </Link>
      </div>

      {error && <Alert variant="error">{error}</Alert>}
      {actionError && (
        <Alert variant="error" onClose={() => setActionError(null)}>
          {actionError}
        </Alert>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Icon
            name="search"
            size={15}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-zinc-400"
          />
          <input
            className="input pl-9"
            placeholder="Rechercher par nom, destination ou lien…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Rechercher un QR code"
          />
        </div>
        <select
          className="input sm:w-56"
          value={typeFilter}
          onChange={(event) => setTypeFilter(event.target.value as 'all' | QrType)}
          aria-label="Filtrer par type"
        >
          <option value="all">Tous les types</option>
          {QR_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="px-6 py-16 text-center text-sm text-zinc-400">Chargement…</div>
        ) : qrcodes.length === 0 ? (
          <EmptyState
            icon="qr"
            title="Aucun QR code"
            description="Créez votre premier QR code dynamique : il fonctionnera immédiatement et restera modifiable."
            action={
              <Link to="/app/new" className="btn btn-primary">
                <Icon name="plus" size={16} />
                Créer un QR code
              </Link>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="search"
            title="Aucun résultat"
            description="Aucun QR code ne correspond à votre recherche. Essayez un autre mot-clé ou un autre type."
            action={
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setSearch('');
                  setTypeFilter('all');
                }}
              >
                Réinitialiser les filtres
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left">
              <thead>
                <tr className="border-b border-line text-[11px] font-medium tracking-wide text-zinc-400 uppercase">
                  <th className="px-5 py-3 font-medium">QR code</th>
                  <th className="px-5 py-3 font-medium">Destination</th>
                  <th className="px-5 py-3 font-medium">Scans</th>
                  <th className="px-5 py-3 font-medium">Créé le</th>
                  <th className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((qr) => (
                  <tr key={qr.id} className="border-b border-line/70 transition last:border-0 hover:bg-zinc-50/60">
                    <td className="px-5 py-3">
                      <Link to={`/app/qrcodes/${qr.id}`} className="flex items-center gap-3">
                        <span className="overflow-hidden rounded-md border border-line">
                          <QrImage value={shortUrl(qr.slug)} size={34} alt={`QR ${qr.name}`} />
                        </span>
                        <span className="min-w-0">
                          <span className="block max-w-[220px] truncate text-[13px] font-medium">
                            {qr.name}
                          </span>
                          <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-zinc-400">
                            <TypeIcon type={qr.type} size={11} />
                            {qrTypeMeta(qr.type).label}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td className="max-w-[240px] px-5 py-3">
                      <p className="truncate text-[13px] text-zinc-600">
                        {displayDestination(qr.destination)}
                      </p>
                      <p className="truncate text-[11px] text-zinc-400">/r/{qr.slug}</p>
                    </td>
                    <td className="tabular px-5 py-3 text-[13px] text-zinc-700">
                      {formatNumber(qr.totalScans)}
                    </td>
                    <td className="px-5 py-3 text-[13px] text-zinc-500">{formatDate(qr.createdAt)}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleCopy(qr)}
                          className="rounded-md p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-ink"
                          title="Copier le lien de redirection"
                          aria-label={`Copier le lien de ${qr.name}`}
                        >
                          <Icon name={copiedId === qr.id ? 'check' : 'copy'} size={15} />
                        </button>
                        <Link
                          to={`/app/qrcodes/${qr.id}`}
                          className="rounded-md p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-ink"
                          title="Voir les détails et statistiques"
                          aria-label={`Voir ${qr.name}`}
                        >
                          <Icon name="chart" size={15} />
                        </Link>
                        <button
                          type="button"
                          onClick={() => setTarget(qr)}
                          className="rounded-md p-1.5 text-zinc-400 transition hover:bg-red-50 hover:text-red-600"
                          title="Supprimer"
                          aria-label={`Supprimer ${qr.name}`}
                        >
                          <Icon name="trash" size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={Boolean(target)}
        onClose={() => (deleting ? undefined : setTarget(null))}
        title="Supprimer ce QR code ?"
        description={`« ${target?.name ?? ''} » et toutes ses statistiques (scans, historique) seront définitivement supprimés. Les supports déjà imprimés ne fonctionneront plus.`}
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setTarget(null)}
              disabled={deleting}
            >
              Annuler
            </button>
            <button type="button" className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Spinner /> : null}
              Supprimer définitivement
            </button>
          </>
        }
      />
    </div>
  );
}
