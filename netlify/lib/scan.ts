import { createHash } from 'node:crypto';
import { Timestamp } from 'firebase-admin/firestore';
import { getDb } from './admin.ts';
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

/** UTC day key, e.g. 2026-11-26. Firestore-friendly and sortable. */
export function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function visitorHash(ip: string, userAgent: string, salt: string, qrId: string): string {
  return createHash('sha256')
    .update(`${salt}|${ip}|${userAgent}|${qrId}`)
    .digest('hex')
    .slice(0, 24);
}

let warnedAboutSalt = false;

function hashSalt(): string {
  const salt = process.env.SCAN_HASH_SALT;
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

/**
 * Records one scan, then returns everything the redirect needs.
 *
 * A single Firestore transaction keeps the three counters consistent:
 *   - qrcodes/{id}.totalScans / uniqueVisitors / lastScanAt
 *   - qrcodes/{id}/days/{YYYY-MM-DD} (chart + "today" counter)
 *   - qrcodes/{id}/visitors/{hash} (unique visitor dedupe)
 * plus one immutable event in qrcodes/{id}/scans for the history table.
 */
export async function trackScan(ctx: ScanContext): Promise<ScanOutcome> {
  const db = getDb();
  const now = ctx.now ?? new Date();

  const slugSnap = await db.collection('slugs').doc(ctx.slug).get();
  if (!slugSnap.exists) return { status: 'not-found' };

  const slugData = slugSnap.data() as { qrId?: string; ownerId?: string };
  if (!slugData.qrId || !slugData.ownerId) return { status: 'not-found' };

  const qrRef = db.collection('qrcodes').doc(slugData.qrId);
  const day = dayKey(now);
  const dayRef = qrRef.collection('days').doc(day);
  const visitorRef = qrRef
    .collection('visitors')
    .doc(visitorHash(ctx.ip, ctx.userAgent, hashSalt(), qrRef.id));
  const scanRef = qrRef.collection('scans').doc();
  const client = parseUserAgent(ctx.userAgent);

  try {
    return await db.runTransaction(async (tx) => {
      // All reads first (Firestore requirement).
      const [qrSnap, daySnap, visitorSnap] = await Promise.all([
        tx.get(qrRef),
        tx.get(dayRef),
        tx.get(visitorRef),
      ]);

      if (!qrSnap.exists) return { status: 'not-found' } as ScanOutcome;

      const qr = qrSnap.data() as {
        ownerId?: string;
        destination?: string;
        name?: string;
        type?: string;
        active?: boolean;
        totalScans?: number;
        uniqueVisitors?: number;
      };

      if (!qr.ownerId || qr.ownerId !== slugData.ownerId) return { status: 'not-found' } as ScanOutcome;
      if (qr.active === false || !qr.destination) return { status: 'inactive' } as ScanOutcome;
      if (!isSafeDestination(qr.type, qr.destination)) {
        console.error('[qr-studio] destination non autorisée', qrRef.path);
        return { status: 'inactive' } as ScanOutcome;
      }

      const dayData = daySnap.data() as { count?: number; visitors?: number } | undefined;
      const visitorData = visitorSnap.data() as { count?: number; firstSeen?: Timestamp } | undefined;
      const isNewVisitor = !visitorSnap.exists;

      tx.set(
        qrRef,
        {
          totalScans: (qr.totalScans ?? 0) + 1,
          uniqueVisitors: (qr.uniqueVisitors ?? 0) + (isNewVisitor ? 1 : 0),
          lastScanAt: Timestamp.fromDate(now),
          updatedAt: Timestamp.fromDate(now),
        },
        { merge: true },
      );

      tx.set(
        dayRef,
        {
          date: day,
          ownerId: qr.ownerId,
          qrId: qrRef.id,
          count: (dayData?.count ?? 0) + 1,
          visitors: (dayData?.visitors ?? 0) + (isNewVisitor ? 1 : 0),
        },
        { merge: true },
      );

      tx.set(
        visitorRef,
        {
          ownerId: qr.ownerId,
          qrId: qrRef.id,
          firstSeen: visitorData?.firstSeen ?? Timestamp.fromDate(now),
          lastSeen: Timestamp.fromDate(now),
          count: (visitorData?.count ?? 0) + 1,
        },
        { merge: true },
      );

      tx.set(scanRef, {
        ownerId: qr.ownerId,
        qrId: qrRef.id,
        qrName: qr.name ?? '',
        ts: Timestamp.fromDate(now),
        country: ctx.geo?.country ?? null,
        city: ctx.geo?.city ?? null,
        region: ctx.geo?.region ?? null,
        device: client.device,
        os: client.os,
        browser: client.browser,
        referrer: ctx.referrer,
        // Raw IP addresses are never stored, only a salted hash for dedupe.
      });

      return {
        status: 'ok',
        destination: qr.destination,
        qrName: qr.name ?? '',
        kind: qr.type === 'text' ? 'text' : 'redirect',
      } as ScanOutcome;
    });
  } catch (error) {
    // Contention or a transient Firestore error must not break the scan: fall
    // back to a direct read so the visitor still reaches the destination.
    console.error('[qr-studio] scan recording failed', error);
    const fallback = await qrRef.get();
    if (!fallback.exists) return { status: 'not-found' };
    const qr = fallback.data() as { active?: boolean; destination?: string; name?: string; type?: string };
    if (qr.active === false || !qr.destination) return { status: 'inactive' };
    if (!isSafeDestination(qr.type, qr.destination)) return { status: 'inactive' };
    return {
      status: 'ok',
      destination: qr.destination,
      qrName: qr.name ?? '',
      kind: qr.type === 'text' ? 'text' : 'redirect',
    };
  }
}
