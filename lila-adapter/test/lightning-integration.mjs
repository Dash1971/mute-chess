// Private-stack qualification only. Creates disposable accounts and unpaid
// invoices. Never accepts a production origin, pays an invoice or changes 2FA.
import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { finalizeEvent, generateSecretKey, getPublicKey } from 'nostr-tools/pure';
import { invoiceDetails, support, lnurl } from '../lightning.mjs';

const origin = 'http://127.0.0.1:19663';
const key = generateSecretKey(), otherKey = generateSecretKey();
let cookie;
async function call(path, body, options = {}) {
  const response = await fetch(origin + path, { method: body === undefined ? 'GET' : 'POST', redirect: 'manual',
    headers: { Origin: options.origin ?? origin, Accept: options.html ? 'text/html' : 'application/json',
      'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...options.headers },
    body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(20000) });
  const text = await response.text();
  assert.ok([options.expected ?? 200].flat().includes(response.status), `${path}: ${response.status} ${text.slice(0, 150)}`);
  let data; try { data = JSON.parse(text); } catch { data = text; }
  return { data, response };
}
try {
  const pubkey = getPublicKey(key);
  const { data: challenge } = await call('/club/challenge', { pubkey });
  const body = { challenge: challenge.challenge, username: 'ZapTest' + randomBytes(4).toString('hex') };
  const payload = createHash('sha256').update(JSON.stringify(body)).digest('hex');
  const event = finalizeEvent({ kind: 27235, created_at: Math.floor(Date.now() / 1000), content: '', tags: [
    ['u', origin + '/club/login'], ['method', 'POST'], ['challenge', challenge.challenge], ['payload', payload],
  ] }, key);
  const login = await call('/club/login', body, { headers: { Authorization: 'Nostr ' + Buffer.from(JSON.stringify(event)).toString('base64') } });
  cookie = login.response.headers.getSetCookie().find(c => c.startsWith('nosweatliladev=')).split(';')[0];
  const page = await call('/patron', undefined, { html: true });
  assert.match(page.data, new RegExp(`data-pubkey="${pubkey}"`));
  assert.match(page.data, /eerieatlas700@walletofsatoshi.com/);
  assert.match(page.data, /mempool.space/);
  assert.equal(page.response.headers.get('cache-control'), 'no-store');
  const request = finalizeEvent({ kind: 9734, created_at: Math.floor(Date.now() / 1000), content: 'Private stack qualification (unpaid)', tags: [
    ['p', support.recipient], ['amount', '100000'], ['lnurl', lnurl], ['relays', ...support.relays],
  ] }, key);
  const result = (await call('/club/patron/invoice', { request })).data;
  assert.equal(invoiceDetails(result.invoice).amountMsat, 100000);
  const pending = (await call('/club/patron/pending')).data;
  assert.ok(pending.includes(result.invoice), 'Server-issued invoice survives a fresh request');
  assert.equal((await call('/club/patron/receipt', { receipt: {} }, { expected: 400 })).data.error, 'Invalid or untrusted payment receipt');
  await call('/club/patron/invoice', { request }, { expected: 403, origin: 'https://example.invalid' });
  const wrong = finalizeEvent({ kind: 9734, created_at: Math.floor(Date.now() / 1000), content: '', tags: request.tags }, otherKey);
  await call('/club/patron/invoice', { request: wrong }, { expected: 403 });
  const unpaid = await call('/patron', undefined, { html: true });
  assert.doesNotMatch(unpaid.data, /Your patron wings are active/);
  await call('/logout', {}, { expected: [200, 302, 303] });
  cookie = undefined;
  const anon = (await call('/patron', undefined, { html: true })).data;
  assert.match(anon, /data-pubkey=""/);
  assert.doesNotMatch(anon, /id="patron-create"/);
  console.log(JSON.stringify({ ok: true, paymentMade: false, checks: [
    'private disposable Nostr account', 'native support page and scoped CSP',
    'real unpaid zap invoice verified and persisted', 'foreign account and Origin rejected',
    'untrusted receipt rejected; unpaid invoice does not grant wings', 'anonymous direct support',
  ] }));
} finally { key.fill(0); otherKey.fill(0); }
