import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getPublicKey } from 'nostr-tools/pure';
import { nsecEncode, npubEncode } from 'nostr-tools/nip19';
import { bindNostrKeys } from '../browser/keys.mjs';

const secret = () => new Uint8Array(32).fill(1);
function setup(load, publicKey = getPublicKey(secret())) {
  const events = new Map(), copied = [], timers = [];
  const nodes = new Map(['npub','nsec','private','ack','reveal','copy-npub','copy-nsec','status'].map(id => [id, {
    value: '', textContent: '', hidden: true, checked: false, disabled: false, listeners: {},
    addEventListener(type, callback) { this.listeners[type] = callback; },
    async click() { await this.listeners.click?.(); },
  }]));
  nodes.get('npub').value = npubEncode(publicKey);
  const doc = { hidden: false, addEventListener(type, callback) { events.set(type, callback); } };
  bindNostrKeys({ dataset: { publicKey }, ownerDocument: doc, querySelector: id => nodes.get(id.replace('#nostr-keys-', '')) }, {
    load, doc, win: { addEventListener(type, callback) { events.set(type, callback); } },
    clipboard: { async writeText(value) { copied.push(value); } },
    later(callback) { timers.push(callback); return timers.length; }, cancel() {},
  });
  return { node: id => nodes.get(id), events, copied, timers, doc, acknowledge() {
    nodes.get('ack').checked = true; nodes.get('ack').listeners.change();
  } };
}

test('public-key copy never decrypts the saved private key; reveal requires acknowledgement', async () => {
  let loads = 0;
  const ui = setup(async () => { loads++; return secret(); });
  await ui.node('copy-npub').click();
  await ui.node('reveal').click();
  assert.equal(loads, 0);
  assert.deepEqual(ui.copied, [npubEncode(getPublicKey(secret()))]);
  assert.equal(ui.node('nsec').value, '');
  assert.equal(ui.node('copy-nsec').disabled, true);
});

test('matching local key can be revealed and copied; bytes are wiped and hiding the tab clears the field', async () => {
  const key = secret(), expected = nsecEncode(key);
  const ui = setup(async () => key);
  ui.acknowledge();
  await ui.node('reveal').click();
  assert.equal(ui.node('nsec').value, expected);
  assert.ok(key.every(byte => byte === 0));
  await ui.node('copy-nsec').click();
  assert.deepEqual(ui.copied, [expected]);
  ui.doc.hidden = true; ui.events.get('visibilitychange')();
  assert.equal(ui.node('nsec').value, '');
  assert.equal(ui.node('private').hidden, true);
  await ui.node('copy-nsec').click();
  assert.equal(ui.copied.length, 1);
});

test('a saved key for another account is never revealed or copied', async () => {
  const key = new Uint8Array(32).fill(2);
  const ui = setup(async () => key);
  ui.acknowledge(); await ui.node('reveal').click();
  assert.equal(ui.node('nsec').value, '');
  assert.match(ui.node('status').textContent, /No matching key/);
  assert.ok(key.every(byte => byte === 0));
  await ui.node('copy-nsec').click(); assert.equal(ui.copied.length, 0);
});

test('navigation while a key is loading cancels its reveal, and an automatic timeout hides a shown key', async () => {
  let resolve;
  const key = secret(), ui = setup(() => new Promise(done => { resolve = done; }));
  ui.acknowledge(); const pending = ui.node('reveal').click();
  ui.events.get('pagehide')(); resolve(key); await pending;
  assert.equal(ui.node('nsec').value, ''); assert.ok(key.every(byte => byte === 0));
  const timed = setup(async () => secret()); timed.acknowledge(); await timed.node('reveal').click();
  timed.timers[0](); assert.equal(timed.node('nsec').value, '');
});
