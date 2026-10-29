import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateSecretKey, getPublicKey, finalizeEvent } from 'nostr-tools/pure';
import { NostrAuth, digest } from '../nostr-auth.mjs';

const now = 1793185200000;
const origin = 'http://127.0.0.1:19663';
function fixture() {
  const key = generateSecretKey();
  const auth = new NostrAuth(origin, () => now);
  const pubkey = getPublicKey(key);
  const { challenge } = auth.challenge(pubkey);
  const body = JSON.stringify({ challenge, username: 'TestHuman' });
  const unsigned = { kind: 27235, created_at: now / 1000, content: '',
    tags: [['u', origin + '/club/login'], ['method', 'POST'], ['challenge', challenge], ['payload', digest(body)]] };
  const header = event => 'Nostr ' + Buffer.from(JSON.stringify(finalizeEvent(event, key))).toString('base64');
  return { key, auth, pubkey, body, unsigned, header };
}
test('a signed challenge is bound to its public key and consumed once', () => {
  const f = fixture(); const authorization = f.header(f.unsigned);
  assert.deepEqual(f.auth.verify(authorization, f.body), { pubkey: f.pubkey });
  assert.throws(() => f.auth.verify(authorization, f.body), /already used/);
});
test('request URL, method, challenge and body are signature-bound', () => {
  for (const [tag, value] of [['u', 'https://attacker.invalid/club/login'], ['method', 'GET'], ['challenge', '0'.repeat(64)], ['payload', '0'.repeat(64)]]) {
    const f = fixture(); f.unsigned.tags.find(t => t[0] === tag)[1] = value;
    assert.throws(() => f.auth.verify(f.header(f.unsigned), f.body), /Invalid/);
  }
  const f = fixture();
  assert.throws(() => f.auth.verify(f.header(f.unsigned), f.body.replace('TestHuman', 'OtherHuman')), /Invalid/);
});
test('reject stale, altered, wrong-key, duplicate-tag and malformed events', () => {
  for (const mutate of [e => { e.created_at -= 61; }, e => { e.kind = 1; },
    e => { e.content = 'not empty'; }, e => { e.tags.push(['method', 'POST']); }]) {
    const f = fixture(); mutate(f.unsigned);
    assert.throws(() => f.auth.verify(f.header(f.unsigned), f.body), /Invalid/);
  }
  const f = fixture();
  const other = finalizeEvent(f.unsigned, generateSecretKey());
  assert.throws(() => f.auth.verify('Nostr ' + Buffer.from(JSON.stringify(other)).toString('base64'), f.body), /Invalid/);
  const altered = finalizeEvent(f.unsigned, f.key); altered.sig = '0'.repeat(128);
  assert.throws(() => f.auth.verify('Nostr ' + Buffer.from(JSON.stringify(altered)).toString('base64'), f.body), /Invalid/);
  for (const header of [undefined, 'Bearer fake', 'Nostr garbage']) assert.throws(() => f.auth.verify(header, f.body));
});
test('challenge expires and a restarted verifier accepts no previous challenge', () => {
  const f = fixture(); f.auth.now = () => now + 61000;
  assert.throws(() => f.auth.verify(f.header(f.unsigned), f.body), /expired/);
  assert.throws(() => new NostrAuth(origin, () => now).verify(f.header(f.unsigned), f.body), /already used/);
});

test('security challenges bind the exact action, URL, setup secret and second factor', () => {
  const key = generateSecretKey(), pubkey = getPublicKey(key);
  const auth = new NostrAuth(origin, () => now);
  for (const action of ['enable-two-factor', 'disable-two-factor']) {
    const challenge = auth.challenge(pubkey, action);
    assert.equal(challenge.url, origin + '/club/security');
    const raw = JSON.stringify({ challenge: challenge.challenge, action, twoFactorToken: '123456',
      ...(action === 'enable-two-factor' ? { secret: 'A'.repeat(32) } : {}) });
    const unsigned = { kind: 27235, created_at: now / 1000, content: '', tags: [
      ['u', challenge.url], ['method', 'POST'], ['challenge', challenge.challenge], ['payload', digest(raw)],
    ] };
    const header = event => 'Nostr ' + Buffer.from(JSON.stringify(finalizeEvent(event, key))).toString('base64');
    assert.throws(() => auth.verify(header({ ...unsigned, tags: unsigned.tags.map(t => t[0] === 'u' ? ['u', origin + '/club/login'] : t) }), raw), /Invalid/);
    assert.throws(() => auth.verify(header(unsigned), raw.replace('123456', '654321')), /Invalid/);
    assert.deepEqual(auth.verify(header(unsigned), raw), { pubkey, action });
    assert.throws(() => auth.verify(header(unsigned), raw), /already used/);
  }
  assert.throws(() => auth.challenge(pubkey, 'disable-security'), /Invalid/);
});

test('a login challenge cannot authorize enrollment and its token is signature-bound', () => {
  const f = fixture();
  const raw = JSON.stringify({ challenge: JSON.parse(f.body).challenge, action: 'enable-two-factor', secret: 'A'.repeat(32), twoFactorToken: '123456' });
  const signed = { ...f.unsigned, tags: f.unsigned.tags.map(t => t[0] === 'payload' ? ['payload', digest(raw)] : t) };
  assert.throws(() => f.auth.verify(f.header(signed), raw), /action mismatch/);
  const login = JSON.stringify({ challenge: JSON.parse(f.body).challenge, twoFactorToken: 'abcd1234-'.repeat(3) + 'abcd1234' });
  const loginSigned = { ...f.unsigned, tags: f.unsigned.tags.map(t => t[0] === 'payload' ? ['payload', digest(login)] : t) };
  assert.throws(() => f.auth.verify(f.header(loginSigned), login.replace('abcd', 'efab')), /Invalid/);
  assert.deepEqual(f.auth.verify(f.header(loginSigned), login), { pubkey: f.pubkey });
});
