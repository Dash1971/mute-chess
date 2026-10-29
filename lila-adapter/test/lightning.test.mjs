import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { bech32 } from '@scure/base';
import { secp256k1 } from '@noble/curves/secp256k1.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { concatBytes, utf8ToBytes } from '@noble/hashes/utils.js';
import { finalizeEvent, getPublicKey } from 'nostr-tools/pure';
import { createZapInvoice, invoiceDetails, lnurl, support, validateZapReceipt, validateZapRequest } from '../lightning.mjs';

// Disposable deterministic fixture keys, unrelated to the owner or any wallet.
const payer = new Uint8Array(32).fill(11), wallet = new Uint8Array(32).fill(22), node = new Uint8Array(32).fill(33);
const now = 1793274000;
const clone = event => JSON.parse(JSON.stringify(event));
const request = fields => finalizeEvent({ kind: 9734, created_at: now, content: 'Fixture donation', tags: [
  ['p', support.recipient], ['amount', '100000'], ['lnurl', lnurl], ['relays', ...support.relays],
], ...fields }, payer);
const field = (tag, words) => [tag, words.length >> 5, words.length & 31, ...words];
function encodedInvoice(description, amount = 'lnbc1u') {
  // Independent BOLT-11 writer: seven timestamp words, tagged fields, compact
  // recoverable secp256k1 signature, then Bech32 checksum.
  const timestamp = Array.from({ length: 7 }, (_, i) => Math.floor(now / 32 ** (6 - i)) & 31);
  const words = [...timestamp,
    ...field(1, bech32.toWords(sha256(new Uint8Array(32).fill(44)))),
    ...field(16, bech32.toWords(new Uint8Array(32).fill(55))),
    ...field(23, bech32.toWords(sha256(utf8ToBytes(description))))];
  const bits = words.map(w => w.toString(2).padStart(5, '0')).join('').padEnd(Math.ceil(words.length * 5 / 8) * 8, '0');
  const bytes = Uint8Array.from(bits.match(/.{8}/g), b => parseInt(b, 2));
  const digest = sha256(concatBytes(utf8ToBytes(amount), bytes));
  const signature = secp256k1.sign(digest, node, { prehash: false, format: 'recovered' });
  return bech32.encode(amount, [...words, ...bech32.toWords(concatBytes(signature.slice(1), signature.slice(0, 1)))], 4096);
}
function receipt(req = request(), fields = {}) {
  const description = JSON.stringify(req);
  return finalizeEvent({ kind: 9735, created_at: now + 5, content: '', tags: [
    ['p', support.recipient], ['P', req.pubkey], ['description', description], ['bolt11', encodedInvoice(description)],
  ], ...fields }, wallet);
}
const signedWallet = getPublicKey(wallet);

test('owner address and npub are the sole configured destination', () => {
  assert.equal(support.address, 'dash@walletofsatoshi.com');
  assert.equal(support.npub, 'npub1w6l8e4mqa4ruqs2vdvwhdxhp9ke9ax8kpncy2wy26tja3d7rzpgq06c9jl');
  assert.equal(new TextDecoder().decode(bech32.fromWords(bech32.decode(lnurl, 2048).words)), support.endpoint);
});
test('independent unpaid Wallet of Satoshi invoice passes checksum, amount and ECDSA validation', () => {
  const fixture = JSON.parse(readFileSync(new URL('./fixtures/wos-unpaid-100-sats.json', import.meta.url)));
  const info = invoiceDetails(fixture.invoice);
  assert.equal(info.amountMsat, fixture.amountMsat);
  assert.equal(info.paymentHash, 'aa1ab3126c753e4ea4d16c42f70d6d7f325f1f00e18158aeaeef8b3ae1b55771');
  const { prefix, words } = bech32.decode(fixture.invoice, 4096);
  words[words.length - 7] ^= 1;
  assert.throws(() => invoiceDetails(bech32.encode(prefix, words, 4096)), /signature|recovery|scalar|invalid/i);
  assert.throws(() => invoiceDetails(fixture.invoice.slice(0, -1) + 'x'));
  assert.throws(() => invoiceDetails('L' + fixture.invoice.slice(1)), /case/i);
});
test('zap requests bind the exact account, LNURL, millisats, timestamp and receipt relays', () => {
  assert.equal(validateZapRequest(request(), now), 100000);
  assert.throws(() => validateZapRequest(request(), now + 301), /expired/);
  for (const tag of ['p', 'lnurl', 'amount']) {
    const tags = request().tags.map(t => t[0] === tag ? [tag, 'wrong'] : t);
    assert.throws(() => validateZapRequest(request({ tags }), now));
  }
  assert.throws(() => validateZapRequest(request({ tags: [...request().tags, ['amount', '100000']] }), now));
  const modified = clone(request()); modified.content = 'tampered';
  assert.throws(() => validateZapRequest(modified, now), /signed/);
});
test('a receipt requires trusted wallet signature and exact signed request/invoice binding', () => {
  const valid = receipt();
  const result = validateZapReceipt(valid, now + 10, signedWallet);
  assert.equal(result.donor, getPublicKey(payer));
  assert.equal(result.amountMsat, 100000);
  assert.equal(result.paidAt, now + 5);
  const upper = receipt(undefined, { tags: valid.tags.map(t => t[0] === 'bolt11' ? ['bolt11', t[1].toUpperCase()] : t) });
  assert.equal(validateZapReceipt(upper, now + 10, signedWallet).invoice, result.invoice);
  assert.throws(() => validateZapReceipt(valid, now + 10), /Untrusted/);
  const changed = clone(valid); changed.created_at++;
  assert.throws(() => validateZapReceipt(changed, now + 10, signedWallet), /Untrusted/);
  const other = request({ content: 'Different donation' });
  const wrong = receipt(undefined, { tags: valid.tags.map(t => t[0] === 'description' ? ['description', JSON.stringify(other)] : t) });
  assert.throws(() => validateZapReceipt(wrong, now + 10, signedWallet), /does not match/);
  assert.throws(() => validateZapReceipt(valid, now + 31 * 86400, signedWallet), /expired/);
  assert.throws(() => validateZapReceipt(receipt(undefined, { created_at: now + 500 }), now, signedWallet), /expired/);
});
test('provider lookup is pinned, redirect-free and checks the invoice before returning it', async () => {
  const req = request(), calls = [];
  const fetcher = async (url, options) => {
    calls.push({ url: String(url), options });
    return new Response(JSON.stringify(calls.length === 1 ? {
      tag: 'payRequest', allowsNostr: true, nostrPubkey: support.issuer,
      minSendable: 1000, maxSendable: 100000000000,
      callback: 'https://livingroomofsatoshi.com/api/v1/lnurl/payreq/fixture',
    } : { pr: encodedInvoice(JSON.stringify(req)) }));
  };
  const result = await createZapInvoice(req, fetcher, now);
  assert.equal(result.amountMsat, 100000);
  assert.equal(calls[0].url, support.endpoint);
  assert.equal(calls[1].options.redirect, 'error');
  assert.equal(new URL(calls[1].url).searchParams.get('nostr'), JSON.stringify(req));
  for (const callback of ['http://127.0.0.1:27019/', 'https://evil.example/', 'https://user:secret@walletofsatoshi.com/']) {
    let count = 0;
    await assert.rejects(createZapInvoice(req, async () => {
      count++;
      return new Response(JSON.stringify({ tag: 'payRequest', allowsNostr: true, nostrPubkey: support.issuer,
        minSendable: 1000, maxSendable: 100000000000, callback }));
    }, now), /callback/);
    assert.equal(count, 1);
  }
});

// The native ledger still requires the exact previously fetched invoice/request ID.
test('address rotation keeps old invoice receipts valid but rejects new requests for the retired address', () => {
  const oldLnurl = bech32.encode('lnurl', bech32.toWords(utf8ToBytes('https://walletofsatoshi.com/.well-known/lnurlp/eerieatlas700')), 2048);
  const oldRequest = request({ tags: request().tags.map(tag => tag[0] === 'lnurl' ? ['lnurl', oldLnurl] : tag) });
  assert.throws(() => validateZapRequest(oldRequest, now), /recipient/);
  assert.equal(validateZapReceipt(receipt(oldRequest), now + 5, signedWallet).requestId, oldRequest.id);
  const unrelated = request({ tags: request().tags.map(tag => tag[0] === 'lnurl' ? ['lnurl', 'unrelated'] : tag) });
  assert.throws(() => validateZapReceipt(receipt(unrelated), now + 5, signedWallet), /recipient/);
});
