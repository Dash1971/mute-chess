// Disposable identities on the private stack; never load an owner's key or session.
import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { finalizeEvent, generateSecretKey, getPublicKey } from 'nostr-tools/pure';
import { npubEncode } from 'nostr-tools/nip19';

const origin = process.env.PROFILE_TEST_ORIGIN || 'http://127.0.0.1:19663';
assert.ok(new URL(origin).hostname === '127.0.0.1', 'This test is restricted to the private stack');
let cookie;
async function call(path, body, expected = 200, json = false) {
  const response = await fetch(origin + path, {
    method: body === undefined ? 'GET' : 'POST', redirect: 'manual',
    headers: { Origin: origin, Accept: json ? 'application/json' : 'text/html',
      ...(cookie ? { Cookie: cookie } : {}),
      ...(body instanceof URLSearchParams ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
    }, body, signal: AbortSignal.timeout(20000),
  });
  const text = await response.text();
  assert.ok([expected].flat().includes(response.status), `${path}: ${response.status}`);
  return json && text ? JSON.parse(text) : text;
}
async function login(key, username) {
  const pubkey = getPublicKey(key);
  const challenge = await fetch(origin + '/club/challenge', { method: 'POST',
    headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ pubkey }) }).then(r => r.json());
  const body = JSON.stringify({ challenge: challenge.challenge, ...(username ? { username } : {}) });
  const event = finalizeEvent({ kind: 27235, created_at: Math.floor(Date.now() / 1000), content: '', tags: [
    ['u', origin + '/club/login'], ['method', 'POST'], ['challenge', challenge.challenge],
    ['payload', createHash('sha256').update(body).digest('hex')],
  ] }, key);
  const response = await fetch(origin + '/club/login', { method: 'POST', headers: {
    Origin: origin, 'Content-Type': 'application/json', Authorization: 'Nostr ' + Buffer.from(JSON.stringify(event)).toString('base64'),
  }, body });
  assert.equal(response.status, 200);
  cookie = response.headers.getSetCookie().find(c => /^(?:nosweat_session|nosweatliladev|lila2)=/.test(c)).split(';')[0];
  return (await response.json()).username;
}
const key = generateSecretKey(), namedKey = generateSecretKey();
try {
  const handle = await login(key);
  const full = npubEncode(getPublicKey(key));
  const compact = full.slice(0, 9) + '…' + full.slice(-4);
  const originalProfile = await call('/@/' + handle);
  assert.ok(originalProfile.includes(compact) && originalProfile.includes(full));
  assert.equal((await call('/dasher', undefined, 200, true)).user.displayName, compact);
  await call('/account/profile', new URLSearchParams({ displayName: 'a'.repeat(21) }), 400);
  assert.equal((await call('/dasher', undefined, 200, true)).user.displayName, compact);
  const chosen = 'a'.repeat(20);
  await call('/account/profile', new URLSearchParams({ displayName: chosen }), [302, 303]);
  const user = (await call('/dasher', undefined, 200, true)).user;
  assert.equal(user.name, handle); assert.equal(user.displayName, chosen);
  assert.ok((await call('/@/' + handle)).includes(full));
  await call('/account/profile', new URLSearchParams({ displayName: '' }), [302, 303]);
  assert.equal((await call('/dasher', undefined, 200, true)).user.displayName, compact);
  if (process.env.PROFILE_TEST_GAME) {
    const game = process.env.PROFILE_TEST_GAME;
    assert.match(game, /^[a-zA-Z0-9]{8}$/);
    const page = await call('/game/' + game);
    assert.ok(page.includes('"notesOnly":true'));
    assert.ok(!page.includes('Spectator room'));
    const text = 'Private notes qualification';
    await call(`/game/${game}/note`, new URLSearchParams({ text }), 200, true);
    assert.equal(await call(`/game/${game}/note`), text);
  }
  cookie = undefined;
  const explicit = 'NameTest' + randomBytes(4).toString('hex');
  const namedHandle = await login(namedKey, explicit);
  assert.equal(namedHandle, explicit);
  const page = await call('/@/' + namedHandle);
  assert.ok(page.includes(explicit));
  assert.ok(!page.includes(npubEncode(getPublicKey(namedKey)).slice(0, 9) + '…'));
  console.log(JSON.stringify({ ok: true, handle, checks: ['compact generated name and independent NIP-19 encoding',
    'full public key on profile', '20-character name accepted; 21 rejected',
    'canonical handle retained; clearing name restores fallback', 'chosen signup handle retained',
    ...(process.env.PROFILE_TEST_GAME ? ['native private note save/read; no spectator room'] : [])] }));
} finally { key.fill(0); namedKey.fill(0); }
