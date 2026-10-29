import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encodeSecret } from '../browser/security.mjs';

test('authenticator setup uses standard unpadded base32 for 160-bit secrets', () => {
  assert.equal(encodeSecret(new Uint8Array(20)), 'A'.repeat(32));
  assert.equal(encodeSecret(new Uint8Array(20).fill(255)), '7'.repeat(32));
  assert.equal(encodeSecret(new TextEncoder().encode('12345678901234567890')), 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ');
});
