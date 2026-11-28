import { FirestoreClient, type DocumentWrite } from './firestore.ts';
import { getFirestoreTarget } from './credentials.ts';
import type { Env } from './env.ts';
import { parseUserAgent, type GeoInfo } from './request.ts';

export interface ScanContext {
  slug: string;
  ip: string;
  userAgent: string;
  referrer: string | null;
  geo: GeoInfo | null;
  now?: Date;
}

export type ScanOutcome =
  | { status: 'ok'; destination: string; qrName: string; kind: 'redirect' | 'text' }
  | { status: 'not-found' }
  | { status: 'inactive' };

interface QrDocument {
  ownerId?: unknown;
  destination?: unknown;
  name?: unknown;
  type?: unknown;
  active?: unknown;
  totalScans?: unknown;
  uniqueVisitors?: unknown;
}

/** UTC day key, e.g. 2026-11-26. Firestore-friendly and sortable. */
export function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function asNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

/** SHA-256 of IP + User-Agent + salt, via WebCrypto (no Node crypto in Workers). */
export async function visitorHash(
  ip: string,
  userAgent: string,
  salt: string,
  qrId: string,
): Promise<string> {
  const data = new TextEncoder().encode(`${salt}|${ip}|${userAgent}|${qrId}`);
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', data));
  return Array.from(digest)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 24);
}

let warnedAboutSalt = false;

function hashSalt(env: Env): string {
  const salt = env.SCAN_HASH_SALT;
  if (!salt || salt.length < 8) {
    // Stable fallback so unique visitor counting keeps working, but the salt
    // must be configured in production: without it the visitor hashes are
    // predictable from an IP + User-Agent.
    if (!warnedAboutSalt) {
      console.warn('[qr-studio] SCAN_HASH_SALT manquant ou trop court : utilisez un sel aléatoire long en production.');
      warnedAboutSalt = true;
    }
    return 'qr-studio-default-salt-change-me';
  }
  return salt;
}

/**
 * A destination is only followed when it is an absolute http(s) URL (or plain
 * text for the "text" type). Values written before this check existed, or by a
 * malicious client that bypassed the app form, can never become a
 * `javascript:` / `data:` redirect on the QR Studio domain.
 */
export function isSafeDestination(type: string | undefined, destination: string): boolean {
  if (type === 'text') return true;
  return /^https?:\/\/[^\s]+$/i.test(destination);
}

function resolveScan(
  qr: QrDocument | null,
  ownerId: string,
): { status: 'not-found' } | { status: 'inactive' } | { status: 'ok'; outcome: ScanOutcome } {
  if (!qr) return { status: 'not-found' };

  const qrOwner = asString(qr.ownerId);
  const destination = asString(qr.destination);
  if (!qrOwner || qrOwner !== ownerId) return { status: 'not-found' };
  if (qr.active === false || !destination) return { status: 'inactive' };

  const type = asString(qr.type);
  if (!isSafeDestination(type, destination)) return { status: 'inactive' };

  return {
    status: 'ok',
    outcome: {
      status: 'ok',
      destination,
      qrName: asString(qr.name) ?? '',
      kind: type === 'text' ? 'text' : 'redirect',
    },
  };
}

/**
 * Records one scan, then returns everything the redirect needs.
 *
 * A single Firestore transaction keeps the three counters consistent:
 *   - qrcodes/{id}.totalScans / uniqueVisitors / lastScanAt
 *   - qrcodes/{id}/days/{YYYY-MM-DD} (chart + "today" counter)
 *   - qrcodes/{id}/visitors/{hash} (unique visitor dedupe)
 * plus one immutable event in qrcodes/{id}/scans for the history table.
 *
 * Runs on Cloudflare Workers against the Firestore REST API: the REST
 * transaction has the same read-then-write atomicity as the Admin SDK one.
 */
export async function trackScan(ctx: ScanContext, env: Env): Promise<ScanOutcome> {
  const target = await getFirestoreTarget(env);
  const db = new FirestoreClient(target);

  const now = ctx.now ?? new Date();
  const slugDoc = await db.getDocument(`slugs/${ctx.slug}`);
  if (!slugDoc) return { status: 'not-found' };

  const qrId = asString(slugDoc.qrId);
  const ownerId = asString(slugDoc.ownerId);
  if (!qrId || !ownerId) return { status: 'not-found' };

  const qrPath = `qrcodes/${qrId}`;
  const day = dayKey(now);
  const dayPath = `${qrPath}/days/${day}`;
  const hash = await visitorHash(ctx.ip, ctx.userAgent, hashSalt(env), qrId);
  const visitorPath = `${qrPath}/visitors/${hash}`;
  const scanPath = `${qrPath}/scans/${cryptoRandomId()}`;
  const client = parseUserAgent(ctx.userAgent);

  let lastError: unknown = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const transaction = await db.beginTransaction();

      // All reads before any write (Firestore requirement).
      const [qrDoc, dayDoc, visitorDoc] = await Promise.all([
        db.getDocument(qrPath, transaction),
        db.getDocument(dayPath, transaction),
        db.getDocument(visitorPath, transaction),
      ]);

      const qr = qrDoc as QrDocument | null;
      const resolved = resolveScan(qr, ownerId);
      if (resolved.status !== 'ok') return resolved;
      if (!qr) return { status: 'not-found' };

      const isNewVisitor = visitorDoc === null;
      const dayCount = asNumber(dayDoc?.count);
      const dayVisitors = asNumber(dayDoc?.visitors);
      const visitorCount = asNumber(visitorDoc?.count);
      const firstSeen = asString(visitorDoc?.firstSeen);

      const writes: DocumentWrite[] = [
        {
          update: {
            name: db.documentName(qrPath),
            fields: {
              totalScans: { integerValue: String(asNumber(qr.totalScans) + 1) },
              uniqueVisitors: {
                integerValue: String(asNumber(qr.uniqueVisitors) + (isNewVisitor ? 1 : 0)),
              },
              lastScanAt: { timestampValue: now.toISOString() },
              updatedAt: { timestampValue: now.toISOString() },
            },
          },
          updateMask: { fieldPaths: ['totalScans', 'uniqueVisitors', 'lastScanAt', 'updatedAt'] },
        },
        {
          update: {
            name: db.documentName(dayPath),
            fields: {
              date: { stringValue: day },
              ownerId: { stringValue: ownerId },
              qrId: { stringValue: qrId },
              count: { integerValue: String(dayCount + 1) },
              visitors: { integerValue: String(dayVisitors + (isNewVisitor ? 1 : 0)) },
            },
          },
          updateMask: { fieldPaths: ['date', 'ownerId', 'qrId', 'count', 'visitors'] },
        },
        {
          update: {
            name: db.documentName(visitorPath),
            fields: {
              ownerId: { stringValue: ownerId },
              qrId: { stringValue: qrId },
              firstSeen: { timestampValue: firstSeen ?? now.toISOString() },
              lastSeen: { timestampValue: now.toISOString() },
              count: { integerValue: String(visitorCount + 1) },
            },
          },
          updateMask: { fieldPaths: ['ownerId', 'qrId', 'firstSeen', 'lastSeen', 'count'] },
        },
        {
          // New document: no update mask, so the write creates it outright.
          update: {
            name: db.documentName(scanPath),
            fields: {
              ownerId: { stringValue: ownerId },
              qrId: { stringValue: qrId },
              qrName: { stringValue: asString(qr.name) ?? '' },
              ts: { timestampValue: now.toISOString() },
              country: ctx.geo?.country ? { stringValue: ctx.geo.country } : { nullValue: null },
              city: ctx.geo?.city ? { stringValue: ctx.geo.city } : { nullValue: null },
              region: ctx.geo?.region ? { stringValue: ctx.geo.region } : { nullValue: null },
              device: { stringValue: client.device },
              os: { stringValue: client.os },
              browser: { stringValue: client.browser },
              referrer: ctx.referrer ? { stringValue: ctx.referrer } : { nullValue: null },
              // Raw IP addresses are never stored, only a salted hash for dedupe.
            },
          },
        },
      ];

      await db.commit(transaction, writes);
      return resolved.outcome;
    } catch (error) {
      lastError = error;
      const retryable =
        typeof error === 'object' && error !== null && 'isRetryable' in error
          ? Boolean((error as { isRetryable?: boolean }).isRetryable)
          : false;
      if (!retryable) break;
    }
  }

  // Contention or a transient Firestore error must not break the scan: fall
  // back to a direct read so the visitor still reaches the destination.
  console.error('[qr-studio] scan recording failed', lastError);
  const fallbackDoc = (await db.getDocument(qrPath)) as QrDocument | null;
  const fallback = resolveScan(fallbackDoc, ownerId);
  if (fallback.status !== 'ok') return fallback;
  return fallback.outcome;
}

/** Random document id (20 chars, same alphabet as Firestore auto-ids). */
function cryptoRandomId(): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  let id = '';
  for (const byte of bytes) id += alphabet[byte % alphabet.length];
  return id;
}
