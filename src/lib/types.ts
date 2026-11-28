import type { Timestamp } from 'firebase/firestore';
import type { QrDesign } from './qr';

export type QrType = 'url' | 'instagram' | 'facebook' | 'whatsapp' | 'youtube' | 'text';

export interface QrCode {
  id: string;
  ownerId: string;
  name: string;
  type: QrType;
  destination: string;
  slug: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
  totalScans: number;
  uniqueVisitors: number;
  lastScanAt: Timestamp | null;
  active: boolean;
  /** Optional: codes created before customisation existed have no design. */
  design?: QrDesign | null;
}

export interface ScanEvent {
  id: string;
  qrId: string;
  qrName: string;
  ts: Timestamp | null;
  country: string | null;
  city: string | null;
  region: string | null;
  device: string;
  os: string;
  browser: string;
  referrer: string | null;
}

export interface DayStat {
  id: string;
  date: string;
  qrId: string;
  ownerId: string;
  count: number;
  visitors: number;
}

export interface UserProfile {
  email: string;
  displayName: string;
  createdAt?: Timestamp | null;
}
