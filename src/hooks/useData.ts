import { useEffect, useMemo, useState } from 'react';
import type { DayStat, QrCode, ScanEvent } from '../lib/types';
import {
  subscribeDays,
  subscribeQrCode,
  subscribeQrCodes,
  subscribeQrDays,
  subscribeQrScans,
  subscribeScans,
} from '../lib/qrcodes';
import { dayKey, lastDays, shiftDays } from '../lib/format';

export function useQrCodes(ownerId: string | undefined) {
  const [qrcodes, setQrcodes] = useState<QrCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ownerId) {
      setQrcodes([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = subscribeQrCodes(
      ownerId,
      (data) => {
        setQrcodes(data);
        setError(null);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );
    return unsubscribe;
  }, [ownerId]);

  return { qrcodes, loading, error };
}

/** Daily counters for the last `days` days (chart + today's total). */
export function useDailyStats(ownerId: string | undefined, days = 30) {
  const since = useMemo(() => shiftDays(dayKey(), -(days - 1)), [days]);
  const [stats, setStats] = useState<DayStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ownerId) {
      setStats([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = subscribeDays(
      ownerId,
      since,
      (data) => {
        setStats(data);
        setError(null);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );
    return unsubscribe;
  }, [ownerId, since]);

  return { stats, loading, error };
}

export function useRecentScans(ownerId: string | undefined, max = 25) {
  const [scans, setScans] = useState<ScanEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ownerId) {
      setScans([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = subscribeScans(
      ownerId,
      (data) => {
        setScans(data);
        setError(null);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
      max,
    );
    return unsubscribe;
  }, [ownerId, max]);

  return { scans, loading, error };
}

export function useQrDetail(qrId: string | undefined, ownerId: string | undefined, days = 30) {
  const since = useMemo(() => shiftDays(dayKey(), -(days - 1)), [days]);
  const [qr, setQr] = useState<QrCode | null>(null);
  const [days_, setDays] = useState<DayStat[]>([]);
  const [scans, setScans] = useState<ScanEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!qrId || !ownerId) return;
    setDays([]);
    setScans([]);
    setError(null);
    const unsubQr = subscribeQrCode(
      qrId,
      (data) => {
        setQr(data);
        if (!data) setError('Ce QR code est introuvable ou ne vous appartient pas.');
      },
      (err) => setError(err.message),
    );
    const unsubDays = subscribeQrDays(
      qrId,
      ownerId,
      since,
      setDays,
      (err) => setError(err.message),
    );
    const unsubScans = subscribeQrScans(qrId, ownerId, setScans, () => undefined);
    return () => {
      unsubQr();
      unsubDays();
      unsubScans();
    };
  }, [qrId, ownerId, since]);

  return { qr, dayStats: days_, scans, error };
}

/** Builds a zero-filled series so the chart has one point per day. */
export function useChartSeries(stats: DayStat[], days: number) {
  return useMemo(() => {
    const keys = lastDays(days);
    const byDate = new Map<string, number>();
    for (const stat of stats) {
      byDate.set(stat.date, (byDate.get(stat.date) ?? 0) + (stat.count ?? 0));
    }
    return keys.map((key) => ({ date: key, scans: byDate.get(key) ?? 0 }));
  }, [stats, days]);
}
