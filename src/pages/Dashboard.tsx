import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { useChartSeries, useDailyStats, useQrCodes, useRecentScans } from '../hooks/useData';
import { dayKey, formatNumber } from '../lib/format';
import { Alert, EmptyState, SectionTitle, StatCard } from '../components/ui';
import { Icon, TypeIcon } from '../components/Icons';
import { ScansChart } from '../components/ScansChart';
import { ScanTable } from '../components/ScanTable';

function firestoreErrorHint(message: string): { text: string; link?: string } {
  const match = message.match(/https:\/\/console\.firebase\.google\.com\/\S+/);
  if (match) {
    return {
      text: 'Firestore demande un index composite pour cette requête. Ouvrez la console pour le créer en un clic, puis rechargez la page.',
      link: match[0],
    };
  }
  if (/permission|insufficient/i.test(message)) {
    return { text: 'Accès refusé par les règles de sécurité Firestore. Vérifiez que firestore.rules est bien déployé.' };
  }
  return { text: message };
}

export default function Dashboard() {
  const { user, profile } = useAuth();
  const { qrcodes, loading: qrLoading, error: qrError } = useQrCodes(user?.uid);
  const { stats, error: statsError } = useDailyStats(user?.uid, 30);
  const { scans, loading: scansLoading, error: scansError } = useRecentScans(user?.uid, 10);
  const [range, setRange] = useState<14 | 30>(14);

  const series = useChartSeries(stats, range);
  const today = dayKey();

  const totals = useMemo(() => {
    const totalScans = qrcodes.reduce((sum, qr) => sum + (qr.totalScans ?? 0), 0);
    const uniqueVisitors = qrcodes.reduce((sum, qr) => sum + (qr.uniqueVisitors ?? 0), 0);
    const scansToday = stats
      .filter((stat) => stat.date === today)
      .reduce((sum, stat) => sum + (stat.count ?? 0), 0);
    return { totalScans, uniqueVisitors, scansToday };
  }, [qrcodes, stats, today]);

  const topQrCodes = useMemo(
    () => [...qrcodes].sort((a, b) => (b.totalScans ?? 0) - (a.totalScans ?? 0)).slice(0, 5),
    [qrcodes],
  );

  const error = qrError || statsError || scansError;
  const hint = error ? firestoreErrorHint(error) : null;
  const firstName = (profile?.displayName || '').split(' ')[0];

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] leading-tight font-semibold tracking-[-0.03em]">
            Tableau de bord
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {firstName ? `Bonjour ${firstName}, ` : ''}voici l’activité réelle de vos QR codes.
          </p>
        </div>
        <Link to="/app/new" className="btn btn-primary">
          <Icon name="plus" size={16} />
          Nouveau QR code
        </Link>
      </div>

      {hint && (
        <Alert variant="error" title="Impossible de charger certaines données">
          <p>{hint.text}</p>
          {hint.link && (
            <a
              href={hint.link}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-flex items-center gap-1 font-medium underline underline-offset-2"
            >
              Créer l’index <Icon name="external" size={12} />
            </a>
          )}
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="QR codes créés"
          value={formatNumber(qrcodes.length)}
          icon="qr"
          hint="Tous types confondus"
          loading={qrLoading}
        />
        <StatCard
          label="Scans au total"
          value={formatNumber(totals.totalScans)}
          icon="scan"
          hint="Depuis la création"
          loading={qrLoading}
        />
        <StatCard
          label="Scans aujourd’hui"
          value={formatNumber(totals.scansToday)}
          icon="calendar"
          hint="Journée UTC"
          loading={qrLoading}
        />
        <StatCard
          label="Visiteurs uniques estimés"
          value={formatNumber(totals.uniqueVisitors)}
          icon="users"
          hint="IP + appareil hachés"
          loading={qrLoading}
        />
      </div>

      {!qrLoading && qrcodes.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="qr"
            title="Votre premier QR code dynamique"
            description="Créez un QR code, imprimez-le, puis modifiez sa destination autant de fois que nécessaire. Chaque scan sera enregistré ici."
            action={
              <Link to="/app/new" className="btn btn-primary">
                <Icon name="plus" size={16} />
                Créer un QR code
              </Link>
            }
          />
        </div>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
            <div className="card p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-[15px] font-semibold tracking-[-0.01em]">Scans par jour</h2>
                  <p className="mt-0.5 text-[13px] text-zinc-500">
                    Tous vos QR codes, données enregistrées par la fonction de redirection.
                  </p>
                </div>
                <div className="flex rounded-lg border border-line p-0.5">
                  {([14, 30] as const).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setRange(value)}
                      className={`rounded-[7px] px-2.5 py-1 text-xs font-medium transition ${
                        range === value
                          ? 'bg-ink text-white'
                          : 'text-zinc-500 hover:bg-zinc-50 hover:text-ink'
                      }`}
                    >
                      {value} jours
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-4">
                <ScansChart data={series} />
              </div>
            </div>

            <div className="card flex flex-col p-5 sm:p-6">
              <SectionTitle
                title="QR codes les plus scannés"
                action={
                  <Link to="/app/qrcodes" className="text-xs font-medium text-zinc-500 hover:text-ink">
                    Tout voir
                  </Link>
                }
              />
              {topQrCodes.length === 0 ? (
                <p className="mt-6 text-sm text-zinc-400">Aucun QR code pour le moment.</p>
              ) : (
                <ul className="mt-4 divide-y divide-line/70">
                  {topQrCodes.map((qr) => {
                    const max = Math.max(...topQrCodes.map((item) => item.totalScans ?? 0), 1);
                    const ratio = Math.round(((qr.totalScans ?? 0) / max) * 100);
                    return (
                      <li key={qr.id} className="py-3 first:pt-1">
                        <Link to={`/app/qrcodes/${qr.id}`} className="group block">
                          <div className="flex items-center gap-2.5">
                            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-line bg-zinc-50 text-zinc-500">
                              <TypeIcon type={qr.type} size={13} />
                            </span>
                            <span className="min-w-0 flex-1 truncate text-[13px] font-medium group-hover:text-accent">
                              {qr.name}
                            </span>
                            <span className="tabular text-[13px] text-zinc-500">
                              {formatNumber(qr.totalScans)}
                            </span>
                          </div>
                          <div className="mt-2 ml-9.5 h-1 overflow-hidden rounded-full bg-zinc-100">
                            <div
                              className="h-full rounded-full bg-ink/80 transition-all"
                              style={{ width: `${Math.max(ratio, 2)}%` }}
                            />
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
              <div className="mt-auto pt-4">
                <p className="hint flex items-start gap-1.5">
                  <Icon name="chart" size={12} className="mt-0.5 shrink-0" />
                  Classement calculé sur les scans réellement enregistrés.
                </p>
              </div>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="flex flex-wrap items-end justify-between gap-3 px-5 py-4 sm:px-6">
              <div>
                <h2 className="text-[15px] font-semibold tracking-[-0.01em]">Derniers scans</h2>
                <p className="mt-0.5 text-[13px] text-zinc-500">
                  Les 10 derniers scans enregistrés, tous QR codes confondus.
                </p>
              </div>
              <Link to="/app/qrcodes" className="text-xs font-medium text-zinc-500 hover:text-ink">
                Gérer mes QR codes
              </Link>
            </div>
            <div className="border-t border-line">
              {scansLoading ? (
                <div className="px-6 py-10 text-center text-sm text-zinc-400">Chargement…</div>
              ) : scans.length === 0 ? (
                <EmptyState
                  icon="scan"
                  title="Aucun scan enregistré"
                  description="Dès qu’un QR code est scanné, le scan apparaît ici avec son appareil, sa localisation et sa date."
                />
              ) : (
                <ScanTable scans={scans} />
              )}
            </div>
          </div>

          <p className="text-center text-xs text-zinc-400">
            Statistiques issues de Firestore, mises à jour en temps réel à chaque scan.
          </p>
        </>
      )}
    </div>
  );
}
