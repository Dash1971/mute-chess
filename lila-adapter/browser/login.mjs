import { generateSecretKey, getPublicKey, finalizeEvent } from 'nostr-tools/pure';
import { decode, nsecEncode } from 'nostr-tools/nip19';
import { saveKey, loadKey, forgetKey, requestKeyPersistence } from './key-store.mjs';
import { signedCall, AuthResponseError } from './auth-client.mjs';
import './security.mjs';
import './patron.mjs';
import './keys.mjs';

const element = id => document.getElementById('nostr-' + id);
let generated, pending;
let pageEpoch = 0;
const status = (message, error = false) => {
  element('status').textContent = message;
  element('status').dataset.state = error ? 'error' : 'info';
};
function localSigner(key) {
  return { getPublicKey: () => getPublicKey(key), signEvent: event => finalizeEvent(event, key) };
}
function resetFactor() {
  pending?.key?.fill(0); pending = undefined;
  element('token').value = '';
  element('second-factor').hidden = true;
  element('methods').hidden = false;
}
async function complete(result, key, save, epoch) {
  if (epoch !== pageEpoch) return;
  if (key && save) await saveKey(key);
  if (epoch !== pageEpoch) return;
  element('nsec').value = '';
  element('backup').value = '';
  generated?.fill(0); generated = undefined;
  resetFactor();
  const referrer = new URLSearchParams(location.search).get('referrer');
  const destination = referrer?.startsWith('/') && !referrer.startsWith('//') && !/^\/(?:login|signup)(?:[/?#]|$)/.test(referrer)
    ? new URL(referrer, location.origin) : undefined;
  location.assign(destination?.origin === location.origin ? destination.href : result.url || '/');
}
async function signIn(signer, key, save = true) {
  resetFactor();
  const epoch = pageEpoch;
  const fields = { username: element('username').value.trim() || undefined };
  try { await complete(await signedCall(signer, 'login', fields), key, save, epoch); }
  catch (error) {
    if (epoch !== pageEpoch) return;
    if (!(error instanceof AuthResponseError) || error.code !== 'two_factor_required') throw error;
    // Retain a temporary copy only while the verified account completes 2FA.
    // Import/saved-key callers erase their own copy in finally.
    const copy = key?.slice();
    pending = { signer: copy ? localSigner(copy) : signer, key: copy, save, fields };
    element('methods').hidden = true;
    element('second-factor').hidden = false;
    element('token').focus();
  }
}
async function exportKey(key, download = false) {
  const nsec = nsecEncode(key);
  if (download) {
    const link = document.createElement('a');
    const url = URL.createObjectURL(new Blob([nsec + '\n'], { type: 'text/plain;charset=utf-8' }));
    try {
      link.href = url;
      link.download = 'mute-chess-nostr-key.txt';
      document.body.append(link);
      link.click();
    } finally {
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    status('Backup download requested. Keep the file somewhere private.');
  } else {
    try { await navigator.clipboard.writeText(nsec); }
    catch { throw Error('Copy is unavailable here. Use Download .txt instead.'); }
    status('Key copied. Paste it into your password manager.');
  }
}
async function exportSavedKey(download) {
  const key = await loadKey();
  if (!key) throw Error('No key is saved in this browser');
  try { await exportKey(key, download); } finally { key.fill(0); }
}
let busy = false;
function action(name, callback) {
  element(name).addEventListener('click', async () => {
    if (busy) return;
    busy = true; status('');
    const buttons = [...document.querySelectorAll('.auth-login button')];
    buttons.forEach(button => { button.disabled = true; });
    try { await callback(); }
    catch (error) { status(error instanceof Error ? error.message : 'Sign-in failed', true); }
    finally { busy = false; buttons.forEach(button => { button.disabled = false; }); }
  });
}
if (element('extension')) {
  action('extension', async () => {
    if (!window.nostr?.getPublicKey || !window.nostr?.signEvent) throw Error('Enable your Nostr browser signer, then try again.');
    await signIn(window.nostr);
  });
  action('generate', () => {
    resetFactor(); generated?.fill(0); generated = generateSecretKey();
    element('backup').value = nsecEncode(generated);
    element('backup').type = 'password';
    element('reveal').textContent = 'Show key';
    element('created').hidden = false;
    element('created').scrollIntoView({ block: 'nearest' });
    element('copy').focus();
  });
  action('reveal', () => {
    const hidden = element('backup').type === 'password';
    element('backup').type = hidden ? 'text' : 'password';
    element('reveal').textContent = hidden ? 'Hide key' : 'Show key';
  });
  action('copy', async () => {
    if (!generated) throw Error('Create a key first');
    await exportKey(generated);
  });
  action('download', async () => {
    if (!generated) throw Error('Create a key first');
    await exportKey(generated, true);
  });
  action('copy-saved', () => exportSavedKey(false));
  action('download-saved', () => exportSavedKey(true));
  let persistencePending = false;
  element('persist').addEventListener('click', async () => {
    if (persistencePending) return;
    persistencePending = true;
    element('persist').disabled = true;
    const result = await requestKeyPersistence();
    persistencePending = false;
    element('persist').disabled = false;
    status(result === 'granted'
      ? 'Your browser agreed to keep site data. Keep a backup for clearing data or changing devices.'
      : result === 'denied'
        ? 'Your browser will manage storage automatically. A backup lets you restore the same identity.'
        : 'This browser cannot request longer storage. You can still copy or download a backup.');
  });
  action('create-login', async () => {
    if (!generated) throw Error('Create a key first');
    await signIn(localSigner(generated), generated);
  });
  action('import', async () => {
    let key;
    try {
      const decoded = decode(element('nsec').value.trim());
      if (decoded.type !== 'nsec') throw Error();
      key = decoded.data;
      getPublicKey(key);
    } catch { throw Error('Enter a valid nsec secret key'); }
    element('nsec').value = '';
    try { await signIn(localSigner(key), key); } finally { key.fill(0); }
  });
  action('use-saved', async () => {
    const key = await loadKey();
    if (!key) throw Error('No key is saved in this browser');
    try { await signIn(localSigner(key), key, false); } finally { key.fill(0); }
  });
  action('forget', async () => { resetFactor(); await forgetKey(); element('saved').hidden = true; status('Saved key removed from this browser.'); });
  action('verify', async () => {
    if (!pending) return;
    const token = element('token').value.trim();
    if (!token) throw Error('Enter your authenticator or recovery code');
    // Each retry obtains and signs a new one-use challenge, including the code.
    const attempt = pending, epoch = pageEpoch;
    const result = await signedCall(attempt.signer, 'login', { ...attempt.fields, twoFactorToken: token });
    await complete(result, attempt.key, attempt.save, epoch);
  });
  action('back', () => { resetFactor(); status(''); });
  element('token').addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); element('verify').click(); } });
  element('nsec').addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); element('import').click(); } });
  window.addEventListener('pagehide', () => {
    pageEpoch++;
    resetFactor();
    generated?.fill(0); generated = undefined;
    element('backup').value = '';
    element('nsec').value = '';
    element('created').hidden = true;
  });
  loadKey().then(key => { element('saved').hidden = !key; key?.fill(0); }).catch(() => {});
}
