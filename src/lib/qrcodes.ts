import {
  collection,
  collectionGroup,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { getFirebase } from './firebase';
import type { DayStat, QrCode, QrType, ScanEvent } from './types';

const SLUG_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

export function generateSlug(length = 10): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let slug = '';
  for (const byte of bytes) slug += SLUG_ALPHABET[byte % SLUG_ALPHABET.length];
  return slug;
}

export function shortUrl(slug: string): string {
  return `${window.location.origin}/r/${slug}`;
}

export interface CreateQrInput {
  ownerId: string;
  name: string;
  type: QrType;
  destination: string;
}

/**
 * Creates the QR document and its public slug in one atomic transaction.
 * The slug is what gets encoded in the printed QR code: it never changes, so
 * editing the destination later keeps every printed code working.
 */
export async function createQrCode(input: CreateQrInput, preferredSlug?: string): Promise<string> {
  const { db } = getFirebase();
  const qrRef = doc(collection(db, 'qrcodes'));
  let lastError: unknown = null;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const slug = attempt === 0 && preferredSlug ? preferredSlug : generateSlug();
    const slugRef = doc(db, 'slugs', slug);
    try {
      await runTransaction(db, async (tx) => {
        tx.set(qrRef, {
          ownerId: input.ownerId,
          name: input.name.trim(),
          type: input.type,
          destination: input.destination,
          slug,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          totalScans: 0,
          uniqueVisitors: 0,
          lastScanAt: null,
          active: true,
        });
        tx.set(slugRef, {
          qrId: qrRef.id,
          ownerId: input.ownerId,
          createdAt: serverTimestamp(),
        });
      });
      return qrRef.id;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error('Impossible de générer un lien de redirection unique.');
}

export async function updateQrCode(
  id: string,
  patch: { name: string; destination: string; type: QrType },
): Promise<void> {
  const { db } = getFirebase();
  await updateDoc(doc(db, 'qrcodes', id), {
    name: patch.name.trim(),
    destination: patch.destination,
    type: patch.type,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Deletes a QR code with its whole analytics subtree. Client-side cascade is
 * required because Firestore never deletes subcollections automatically.
 */
export async function deleteQrCode(qr: Pick<QrCode, 'id' | 'slug' | 'ownerId'>): Promise<void> {
  const { db } = getFirebase();

  for (const sub of ['scans', 'days', 'visitors'] as const) {
    const snap = await getDocs(
      query(
        collection(db, 'qrcodes', qr.id, sub),
        where('ownerId', '==', qr.ownerId),
      ),
    );
    for (let i = 0; i < snap.docs.length; i += 400) {
      const batch = writeBatch(db);
      for (const item of snap.docs.slice(i, i + 400)) batch.delete(item.ref);
      await batch.commit();
    }
  }

  const batch = writeBatch(db);
  batch.delete(doc(db, 'qrcodes', qr.id));
  batch.delete(doc(db, 'slugs', qr.slug));
  await batch.commit();
}

// ---------------------------------------------------------------- listeners

export function subscribeQrCodes(
  ownerId: string,
  onData: (qrcodes: QrCode[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const { db } = getFirebase();
  const q = query(
    collection(db, 'qrcodes'),
    where('ownerId', '==', ownerId),
    orderBy('createdAt', 'desc'),
  );
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<QrCode, 'id'>) })));
    },
    (error) => onError(error),
  );
}

export function subscribeQrCode(
  qrId: string,
  onData: (qr: QrCode | null) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const { db } = getFirebase();
  return onSnapshot(
    doc(db, 'qrcodes', qrId),
    (snap) => {
      onData(snap.exists() ? ({ id: snap.id, ...(snap.data() as Omit<QrCode, 'id'>) }) : null);
    },
    (error) => onError(error),
  );
}

export function subscribeDays(
  ownerId: string,
  since: string,
  onData: (days: DayStat[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const { db } = getFirebase();
  const q = query(
    collectionGroup(db, 'days'),
    where('ownerId', '==', ownerId),
    where('date', '>=', since),
    orderBy('date', 'asc'),
    limit(1000),
  );
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<DayStat, 'id'>) })));
    },
    (error) => onError(error),
  );
}

export function subscribeScans(
  ownerId: string,
  onData: (scans: ScanEvent[]) => void,
  onError: (error: Error) => void,
  max = 25,
): Unsubscribe {
  const { db } = getFirebase();
  const q = query(
    collectionGroup(db, 'scans'),
    where('ownerId', '==', ownerId),
    orderBy('ts', 'desc'),
    limit(max),
  );
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<ScanEvent, 'id'>) })));
    },
    (error) => onError(error),
  );
}

export function subscribeQrDays(
  qrId: string,
  ownerId: string,
  since: string,
  onData: (days: DayStat[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const { db } = getFirebase();
  const q = query(
    collection(db, 'qrcodes', qrId, 'days'),
    where('ownerId', '==', ownerId),
    where('date', '>=', since),
    orderBy('date', 'asc'),
  );
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<DayStat, 'id'>) })));
    },
    (error) => onError(error),
  );
}

export function subscribeQrScans(
  qrId: string,
  ownerId: string,
  onData: (scans: ScanEvent[]) => void,
  onError: (error: Error) => void,
  max = 50,
): Unsubscribe {
  const { db } = getFirebase();
  const q = query(
    collection(db, 'qrcodes', qrId, 'scans'),
    where('ownerId', '==', ownerId),
    orderBy('ts', 'desc'),
    limit(max),
  );
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<ScanEvent, 'id'>) })));
    },
    (error) => onError(error),
  );
}
