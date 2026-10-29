// Disposable-account integration qualification. Never uses an existing identity.
import assert from 'node:assert/strict';
import { randomBytes, createHmac } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { generateSecretKey, getPublicKey, finalizeEvent } from 'nostr-tools/pure';
import { digest } from '../nostr-auth.mjs';
import { encodeSecret } from '../browser/security.mjs';
const origin = process.env.ACCOUNT_TEST_ORIGIN ?? 'http://127.0.0.1:19663';
const run = randomBytes(3).toString('hex');
const key = generateSecretKey(), pubkey = getPublicKey(key);
let cookie;
async function call(path, body, authorization, expected = 200, session = cookie) {
  const response = await fetch(origin + path, { method: body === undefined ? 'GET' : 'POST', redirect: 'manual',
    headers: { Origin: origin, Accept: body === undefined && (path === '/' || path.startsWith('/@/') || path.startsWith('/account/') || path === '/club/security') ? 'text/html' : 'application/json',
      ...(body === undefined ? {} : { 'Content-Type': body instanceof URLSearchParams ? 'application/x-www-form-urlencoded' : 'application/json' }),
      ...(session ? { Cookie: session } : {}), ...(authorization ? { Authorization: authorization } : {}) },
    body: body === undefined ? undefined : body instanceof URLSearchParams ? body.toString() : typeof body === 'string' ? body : JSON.stringify(body),
    signal: AbortSignal.timeout(15000) });
  const text = await response.text();
  assert.ok([expected].flat().includes(response.status), `${path}: ${response.status} ${text.slice(0,160)}`);
  let data; try { data = JSON.parse(text); } catch { data = text; }
  return { response, data };
}
function sessionOf(result) {
  const header = result.response.headers.getSetCookie().find(c => /(?:nosweat_session|nosweatliladev|lila2)=/.test(c));
  assert.ok(header, 'New authenticated session cookie'); return header.split(';')[0];
}
async function signed(action, fields = {}, expected = 200, signerKey = key, session = action === 'login' ? null : cookie) {
  const signerPubkey = getPublicKey(signerKey);
  const challenge = (await call('/club/challenge', { pubkey: signerPubkey, action })).data;
  const raw = JSON.stringify({ challenge: challenge.challenge, ...(action === 'login' ? {} : { action }), ...fields });
  const event = finalizeEvent({ kind: 27235, created_at: Math.floor(Date.now()/1000), content: '', tags: [
    ['u', challenge.url], ['method', 'POST'], ['challenge', challenge.challenge], ['payload', digest(raw)],
  ] }, signerKey);
  return call(action === 'login' ? '/club/login' : '/club/security', raw, 'Nostr ' + Buffer.from(JSON.stringify(event)).toString('base64'), expected, session);
}
function totp(bytes, step = Math.floor(Date.now()/30000)) {
  const msg = Buffer.alloc(8); msg.writeBigUInt64BE(BigInt(step));
  const hash = createHmac('sha1', bytes).update(msg).digest(), offset = hash.at(-1)&15;
  return ((hash.readUInt32BE(offset)&0x7fffffff)%1000000).toString().padStart(6,'0');
}
try {
  const login = await signed('login'); cookie = sessionOf(login);
  const handle = login.data.username;
  assert.equal(handle, 'n' + pubkey.slice(0,19));
  const oldSession = cookie;
  const displayName = 'Profile ' + run;
  await call('/account/profile', new URLSearchParams({ displayName, bio: 'Disposable profile check' }), undefined, [302,303]);
  const profile = (await call('/@/' + handle)).data;
  assert.ok(profile.includes(displayName) && profile.includes('@' + handle));
  assert.match((await call('/')).data, new RegExp(`id="user_tag"[^>]*>${displayName}<`));
  const user = (await call('/dasher')).data.user;
  assert.equal(user.name, handle); assert.equal(user.displayName, displayName);
  const security = (await call('/club/security')).data;
  assert.match(security, /data-enabled="false"/);
  assert.ok(!security.includes('nostr-security-token') || security.includes('one-time-code'));
  // Another key cannot modify this session's security settings.
  await signed('enable-two-factor', { secret: 'A'.repeat(32), twoFactorToken: '123456' }, 403, generateSecretKey());
  const bytes = randomBytes(20), secret = encodeSecret(bytes), token = totp(bytes);
  const enabled = await signed('enable-two-factor', { secret, twoFactorToken: token });
  cookie = sessionOf(enabled);
  assert.equal(enabled.data.enabled, true); assert.equal(enabled.data.recoveryCodes.length,8);
  assert.equal(enabled.response.headers.get('cache-control'),'no-store');
  assert.equal(new Set(enabled.data.recoveryCodes).size,8);
  const codes = enabled.data.recoveryCodes;
  assert.equal((await call('/club/me', undefined, undefined, 200, oldSession)).data.user,null);
  assert.match((await call('/club/security')).data, /data-enabled="true"/);
  await signed('login', {}, 401, key, undefined);
  await signed('login', { twoFactorToken: token }, 401, key, undefined); // enrollment code is consumed
  // Use a second-factor recovery code once; no key-only bypass.
  const recoveryRace = await Promise.all([0,1].map(() => signed('login', { twoFactorToken: codes[0] }, [200,401], key, undefined)));
  assert.deepEqual(recoveryRace.map(r => r.response.status).sort(), [200,401]);
  const recoveredSession = sessionOf(recoveryRace.find(r => r.response.status === 200));
  // Five failed/successful factor attempts share a persistent one-minute budget.
  await signed('login', { twoFactorToken: '000000' }, 401, key, undefined);
  await signed('login', { twoFactorToken: codes[1] }, 429, key, undefined);
  // Wait for the next window and verify an independent authenticator implementation.
  await delay(61000);
  const authenticatorToken = totp(bytes);
  const otpRace = await Promise.all([0,1].map(() => signed('login', { twoFactorToken: authenticatorToken }, [200,401], key, undefined)));
  assert.deepEqual(otpRace.map(r => r.response.status).sort(), [200,401]);
  cookie = sessionOf(otpRace.find(r => r.response.status === 200));
  await signed('login', { twoFactorToken: totp(bytes) }, 401, key, undefined);
  const disabled = await signed('disable-two-factor', { twoFactorToken: codes[1] });
  cookie = sessionOf(disabled); assert.equal(disabled.data.enabled,false);
  assert.equal((await call('/club/me', undefined, undefined, 200, recoveredSession)).data.user,null);
  assert.match((await call('/club/security')).data, /data-enabled="false"/);
  cookie = sessionOf(await signed('login', {}, 200, key, undefined));
  assert.equal((await call('/dasher')).data.user.displayName,displayName);
  await call('/logout', new URLSearchParams(), undefined, [200,302,303]);
  console.log(JSON.stringify({ ok:true, handle, displayName, checks:['late public name, canonical links and identity preserved', 'fresh signature from matching Nostr identity', 'enrollment and single-use recovery codes', 'session revocation', 'key-only login denied', 'native TOTP accepted', 'concurrent TOTP and recovery consumption permits exactly one login; replay denied', 'per-account rate limit', 'signed disable requires a second factor', 'key-only login restored after disabling'] }));
} finally { key.fill(0); }
