import { useRef, useState } from 'react';
import { Icon } from './Icons';
import { QrImage } from './QrImage';
import {
  DEFAULT_DESIGN,
  fileToLogo,
  QR_COLOR_PRESETS,
  QR_DOT_STYLES,
  QR_EYE_STYLES,
  type QrDesign,
  type QrDotStyle,
  type QrEyeStyle,
} from '../lib/qr';

function DotPreview({ style, eyes, color }: { style: QrDotStyle; eyes: QrEyeStyle; color: string }) {
  const cells = [
    [0, 1, 0, 1, 0],
    [1, 0, 1, 0, 1],
    [0, 1, 0, 1, 0],
    [1, 0, 1, 0, 1],
    [0, 1, 0, 1, 0],
  ];
  return (
    <svg width={22} height={22} viewBox="0 0 5 5" aria-hidden="true">
      {cells.map((row, y) =>
        row.map((on, x) => {
          if (!on) return null;
          if (style === 'dots') return <circle key={`${x}-${y}`} cx={x + 0.5} cy={y + 0.5} r={0.42} fill={color} />;
          if (style === 'diamond')
            return (
              <path
                key={`${x}-${y}`}
                d={`M${x + 0.5} ${y + 0.05}L${x + 0.95} ${y + 0.5}L${x + 0.5} ${y + 0.95}L${x + 0.05} ${y + 0.5}Z`}
                fill={color}
              />
            );
          return (
            <rect
              key={`${x}-${y}`}
              x={x + 0.05}
              y={y + 0.05}
              width={0.9}
              height={0.9}
              rx={style === 'rounded' ? 0.28 : eyes === 'circle' ? 0.45 : 0}
              fill={color}
            />
          );
        }),
      )}
    </svg>
  );
}

function Choice({
  active,
  onClick,
  children,
  label,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={label}
      className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-2.5 text-[11px] transition ${
        active
          ? 'border-ink bg-zinc-50 shadow-[0_0_0_1px_rgba(10,10,11,0.8)]'
          : 'border-line bg-white text-zinc-500 hover:border-zinc-300 hover:bg-zinc-50/60'
      }`}
    >
      {children}
      <span className={active ? 'font-medium text-ink' : ''}>{label}</span>
    </button>
  );
}

/**
 * Design editor: colours, module shapes, eye shapes and a center logo, with a
 * live preview. The parent owns the value and decides when to persist it.
 */
export function QrDesigner({
  text,
  value,
  onChange,
  compact = false,
}: {
  text: string;
  value: QrDesign;
  onChange: (next: QrDesign) => void;
  compact?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [loadingLogo, setLoadingLogo] = useState(false);

  const update = (patch: Partial<QrDesign>) => onChange({ ...value, ...patch });

  const pickLogo = async (file: File | undefined) => {
    if (!file) return;
    setLogoError(null);
    setLoadingLogo(true);
    try {
      update({ logo: await fileToLogo(file) });
    } catch (error) {
      setLogoError((error as Error).message);
    } finally {
      setLoadingLogo(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const isDefault =
    value.fg === DEFAULT_DESIGN.fg &&
    value.bg === DEFAULT_DESIGN.bg &&
    value.dots === DEFAULT_DESIGN.dots &&
    value.eyes === DEFAULT_DESIGN.eyes &&
    !value.logo;

  return (
    <div className={compact ? 'space-y-5' : 'grid gap-6 lg:grid-cols-[300px_1fr] lg:items-start'}>
      <div className="flex flex-col items-center gap-3 rounded-xl border border-line bg-zinc-50/60 p-5">
        <QrImage value={text} design={value} size={compact ? 168 : 228} alt="Aperçu du design" className="shadow-sm" />
        <p className="text-[11px] text-zinc-400">Aperçu en direct</p>
      </div>

      <div className="space-y-5">
        <div>
          <span className="label">Couleurs</span>
          <div className="flex flex-wrap items-center gap-2">
            {QR_COLOR_PRESETS.map((preset) => {
              const active = preset.fg === value.fg && preset.bg === value.bg;
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => update({ fg: preset.fg, bg: preset.bg })}
                  aria-pressed={active}
                  title={preset.label}
                  className={`grid h-8 w-8 place-items-center rounded-full border transition ${
                    active ? 'border-ink ring-2 ring-ink/15' : 'border-line hover:border-zinc-300'
                  }`}
                  style={{ background: preset.bg }}
                >
                  <span className="h-4 w-4 rounded-full" style={{ background: preset.fg }} />
                </button>
              );
            })}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <label className="flex items-center gap-2 rounded-lg border border-line bg-white px-2.5 py-2">
              <input
                type="color"
                value={value.fg}
                onChange={(event) => update({ fg: event.target.value })}
                className="h-6 w-6 shrink-0 cursor-pointer rounded border border-line bg-transparent"
                aria-label="Couleur des modules"
              />
              <span className="min-w-0">
                <span className="block text-[11px] text-zinc-400">Modules</span>
                <span className="block font-mono text-[11px] text-zinc-600">{value.fg}</span>
              </span>
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-line bg-white px-2.5 py-2">
              <input
                type="color"
                value={value.bg}
                onChange={(event) => update({ bg: event.target.value })}
                className="h-6 w-6 shrink-0 cursor-pointer rounded border border-line bg-transparent"
                aria-label="Couleur du fond"
              />
              <span className="min-w-0">
                <span className="block text-[11px] text-zinc-400">Fond</span>
                <span className="block font-mono text-[11px] text-zinc-600">{value.bg}</span>
              </span>
            </label>
          </div>
        </div>

        <div>
          <span className="label">Forme des modules</span>
          <div className="grid grid-cols-4 gap-2">
            {QR_DOT_STYLES.map((item) => (
              <Choice
                key={item.value}
                active={value.dots === item.value}
                onClick={() => update({ dots: item.value })}
                label={item.label}
              >
                <DotPreview style={item.value} eyes={value.eyes} color={value.fg} />
              </Choice>
            ))}
          </div>
        </div>

        <div>
          <span className="label">Coins (yeux)</span>
          <div className="grid grid-cols-3 gap-2">
            {QR_EYE_STYLES.map((item) => (
              <Choice
                key={item.value}
                active={value.eyes === item.value}
                onClick={() => update({ eyes: item.value as QrEyeStyle })}
                label={item.label}
              >
                <svg width={20} height={20} viewBox="0 0 7 7" aria-hidden="true">
                  {item.value === 'circle' ? (
                    <>
                      <circle cx={3.5} cy={3.5} r={3.4} fill={value.fg} />
                      <circle cx={3.5} cy={3.5} r={2.3} fill={value.bg} />
                      <circle cx={3.5} cy={3.5} r={1.4} fill={value.fg} />
                    </>
                  ) : (
                    <>
                      <rect width={7} height={7} rx={item.value === 'rounded' ? 2 : 0} fill={value.fg} />
                      <rect
                        x={1}
                        y={1}
                        width={5}
                        height={5}
                        rx={item.value === 'rounded' ? 1.1 : 0}
                        fill={value.bg}
                      />
                      <rect
                        x={2}
                        y={2}
                        width={3}
                        height={3}
                        rx={item.value === 'rounded' ? 0.8 : 0}
                        fill={value.fg}
                      />
                    </>
                  )}
                </svg>
              </Choice>
            ))}
          </div>
        </div>

        <div>
          <span className="label">Logo au centre</span>
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="sr-only"
              onChange={(event) => void pickLogo(event.target.files?.[0])}
            />
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => fileRef.current?.click()}
              disabled={loadingLogo}
            >
              <Icon name="sparkle" size={14} />
              {value.logo ? 'Changer le logo' : 'Ajouter un logo'}
            </button>
            {value.logo && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => update({ logo: null })}
                disabled={loadingLogo}
              >
                <Icon name="trash" size={13} />
                Retirer
              </button>
            )}
          </div>

          {value.logo && (
            <div className="mt-3 flex items-center gap-3">
              <span className="text-[11px] text-zinc-400">Taille</span>
              <input
                type="range"
                min={12}
                max={30}
                step={1}
                value={Math.round(value.logoScale * 100)}
                onChange={(event) => update({ logoScale: Number(event.target.value) / 100 })}
                className="h-1.5 w-40 accent-ink"
                aria-label="Taille du logo"
              />
              <span className="tabular text-[11px] text-zinc-500">{Math.round(value.logoScale * 100)} %</span>
            </div>
          )}

          {logoError && <p className="field-error">{logoError}</p>}
          <p className="hint mt-2">
            Un logo réduit la lisibilité : la correction d’erreur passe automatiquement au niveau le
            plus élevé (H) et le logo reste sous 25 % de la largeur.
          </p>
        </div>

        {!isDefault && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange({ ...DEFAULT_DESIGN })}>
            <Icon name="check" size={13} />
            Revenir au design par défaut
          </button>
        )}
      </div>
    </div>
  );
}
