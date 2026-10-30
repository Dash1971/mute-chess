import { getPublicKey } from 'nostr-tools/pure';
import { nsecEncode } from 'nostr-tools/nip19';
import { loadKey } from './key-store.mjs';

export function bindNostrKeys(page, {
  load = loadKey, clipboard = globalThis.navigator?.clipboard,
  doc = page.ownerDocument, win = globalThis.window,
  later = setTimeout, cancel = clearTimeout,
} = {}) {
  const element = id => page.querySelector('#nostr-keys-' + id);
  if (!element('npub')) return;
  let epoch = 0, timer;
  const status = text => { element('status').textContent = text; };
  const hide = () => {
    epoch++;
    cancel(timer);
    element('nsec').value = '';
    element('private').hidden = true;
    element('copy-nsec').disabled = true;
    element('reveal').textContent = 'Show private key';
  };
  element('ack').addEventListener('change', () => {
    hide();
    element('reveal').disabled = !element('ack').checked;
  });
  element('reveal').addEventListener('click', async () => {
    if (!element('private').hidden) return hide();
    if (!element('ack').checked) return;
    const request = ++epoch;
    element('reveal').disabled = true;
    let key;
    try {
      key = await load();
      if (request !== epoch || doc.hidden) return;
      if (!key || getPublicKey(key) !== page.dataset.publicKey)
        return status('No matching key is saved in this browser. If you use a signer, manage your private key there.');
      element('nsec').value = nsecEncode(key);
      element('private').hidden = false;
      element('copy-nsec').disabled = false;
      element('reveal').textContent = 'Hide private key';
      status('Keep this key private. Save your backup in a password manager.');
      timer = later(hide, 60_000);
    } catch {
      if (request === epoch) status('The saved browser key is unavailable. No private key was revealed.');
    } finally {
      key?.fill(0);
      element('reveal').disabled = !element('ack').checked;
    }
  });
  const copy = async id => {
    if (id === 'nsec' && (element('private').hidden || !element('ack').checked)) return;
    const value = element(id).value;
    if (!value) return;
    try {
      if (!clipboard?.writeText) throw new Error();
      await clipboard.writeText(value);
      status(id === 'nsec' ? 'Private key copied. Paste it into your password manager, then clear your clipboard.' : 'Public key copied.');
    } catch {
      status('Copy is unavailable here. Select the key and copy it manually.');
    }
  };
  element('copy-npub').addEventListener('click', () => copy('npub'));
  element('copy-nsec').addEventListener('click', () => copy('nsec'));
  doc.addEventListener('visibilitychange', () => { if (doc.hidden) hide(); });
  win.addEventListener('pagehide', hide);
  hide();
}

const page = typeof document === 'undefined' ? null : document.getElementById('nostr-keys');
if (page) bindNostrKeys(page);
