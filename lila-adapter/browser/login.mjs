import { generateSecretKey, getPublicKey, finalizeEvent } from 'nostr-tools/pure';
import { decode, nsecEncode } from 'nostr-tools/nip19';
import { saveKey, loadKey, forgetKey, requestKeyPersistence } from './key-store.mjs';
import { signedCall, AuthResponseError, AuthUiError, authFeedback } from './auth-client.mjs';
import './security.mjs';
import './patron.mjs';
import './keys.mjs';

const element = id => document.getElementById('nostr-' + id);
const labels = element('status')?.dataset;
let generated, pending, copyFeedback, copyTimer;
function clearCopyFeedback() {
  clearTimeout(copyTimer);
  if (!copyFeedback) return;
  const { button, label, minWidth } = copyFeedback;
  button.textContent = label;
  button.style.minInlineSize = minWidth;
  copyFeedback = undefined;
}
function showCopyFeedback(button) {
  clearCopyFeedback();
  copyFeedback = { button, label: button.textContent, minWidth: button.style.minInlineSize };
  button.style.minInlineSize = button.getBoundingClientRect().width + 'px';
  button.textContent = button.dataset.copied;
  copyTimer = setTimeout(clearCopyFeedback, 900);
}
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
  clearCopyFeedback();
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
async function exportKey(key, download = false, button) {
  const epoch = pageEpoch;
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
    status(labels.downloaded);
  } else {
    try { await navigator.clipboard.writeText(nsec); }
    catch { throw new AuthUiError(button.dataset.copyFailed); }
    if (epoch === pageEpoch) showCopyFeedback(button);
  }
}
async function exportSavedKey(download, button) {
  const key = await loadKey();
  if (!key) throw new AuthUiError(labels.noKey);
  try { await exportKey(key, download, button); } finally { key.fill(0); }
}
let busy = false;
function action(name, callback) {
  element(name).addEventListener('click', async () => {
    if (busy) return;
    busy = true; status('');
    const buttons = [...document.querySelectorAll('.auth-login button')];
    buttons.forEach(button => { button.disabled = true; });
    try { await callback(); }
    catch (error) { status(authFeedback(error, labels), true); }
    finally { busy = false; buttons.forEach(button => { button.disabled = false; }); }
  });
}
if (element('extension')) {
  action('extension', async () => {
    if (!window.nostr?.getPublicKey || !window.nostr?.signEvent) throw new AuthUiError(labels.needSigner);
    await signIn(window.nostr);
  });
  action('generate', () => {
    clearCopyFeedback(); resetFactor(); generated?.fill(0); generated = generateSecretKey();
    element('backup').value = nsecEncode(generated);
    element('backup').type = 'password';
    element('reveal').textContent = element('reveal').dataset.showKey;
    element('created').hidden = false;
    element('created').scrollIntoView({ block: 'nearest' });
    element('copy').focus();
  });
  action('reveal', () => {
    const hidden = element('backup').type === 'password';
    element('backup').type = hidden ? 'text' : 'password';
    element('reveal').textContent = hidden ? element('reveal').dataset.hideKey : element('reveal').dataset.showKey;
  });
  action('copy', async () => {
    if (!generated) throw new AuthUiError(labels.createFirst);
    await exportKey(generated, false, element('copy'));
  });
  action('download', async () => {
    if (!generated) throw new AuthUiError(labels.createFirst);
    await exportKey(generated, true);
  });
  action('copy-saved', () => exportSavedKey(false, element('copy-saved')));
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
      ? labels.granted
      : result === 'denied'
        ? labels.denied
        : labels.unsupported);
  });
  action('create-login', async () => {
    if (!generated) throw new AuthUiError(labels.createFirst);
    await signIn(localSigner(generated), generated);
  });
  action('import', async () => {
    let key;
    try {
      const decoded = decode(element('nsec').value.trim());
      if (decoded.type !== 'nsec') throw Error();
      key = decoded.data;
      getPublicKey(key);
    } catch { throw new AuthUiError(labels.badKey); }
    element('nsec').value = '';
    try { await signIn(localSigner(key), key); } finally { key.fill(0); }
  });
  action('use-saved', async () => {
    const key = await loadKey();
    if (!key) throw new AuthUiError(labels.noKey);
    try { await signIn(localSigner(key), key, false); } finally { key.fill(0); }
  });
  action('forget', async () => { resetFactor(); await forgetKey(); element('saved').hidden = true; status(labels.removed); });
  action('verify', async () => {
    if (!pending) return;
    const token = element('token').value.trim();
    if (!token) throw new AuthUiError(labels.enterCode);
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
    clearCopyFeedback();
    resetFactor();
    generated?.fill(0); generated = undefined;
    element('backup').value = '';
    element('nsec').value = '';
    element('created').hidden = true;
  });
  loadKey().then(key => { element('saved').hidden = !key; key?.fill(0); }).catch(() => {});
}
