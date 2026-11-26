import { Link } from 'react-router-dom';
import type { ScanEvent } from '../lib/types';
import { formatDateTime, relativeTime } from '../lib/format';
import { Icon } from './Icons';

function location(scan: ScanEvent): string {
  const parts = [scan.city, scan.country].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : 'Inconnue';
}

export function ScanTable({
  scans,
  showQr = true,
}: {
  scans: ScanEvent[];
  showQr?: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse text-left">
        <thead>
          <tr className="border-b border-line text-[11px] font-medium tracking-wide text-zinc-400 uppercase">
            {showQr && <th className="px-5 py-3 font-medium">QR code</th>}
            <th className="px-5 py-3 font-medium">Date</th>
            <th className="px-5 py-3 font-medium">Appareil</th>
            <th className="px-5 py-3 font-medium">Localisation</th>
            <th className="px-5 py-3 font-medium">Source</th>
          </tr>
        </thead>
        <tbody>
          {scans.map((scan) => (
            <tr key={scan.id} className="border-b border-line/70 text-sm last:border-0">
              {showQr && (
                <td className="max-w-[220px] px-5 py-3">
                  <Link
                    to={`/app/qrcodes/${scan.qrId}`}
                    className="flex items-center gap-2 truncate font-medium text-ink hover:text-accent"
                  >
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-line bg-zinc-50 text-zinc-500">
                      <Icon name="qr" size={12} />
                    </span>
                    <span className="truncate">{scan.qrName || 'Sans nom'}</span>
                  </Link>
                </td>
              )}
              <td className="px-5 py-3">
                <p className="text-zinc-700">{relativeTime(scan.ts)}</p>
                <p className="text-xs text-zinc-400">{formatDateTime(scan.ts)}</p>
              </td>
              <td className="px-5 py-3">
                <p className="text-zinc-700">{scan.device || '—'}</p>
                <p className="text-xs text-zinc-400">
                  {[scan.browser, scan.os].filter(Boolean).join(' · ') || '—'}
                </p>
              </td>
              <td className="px-5 py-3 text-zinc-700">{location(scan)}</td>
              <td className="px-5 py-3 text-zinc-500">{scan.referrer || 'Direct'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
