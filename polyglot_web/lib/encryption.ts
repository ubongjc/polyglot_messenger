/**
 * Client-side encryption utilities using Web Crypto API
 * Used for end-to-end encryption of message content
 */

export interface EncryptedData {
  ciphertext: string;
  iv: string;
}

/**
 * Generate a random encryption key
 */
export async function generateKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Export key to base64 string for storage
 */
export async function exportKey(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey('raw', key);
  return btoa(String.fromCharCode(...new Uint8Array(exported)));
}

/**
 * Import key from base64 string
 */
export async function importKey(keyString: string): Promise<CryptoKey> {
  const keyData = Uint8Array.from(atob(keyString), c => c.charCodeAt(0));
  return await crypto.subtle.importKey(
    'raw',
    keyData,
    {
      name: 'AES-GCM',
      length: 256,
    },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt data using AES-GCM
 */
export async function encryptData(
  data: string,
  key: CryptoKey
): Promise<EncryptedData> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);

  // Generate random IV
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    dataBuffer
  );

  const ciphertext = btoa(
    String.fromCharCode(...new Uint8Array(encryptedBuffer))
  );
  const ivString = btoa(String.fromCharCode(...iv));

  return {
    ciphertext,
    iv: ivString,
  };
}

/**
 * Decrypt data using AES-GCM
 */
export async function decryptData(
  encryptedData: EncryptedData,
  key: CryptoKey
): Promise<string> {
  const ciphertext = Uint8Array.from(atob(encryptedData.ciphertext), c =>
    c.charCodeAt(0)
  );
  const iv = Uint8Array.from(atob(encryptedData.iv), c => c.charCodeAt(0));

  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    ciphertext
  );

  const decoder = new TextDecoder();
  return decoder.decode(decryptedBuffer);
}
