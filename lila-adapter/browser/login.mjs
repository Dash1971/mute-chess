import { generateSecretKey, getPublicKey, finalizeEvent } from 'nostr-tools/pure';
import { decode, nsecEncode } from 'nostr-tools/nip19';
import { saveKey, loadKey, forgetKey } from './key-store.mjs';
import { signedCall } from './auth-client.mjs';
import './security.mjs';

const element = id => document.getElementById('nostr-' + id);
let generated;
const status = message => { element('status').textContent = message; };
async function signIn(signer, localKey) {
  const result = await signedCall(signer, 'login', {
    username: element('username').value.trim() || undefined,
    twoFactorToken: element('token').value.trim() || undefined,
  });
  if (localKey) await saveKey(localKey);
  element('nsec').value = '';
  element('backup').value = '';
  generated?.fill(0); generated = undefined;
  location.assign(result.url || '/');
}
function localSigner(key) {
  return { getPublicKey: () => getPublicKey(key), signEvent: event => finalizeEvent(event, key) };
}
let busy = false;
function action(name, callback) {
  element(name).addEventListener('click', async () => {
    if (busy) return;
    busy = true; status('');
    const buttons = [...document.querySelectorAll('.auth-login button')];
    buttons.forEach(button => { button.disabled = true; });
    try { await callback(); }
    catch (error) { status(error instanceof Error ? error.message : 'Sign-in failed'); }
    finally { busy = false; buttons.forEach(button => { button.disabled = false; }); }
  });
}
if (element('extension')) {
  action('extension', async () => {
    if (!window.nostr?.getPublicKey || !window.nostr?.signEvent) throw Error('Install or enable a NIP-07 browser signer, then reload this page.');
    await signIn(window.nostr);
  });
  action('generate', async () => {
    generated?.fill(0); generated = generateSecretKey();
    element('backup').value = nsecEncode(generated);
    element('backup').type = 'password';
    element('created').hidden = false;
    element('create-login').focus();
  });
  action('reveal', () => {
    const hidden = element('backup').type === 'password';
    element('backup').type = hidden ? 'text' : 'password';
    element('reveal').textContent = hidden ? 'Hide backup nsec' : 'Show backup nsec';
  });
  action('create-login', async () => {
    if (!generated) throw Error('Generate a key first');
    await signIn(localSigner(generated), generated);
  });
  action('import', async () => {
    let key;
    try {
      const decoded = decode(element('nsec').value.trim());
      if (decoded.type !== 'nsec') throw Error();
      key = decoded.data;
      getPublicKey(key); // validate the scalar, not just the encoding
    } catch { throw Error('Enter a valid nsec private key'); }
    try { await signIn(localSigner(key), key); } finally { key.fill(0); }
  });
  action('use-saved', async () => {
    const key = await loadKey();
    if (!key) throw Error('No key is saved in this browser');
    try { await signIn(localSigner(key)); } finally { key.fill(0); }
  });
  action('forget', async () => { await forgetKey(); element('saved').hidden = true; status('Saved key removed from this browser.'); });
  loadKey().then(key => { element('saved').hidden = !key; key?.fill(0); }).catch(() => {});
}
