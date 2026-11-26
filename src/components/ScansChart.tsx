import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatDayLabel, formatDayLong } from '../lib/format';

interface Point {
  date: string;
  scans: number;
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value?: number | string }>;
  label?: string | number;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const value = Number(payload[0]?.value ?? 0);
  return (
    <div className="rounded-lg border border-line bg-white px-3 py-2 shadow-lg">
      <p className="text-[11px] text-zinc-400">{formatDayLong(String(label))}</p>
      <p className="tabular mt-0.5 text-sm font-medium">
        {value} scan{value > 1 ? 's' : ''}
      </p>
    </div>
  );
}

export function ScansChart({ data, height = 250 }: { data: Point[]; height?: number }) {
  const total = data.reduce((sum, point) => sum + point.scans, 0);

  return (
    <div className="relative w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 6, left: -22, bottom: 0 }}>
          <defs>
            <linearGradient id="qrScansFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.16} />
              <stop offset="100%" stopColor="#4f46e5" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#eeeef1" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDayLabel}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: '#a1a1aa' }}
            minTickGap={28}
          />
          <YAxis
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            width={46}
            tick={{ fontSize: 11, fill: '#a1a1aa' }}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#d4d4d8', strokeWidth: 1 }} />
          <Area
            type="monotone"
            dataKey="scans"
            stroke="#4f46e5"
            strokeWidth={2}
            fill="url(#qrScansFill)"
            activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }}
          />
        </AreaChart>
      </ResponsiveContainer>
      {total === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <p className="rounded-full border border-line bg-white px-3 py-1 text-xs text-zinc-500">
            Aucun scan sur cette période
          </p>
        </div>
      )}
    </div>
  );
}
