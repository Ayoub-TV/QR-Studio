import type { FirestoreTarget } from './credentials.ts';

/**
 * Minimal Firestore REST client.
 *
 * Implements exactly what QR Studio needs: transactional document reads,
 * `commit` with field masks (merge semantics) and explicit write ordering.
 * Values are converted to/from the Firestore JSON representation.
 */

export type FirestoreValue = {
  nullValue?: null;
  stringValue?: string;
  integerValue?: string;
  doubleValue?: number;
  booleanValue?: boolean;
  timestampValue?: string;
  mapValue?: { fields?: Record<string, FirestoreValue> };
  arrayValue?: { values?: FirestoreValue[] };
};

export type FirestoreDocument = Record<string, unknown>;

export interface DocumentWrite {
  update: { name: string; fields: Record<string, FirestoreValue> };
  updateMask?: { fieldPaths: string[] };
}

const DOCUMENTS_PATH = 'databases/(default)/documents';

function decodeValue(value: FirestoreValue | undefined): unknown {
  if (!value) return undefined;
  if ('nullValue' in value) return null;
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return value.doubleValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('timestampValue' in value) return value.timestampValue;
  if ('mapValue' in value) return decodeFields(value.mapValue?.fields);
  if ('arrayValue' in value) return (value.arrayValue?.values ?? []).map(decodeValue);
  return undefined;
}

export function decodeFields(fields?: Record<string, FirestoreValue>): FirestoreDocument {
  const document: FirestoreDocument = {};
  for (const [key, value] of Object.entries(fields ?? {})) {
    document[key] = decodeValue(value);
  }
  return document;
}

export function encodeValue(value: unknown): FirestoreValue {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encodeValue) } };
  if (typeof value === 'object') {
    return { mapValue: { fields: encodeFields(value as Record<string, unknown>) } };
  }
  return { nullValue: null };
}

export function encodeFields(fields: Record<string, unknown>): Record<string, FirestoreValue> {
  const encoded: Record<string, FirestoreValue> = {};
  for (const [key, value] of Object.entries(fields)) encoded[key] = encodeValue(value);
  return encoded;
}

export class FirestoreError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status: number, code = '') {
    super(message);
    this.name = 'FirestoreError';
    this.status = status;
    this.code = code;
  }

  /** Transaction conflicts and expired transaction ids are worth retrying. */
  get isRetryable(): boolean {
    if (this.status === 409 || this.status === 429 || this.status >= 500) return true;
    return /aborted|failed_precondition|transaction|unavailable/i.test(
      `${this.code} ${this.message}`,
    );
  }
}

interface ErrorBody {
  error?: { message?: string; status?: string; code?: number };
}

export class FirestoreClient {
  private readonly target: FirestoreTarget;

  constructor(target: FirestoreTarget) {
    this.target = target;
  }

  documentName(path: string): string {
    return `projects/${this.target.projectId}/${DOCUMENTS_PATH}/${path}`;
  }

  private headers(json = false): Record<string, string> {
    const headers: Record<string, string> = { accept: 'application/json' };
    if (json) headers['content-type'] = 'application/json';
    if (this.target.token) headers.authorization = `Bearer ${this.target.token}`;
    return headers;
  }

  private async fail(response: Response): Promise<never> {
    let message = `HTTP ${response.status}`;
    let code = '';
    try {
      const body = (await response.json()) as ErrorBody;
      if (body.error?.message) message = body.error.message;
      code = body.error?.status ?? '';
    } catch {
      // The body is not JSON (proxy error page); the status is enough.
    }
    throw new FirestoreError(`[qr-studio] Firestore: ${message}`, response.status, code);
  }

  async getDocument(path: string, transaction?: string): Promise<FirestoreDocument | null> {
    const url = new URL(`${this.target.baseUrl}/v1/${this.documentName(path)}`);
    if (transaction) url.searchParams.set('transaction', transaction);

    const response = await fetch(url.toString(), { headers: this.headers() });
    if (response.status === 404) return null;
    if (!response.ok) await this.fail(response);

    const body = (await response.json()) as { fields?: Record<string, FirestoreValue> };
    return decodeFields(body.fields);
  }

  async beginTransaction(): Promise<string> {
    const endpoint =
      `${this.target.baseUrl}/v1/projects/${this.target.projectId}/${DOCUMENTS_PATH}:beginTransaction`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: this.headers(true),
      body: JSON.stringify({ options: { readWrite: {} } }),
    });
    if (!response.ok) await this.fail(response);

    const body = (await response.json()) as { transaction?: string };
    if (!body.transaction) throw new Error('[qr-studio] Firestore: transaction sans identifiant');
    return body.transaction;
  }

  async commit(transaction: string, writes: DocumentWrite[]): Promise<void> {
    const endpoint =
      `${this.target.baseUrl}/v1/projects/${this.target.projectId}/${DOCUMENTS_PATH}:commit`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: this.headers(true),
      body: JSON.stringify({ transaction, writes }),
    });
    if (!response.ok) await this.fail(response);
  }
}
