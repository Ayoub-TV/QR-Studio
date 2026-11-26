import type { Timestamp } from 'firebase/firestore';

export function toDate(ts: Timestamp | null | undefined): Date | null {
  if (!ts) return null;
  try {
    return ts.toDate();
  } catch {
    return null;
  }
}

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const dateTimeFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const numberFormatter = new Intl.NumberFormat('fr-FR');

export function formatDate(ts: Timestamp | null | undefined): string {
  const date = toDate(ts);
  return date ? dateFormatter.format(date) : '—';
}

export function formatDateTime(ts: Timestamp | null | undefined): string {
  const date = toDate(ts);
  return date ? dateTimeFormatter.format(date) : '—';
}

export function formatNumber(value: number | null | undefined): string {
  return numberFormatter.format(value ?? 0);
}

export function relativeTime(ts: Timestamp | null | undefined): string {
  const date = toDate(ts);
  if (!date) return '—';
  const diff = Date.now() - date.getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 31) return `il y a ${days} j`;
  return dateFormatter.format(date);
}

/** Day key used by the scan function (UTC), e.g. "2026-11-26". */
export function dayKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function shiftDays(key: string, delta: number): string {
  const date = new Date(`${key}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + delta);
  return dayKey(date);
}

export function lastDays(count: number): string[] {
  const today = dayKey();
  const days: string[] = [];
  for (let i = count - 1; i >= 0; i -= 1) days.push(shiftDays(today, -i));
  return days;
}

export function formatDayLabel(key: string): string {
  const [, month, day] = key.split('-');
  return `${day}/${month}`;
}

export function formatDayLong(key: string): string {
  const date = new Date(`${key}T12:00:00.000Z`);
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }).format(date);
}
