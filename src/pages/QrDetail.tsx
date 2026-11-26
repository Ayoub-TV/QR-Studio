import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { useChartSeries, useQrDetail } from '../hooks/useData';
import { formatDate, formatDateTime, formatNumber, relativeTime } from '../lib/format';
import { buildDestination, displayDestination, qrTypeMeta, validateDestination, validateName } from '../lib/destinations';
import { updateQrCode, deleteQrCode, shortUrl } from '../lib/qrcodes';
import { downloadQrPng, downloadQrSvg } from '../lib/qr';
import { copyText } from '../lib/clipboard';
import { Alert, EmptyState, Modal, PageLoader, Spinner } from '../components/ui';
import { Icon, TypeIcon } from '../components/Icons';
import { QrImage } from '../components/QrImage';
import { ScansChart } from '../components/ScansChart';
import { ScanTable } from '../components/ScanTable';

export default function QrDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { qr, dayStats, scans, error } = useQrDetail(id, user?.uid, 30);
  const series = useChartSeries(dayStats, 30);

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const [errors, setErrors] = useState<{ name?: string; destination?: string }>({});
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ variant: 'success' | 'error'; text: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [downloading, setDownloading] = useState<'png' | 'svg' | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (qr && user && qr.ownerId !== user.uid) {
      navigate('/app/qrcodes', { replace: true });
    }
  }, [qr, user, navigate]);

  const startEdit = () => {
    if (!qr) return;
    setName(qr.name);
    setValue(qr.destination);
    setErrors({});
    setEditing(true);
    setNotice(null);
  };

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    if (!qr) return;
    const nameError = validateName(name);
    const destinationError = validateDestination(qr.type, value);
    setErrors({ name: nameError ?? undefined, destination: destinationError ?? undefined });
    if (nameError || destinationError) return;

    setSaving(true);
    try {
      await updateQrCode(qr.id, {
        name,
        destination: buildDestination(qr.type, value),
        type: qr.type,
      });
      setEditing(false);
      setNotice({
        variant: 'success',
        text: 'Destination mise à jour. Le QR code déjà imprimé reste valable et pointe désormais ici.',
      });
    } catch (err) {
      setNotice({ variant: 'error', text: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!qr) return;
    setDeleting(true);
    try {
      await deleteQrCode({ id: qr.id, slug: qr.slug, ownerId: qr.ownerId });
      navigate('/app/qrcodes', { replace: true });
    } catch (err) {
      setNotice({ variant: 'error', text: (err as Error).message });
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const handleDownload = async (format: 'png' | 'svg') => {
    if (!qr) return;
    setDownloading(format);
    try {
      const url = shortUrl(qr.slug);
      if (format === 'png') await downloadQrPng(url, qr.name);
      else await downloadQrSvg(url, qr.name);
    } catch (err) {
      setNotice({ variant: 'error', text: `Téléchargement impossible : ${(err as Error).message}` });
    } finally {
      setDownloading(null);
    }
  };

  const handleCopy = async () => {
    if (!qr) return;
    const ok = await copyText(shortUrl(qr.slug));
    if (!ok) {
      setNotice({ variant: 'error', text: 'Impossible de copier le lien sur ce navigateur.' });
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  if (!qr && !error) return <PageLoader label="Chargement du QR code…" />;

  if (!qr) {
    return (
      <div className="space-y-4">
        <Alert variant="error" title="QR code introuvable">
          {error ?? "Ce QR code n'existe pas ou ne vous appartient pas."}
        </Alert>
        <Link to="/app/qrcodes" className="btn btn-secondary">
          Retour à mes QR codes
        </Link>
      </div>
    );
  }

  const meta = qrTypeMeta(qr.type);
  const url = shortUrl(qr.slug);

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/app/qrcodes"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 transition hover:text-ink"
        >
          <Icon name="arrowRight" size={13} className="rotate-180" />
          Retour aux QR codes
        </Link>

        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="truncate text-[26px] leading-tight font-semibold tracking-[-0.03em]">
              {qr.name}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-zinc-500">
              <span className="inline-flex items-center gap-1.5">
                <TypeIcon type={qr.type} size={13} />
                {meta.label}
              </span>
              <span className="text-zinc-300">·</span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {qr.active === false ? 'Désactivé' : 'Actif'}
              </span>
              <span className="text-zinc-300">·</span>
              <span>Créé le {formatDate(qr.createdAt)}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-secondary" onClick={startEdit}>
              <Icon name="pencil" size={15} />
              Modifier
            </button>
            <a href={url} target="_blank" rel="noreferrer" className="btn btn-secondary">
              <Icon name="external" size={15} />
              Tester le lien
            </a>
            <button type="button" className="btn btn-danger" onClick={() => setConfirmDelete(true)}>
              <Icon name="trash" size={15} />
              Supprimer
            </button>
          </div>
        </div>
      </div>

      {notice && (
        <Alert variant={notice.variant} onClose={() => setNotice(null)}>
          {notice.text}
        </Alert>
      )}
      {error && !notice && <Alert variant="error">{error}</Alert>}

      <div className="grid gap-4 lg:grid-cols-[320px_1fr] lg:items-start">
        <div className="card p-5">
          <div className="flex justify-center rounded-xl border border-line bg-zinc-50/60 p-5">
            <QrImage value={url} size={230} alt={`QR code ${qr.name}`} className="shadow-sm" />
          </div>

          <div className="mt-4">
            <p className="text-[11px] font-medium tracking-wide text-zinc-400 uppercase">
              Lien de redirection
            </p>
            <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-line bg-white px-2.5 py-2">
              <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-zinc-600">{url}</span>
              <button
                type="button"
                onClick={handleCopy}
                className="shrink-0 rounded-md p-1 text-zinc-400 transition hover:bg-zinc-100 hover:text-ink"
                aria-label="Copier le lien"
                title="Copier le lien"
              >
                <Icon name={copied ? 'check' : 'copy'} size={14} />
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handleDownload('png')}
              disabled={downloading !== null}
            >
              {downloading === 'png' ? <Spinner /> : <Icon name="download" size={14} />}
              PNG
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handleDownload('svg')}
              disabled={downloading !== null}
            >
              {downloading === 'svg' ? <Spinner /> : <Icon name="download" size={14} />}
              SVG
            </button>
          </div>
          <p className="hint mt-3 text-center">PNG 2048 px · SVG vectoriel</p>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="card p-4">
              <p className="text-[12px] font-medium text-zinc-500">Scans totaux</p>
              <p className="tabular mt-2 text-[24px] leading-none font-semibold tracking-[-0.03em]">
                {formatNumber(qr.totalScans)}
              </p>
            </div>
            <div className="card p-4">
              <p className="text-[12px] font-medium text-zinc-500">Visiteurs uniques</p>
              <p className="tabular mt-2 text-[24px] leading-none font-semibold tracking-[-0.03em]">
                {formatNumber(qr.uniqueVisitors)}
              </p>
            </div>
            <div className="card p-4">
              <p className="text-[12px] font-medium text-zinc-500">Dernier scan</p>
              <p className="mt-2 text-[15px] font-medium">{relativeTime(qr.lastScanAt)}</p>
              <p className="mt-0.5 text-[11px] text-zinc-400">{formatDateTime(qr.lastScanAt)}</p>
            </div>
            <div className="card p-4">
              <p className="text-[12px] font-medium text-zinc-500">Scans ces 30 jours</p>
              <p className="tabular mt-2 text-[24px] leading-none font-semibold tracking-[-0.03em]">
                {formatNumber(dayStats.reduce((sum, day) => sum + (day.count ?? 0), 0))}
              </p>
            </div>
          </div>

          <div className="card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-[15px] font-semibold tracking-[-0.01em]">Destination</h2>
                <p className="mt-0.5 text-[13px] text-zinc-500">
                  Modifier cette adresse ne change pas le QR code imprimé.
                </p>
              </div>
              {!editing && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={startEdit}>
                  <Icon name="pencil" size={13} />
                  Modifier
                </button>
              )}
            </div>

            {editing ? (
              <form onSubmit={handleSave} className="mt-4 space-y-4" noValidate>
                <div>
                  <label className="label" htmlFor="edit-name">
                    Nom
                  </label>
                  <input
                    id="edit-name"
                    className="input"
                    value={name}
                    maxLength={120}
                    onChange={(event) => setName(event.target.value)}
                  />
                  {errors.name && <p className="field-error">{errors.name}</p>}
                </div>

                <div>
                  <label className="label" htmlFor="edit-destination">
                    {meta.fieldLabel}
                  </label>
                  {meta.input === 'text' ? (
                    <textarea
                      id="edit-destination"
                      className="input min-h-[100px]"
                      value={value}
                      onChange={(event) => setValue(event.target.value)}
                    />
                  ) : (
                    <input
                      id="edit-destination"
                      className="input"
                      value={value}
                      onChange={(event) => setValue(event.target.value)}
                    />
                  )}
                  {errors.destination ? (
                    <p className="field-error">{errors.destination}</p>
                  ) : (
                    <p className="hint mt-1.5">
                      Sera enregistré comme : {value.trim() ? buildDestination(qr.type, value) : '—'}
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
                    {saving ? <Spinner /> : <Icon name="check" size={14} />}
                    Enregistrer
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setEditing(false)}
                    disabled={saving}
                  >
                    Annuler
                  </button>
                </div>
              </form>
            ) : (
              <div className="mt-3 rounded-lg border border-line bg-zinc-50/60 px-3 py-3">
                <p className="text-[11px] font-medium tracking-wide text-zinc-400 uppercase">
                  Actuelle
                </p>
                <p className="mt-1 text-sm break-all text-zinc-700">{displayDestination(qr.destination)}</p>
                {meta.input !== 'text' && (
                  <a
                    href={qr.destination}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-ink"
                  >
                    Ouvrir la destination <Icon name="external" size={11} />
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-[15px] font-semibold tracking-[-0.01em]">Scans par jour</h2>
            <p className="mt-0.5 text-[13px] text-zinc-500">30 derniers jours, pour ce QR code.</p>
          </div>
          <p className="tabular text-sm text-zinc-500">
            {formatNumber(dayStats.reduce((sum, day) => sum + (day.count ?? 0), 0))} scans
          </p>
        </div>
        <div className="mt-4">
          <ScansChart data={series} height={220} />
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-[15px] font-semibold tracking-[-0.01em]">Historique des scans</h2>
            <p className="mt-0.5 text-[13px] text-zinc-500">Les 50 scans les plus récents.</p>
          </div>
        </div>
        <div className="border-t border-line">
          {scans.length === 0 ? (
            <EmptyState
              icon="scan"
              title="Aucun scan pour l’instant"
              description="Scannez ce QR code avec un téléphone : le scan apparaîtra ici en quelques secondes."
            />
          ) : (
            <ScanTable scans={scans} showQr={false} />
          )}
        </div>
      </div>

      <Modal
        open={confirmDelete}
        onClose={() => (deleting ? undefined : setConfirmDelete(false))}
        title="Supprimer ce QR code ?"
        description={`« ${qr.name} » et ses ${formatNumber(qr.totalScans)} scans enregistrés seront définitivement supprimés. Le lien ${url} cessera de fonctionner.`}
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setConfirmDelete(false)}
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
