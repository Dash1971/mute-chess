// A non-extractable wrapping key keeps a plaintext nsec out of browser storage.
// Same-origin scripts can still use this store: prefer an external NIP-07 signer.
const database = 'nosweatchess-identity-v1';
function open() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(database, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('identity');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(Error('Browser key storage is unavailable'));
  });
}
async function transaction(mode, operation) {
  const db = await open();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('identity', mode);
      const request = operation(tx.objectStore('identity'));
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = tx.onabort = () => reject(Error('Browser key storage failed'));
    });
  } finally { db.close(); }
}
export async function saveKey(secret) {
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, secret);
  await transaction('readwrite', store => store.put({ key, iv, encrypted }, 'current'));
}
export async function loadKey() {
  const entry = await transaction('readonly', store => store.get('current'));
  if (!entry) return null;
  return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: entry.iv }, entry.key, entry.encrypted));
}
export const forgetKey = () => transaction('readwrite', store => store.delete('current'));
