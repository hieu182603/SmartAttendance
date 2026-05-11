/**
 * IndexedDB-backed store for pending face registration data.
 *
 * When registration fails because the device is offline, images and metadata
 * are serialised to Blobs and persisted here. On the next `online` event the
 * caller is responsible for reading the pending entry and retrying the upload.
 *
 * Only ONE pending entry per user is kept (keyed by userId). Saving a second
 * entry for the same user overwrites the first, so the user always retries
 * with their most recent capture session.
 */

const DB_NAME = 'sa_offline_face';
const DB_VERSION = 1;
const STORE_NAME = 'pendingRegistrations';

export interface PendingFaceEntry {
  userId: string;
  images: Blob[];
  metadata: Array<{
    qualityScore: number;
    detectionConfidence: number;
    timestamp: number;
    validationScore?: number;
  }>;
  savedAt: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'userId' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function savePendingRegistration(entry: PendingFaceEntry): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(entry);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPendingRegistration(userId: string): Promise<PendingFaceEntry | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(userId);
    req.onsuccess = () => resolve((req.result as PendingFaceEntry) ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function clearPendingRegistration(userId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(userId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function hasPendingRegistration(userId: string): Promise<boolean> {
  const entry = await getPendingRegistration(userId);
  return entry !== null;
}
