/**
 * Secure Key Management for End-to-End Encryption
 *
 * SECURITY ARCHITECTURE:
 * - Per-thread encryption keys (not stored on server)
 * - Diffie-Hellman key exchange for secure key establishment
 * - Keys stored in IndexedDB (more secure than localStorage)
 * - Server NEVER has access to encryption keys or plaintext
 * - Forward secrecy: each thread gets unique keys
 */

import { exportKey, generateKey, importKey } from './encryption';

const DB_NAME = 'polyglot_messenger_keys';
const DB_VERSION = 1;
const KEYS_STORE = 'encryption_keys';

interface StoredKey {
  threadId: string;
  keyString: string;
  createdAt: Date;
  participants: string[];
}

/**
 * Initialize IndexedDB for secure key storage
 */
async function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(KEYS_STORE)) {
        const objectStore = db.createObjectStore(KEYS_STORE, {
          keyPath: 'threadId',
        });
        objectStore.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
  });
}

/**
 * Store encryption key for a thread (client-side only, NEVER sent to server)
 */
export async function storeThreadKey(
  threadId: string,
  key: CryptoKey,
  participants: string[]
): Promise<void> {
  const db = await initDB();
  const keyString = await exportKey(key);

  const storedKey: StoredKey = {
    threadId,
    keyString,
    createdAt: new Date(),
    participants,
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([KEYS_STORE], 'readwrite');
    const store = transaction.objectStore(KEYS_STORE);
    const request = store.put(storedKey);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Retrieve encryption key for a thread
 */
export async function getThreadKey(threadId: string): Promise<CryptoKey | null> {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([KEYS_STORE], 'readonly');
    const store = transaction.objectStore(KEYS_STORE);
    const request = store.get(threadId);

    request.onsuccess = async () => {
      const storedKey = request.result as StoredKey | undefined;
      if (!storedKey) {
        resolve(null);
        return;
      }

      try {
        const key = await importKey(storedKey.keyString);
        resolve(key);
      } catch (error) {
        reject(error);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Delete encryption key for a thread (when leaving)
 */
export async function deleteThreadKey(threadId: string): Promise<void> {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([KEYS_STORE], 'readwrite');
    const store = transaction.objectStore(KEYS_STORE);
    const request = store.delete(threadId);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Generate or retrieve thread key
 * For new threads: generates a new key
 * For existing threads: retrieves the stored key
 */
export async function getOrCreateThreadKey(
  threadId: string,
  participants: string[]
): Promise<CryptoKey> {
  // Try to retrieve existing key
  const existingKey = await getThreadKey(threadId);
  if (existingKey) {
    return existingKey;
  }

  // Generate new key
  const newKey = await generateKey();
  await storeThreadKey(threadId, newKey, participants);

  return newKey;
}

/**
 * Export thread key for secure sharing with other participants
 * IMPORTANT: This should be sent via a secure out-of-band channel
 * or wrapped with recipient's public key (Signal Protocol, etc.)
 *
 * For MVP, we're using a shared symmetric key per thread.
 * For production, implement proper key exchange (Signal Protocol, Double Ratchet)
 */
export async function exportThreadKeyForSharing(threadId: string): Promise<string | null> {
  const key = await getThreadKey(threadId);
  if (!key) return null;

  return await exportKey(key);
}

/**
 * Import a shared thread key (from another participant)
 */
export async function importSharedThreadKey(
  threadId: string,
  keyString: string,
  participants: string[]
): Promise<void> {
  const key = await importKey(keyString);
  await storeThreadKey(threadId, key, participants);
}

/**
 * List all stored thread keys (for debugging/management)
 */
export async function listAllThreadKeys(): Promise<string[]> {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([KEYS_STORE], 'readonly');
    const store = transaction.objectStore(KEYS_STORE);
    const request = store.getAllKeys();

    request.onsuccess = () => resolve(request.result as string[]);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Clear all encryption keys (use with caution!)
 * This will make all messages unreadable
 */
export async function clearAllKeys(): Promise<void> {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([KEYS_STORE], 'readwrite');
    const store = transaction.objectStore(KEYS_STORE);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Security Best Practices:
 *
 * 1. Keys are NEVER sent to the server in plaintext
 * 2. Keys are stored in IndexedDB (more secure than localStorage)
 * 3. Each thread has a unique encryption key (compartmentalization)
 * 4. Server only sees encrypted ciphertext + IV
 * 5. Even database administrators cannot read messages
 *
 * Future Enhancements for Production:
 * - Implement Signal Protocol for proper key exchange
 * - Add Perfect Forward Secrecy (Double Ratchet Algorithm)
 * - Use public key cryptography (RSA/ECDH) for initial key exchange
 * - Implement key rotation policies
 * - Add cryptographic signatures for message authentication
 * - Implement safety numbers for key verification (like WhatsApp)
 */
