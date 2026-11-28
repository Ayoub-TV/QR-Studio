import { useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { Alert, Spinner } from '../components/ui';
import { Icon, TypeIcon } from '../components/Icons';
import { QrImage } from '../components/QrImage';
import { QrDesigner } from '../components/QrDesigner';
import {
  buildDestination,
  QR_TYPES,
  qrTypeMeta,
  validateDestination,
  validateName,
} from '../lib/destinations';
import { createQrCode, generateSlug, shortUrl } from '../lib/qrcodes';
import { DEFAULT_DESIGN, type QrDesign } from '../lib/qr';
import type { QrType } from '../lib/types';

export default function QrNew() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [type, setType] = useState<QrType>('url');
  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const [design, setDesign] = useState<QrDesign>(DEFAULT_DESIGN);
  const [errors, setErrors] = useState<{ name?: string; destination?: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const suggestedSlug = useMemo(() => generateSlug(), []);
  const meta = qrTypeMeta(type);
  const previewDestination = value.trim() ? buildDestination(type, value) : '';

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!user) return;

    const nameError = validateName(name);
    const destinationError = validateDestination(type, value);
    setErrors({
      name: nameError ?? undefined,
      destination: destinationError ?? undefined,
    });
    if (nameError || destinationError) return;

    setSubmitting(true);
    setError(null);
    try {
      const id = await createQrCode(
        {
          ownerId: user.uid,
          name,
          type,
          destination: buildDestination(type, value),
          design,
        },
        suggestedSlug,
      );
      navigate(`/app/qrcodes/${id}`, { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

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
        <h1 className="mt-3 text-[26px] leading-tight font-semibold tracking-[-0.03em]">
          Nouveau QR code
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Le QR code pointe vers un lien QR Studio unique. Vous pourrez modifier sa destination à
          tout moment.
        </p>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr] lg:items-start">
        <form onSubmit={onSubmit} className="card p-5 sm:p-6" noValidate>
          <div>
            <label className="label" htmlFor="qr-name">
              Nom du QR code
            </label>
            <input
              id="qr-name"
              className="input"
              placeholder="Affiche vitrine — campagne de Noël"
              maxLength={120}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            {errors.name ? (
              <p className="field-error">{errors.name}</p>
            ) : (
              <p className="hint mt-1.5">Un nom interne pour retrouver votre QR code.</p>
            )}
          </div>

          <div className="mt-6">
            <span className="label">Type de QR code</span>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {QR_TYPES.map((item) => {
                const active = item.value === type;
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => {
                      setType(item.value);
                      setValue('');
                      setErrors((current) => ({ ...current, destination: undefined }));
                    }}
                    aria-pressed={active}
                    className={`flex flex-col items-start gap-2 rounded-xl border p-3 text-left transition ${
                      active
                        ? 'border-ink bg-zinc-50 shadow-[0_0_0_1px_rgba(10,10,11,0.8)]'
                        : 'border-line bg-white hover:border-zinc-300 hover:bg-zinc-50/60'
                    }`}
                  >
                    <span
                      className={`grid h-7 w-7 place-items-center rounded-md border ${
                        active ? 'border-ink/15 bg-white text-ink' : 'border-line bg-white text-zinc-500'
                      }`}
                    >
                      <TypeIcon type={item.value} size={14} />
                    </span>
                    <span>
                      <span className="block text-[13px] font-medium">{item.label}</span>
                      <span className="mt-0.5 block text-[11px] leading-snug text-zinc-400">
                        {item.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-6">
            <label className="label" htmlFor="qr-destination">
              {meta.fieldLabel}
            </label>
            {meta.input === 'text' ? (
              <textarea
                id="qr-destination"
                className="input min-h-[110px]"
                placeholder={meta.placeholder}
                maxLength={1000}
                value={value}
                onChange={(event) => setValue(event.target.value)}
              />
            ) : (
              <input
                id="qr-destination"
                className="input"
                placeholder={meta.placeholder}
                value={value}
                onChange={(event) => setValue(event.target.value)}
              />
            )}
            {errors.destination ? (
              <p className="field-error">{errors.destination}</p>
            ) : (
              <p className="hint mt-1.5">{meta.hint}</p>
            )}
          </div>

          {previewDestination && previewDestination !== value && (
            <div className="mt-4 rounded-lg border border-line bg-zinc-50 px-3 py-2.5">
              <p className="text-[11px] font-medium tracking-wide text-zinc-400 uppercase">
                Destination enregistrée
              </p>
              <p className="mt-1 truncate text-[13px] text-zinc-700">{previewDestination}</p>
            </div>
          )}

          <div className="mt-6">
            <span className="label">Personnaliser le design du QR code</span>
            <p className="hint mt-1.5 mb-3">
              Couleurs, forme des modules, coins et logo. Le lien imprimé ne change jamais.
            </p>
            <QrDesigner text={shortUrl(suggestedSlug)} value={design} onChange={setDesign} compact />
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? <Spinner /> : <Icon name="qr" size={16} />}
              Créer le QR code
            </button>
            <Link to="/app/qrcodes" className="btn btn-ghost">
              Annuler
            </Link>
          </div>
        </form>

        <div className="lg:sticky lg:top-8">
          <div className="card overflow-hidden">
            <div className="border-b border-line px-5 py-3">
              <p className="text-[13px] font-medium">Aperçu</p>
            </div>
            <div className="flex flex-col items-center px-5 py-7">
              <QrImage value={shortUrl(suggestedSlug)} size={208} alt="Aperçu du QR code" design={design} />
              <p className="mt-5 max-w-full truncate rounded-md border border-line bg-zinc-50 px-2.5 py-1 font-mono text-[11px] text-zinc-500">
                {shortUrl(suggestedSlug)}
              </p>
              <p className="mt-4 text-center text-sm font-medium">{name.trim() || 'Sans titre'}</p>
              <p className="mt-1 line-clamp-2 max-w-full text-center text-xs break-words text-zinc-500">
                {previewDestination || 'La destination apparaîtra ici'}
              </p>
            </div>
            <div className="border-t border-line bg-zinc-50/60 px-5 py-3">
              <p className="hint flex items-start gap-2">
                <Icon name="shield" size={13} className="mt-0.5 shrink-0" />
                Ce lien unique ne change jamais : vous pourrez modifier la destination après
                impression.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
