import 'fake-indexeddb/auto';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { saveKey, loadKey, forgetKey } from '../browser/key-store.mjs';

test('browser identity survives reload without storing a plaintext private key', async () => {
  const secret = new Uint8Array(32).fill(13); // disposable test scalar
  await saveKey(secret);
  const reloaded = await import('../browser/key-store.mjs?reload');
  assert.deepEqual(await reloaded.loadKey(), secret);
  const database = await new Promise((resolve, reject) => {
    const request = indexedDB.open('nosweatchess-identity-v1', 1);
    request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
  });
  const entry = await new Promise(resolve => {
    const request = database.transaction('identity').objectStore('identity').get('current');
    request.onsuccess = () => resolve(request.result);
  });
  database.close();
  assert.equal(entry.key.extractable, false);
  assert.equal(entry.iv.byteLength, 12);
  assert.equal(entry.encrypted.byteLength, 48);
  await assert.rejects(crypto.subtle.exportKey('raw', entry.key));
  const tampered = new Uint8Array(entry.encrypted); tampered[0] ^= 1;
  await assert.rejects(crypto.subtle.decrypt({ name: 'AES-GCM', iv: entry.iv }, entry.key, tampered));
});
test('replacing and forgetting a browser identity do not resurrect old keys', async () => {
  await saveKey(new Uint8Array(32).fill(17));
  assert.deepEqual(await loadKey(), new Uint8Array(32).fill(17));
  await forgetKey();
  assert.equal(await loadKey(), null);
});
