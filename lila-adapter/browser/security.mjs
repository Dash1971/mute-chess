import { getPublicKey, finalizeEvent } from 'nostr-tools/pure';
import { loadKey } from './key-store.mjs';
import { signedCall } from './auth-client.mjs';

export function encodeSecret(bytes) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0, value = 0, text = '';
  for (const byte of bytes) {
    value = (value << 8) | byte; bits += 8;
    while (bits >= 5) { bits -= 5; text += alphabet[(value >>> bits) & 31]; }
  }
  if (bits) text += alphabet[(value << (5 - bits)) & 31];
  return text;
}
const page = typeof document === 'undefined' ? null : document.getElementById('nostr-security');
if (page) {
  const element = id => document.getElementById('nostr-security-' + id);
  let secret, busy = false;
  const enabled = page.dataset.enabled === 'true';
  element('setup')?.addEventListener('click', async () => {
    if (secret) return;
    const bytes = crypto.getRandomValues(new Uint8Array(20));
    secret = encodeSecret(bytes); bytes.fill(0);
    element('secret').textContent = secret;
    const uri = `otpauth://totp/${encodeURIComponent('Mute Chess:' + page.dataset.account)}?secret=${secret}&issuer=Mute%20Chess&algorithm=SHA1&digits=6&period=30`;
    element('qr').dataset.qrUrl = uri;
    element('enroll').hidden = false;
    element('setup').hidden = true;
    try { await site.asset.loadEsm('bits.qrcode'); }
    catch { element('status').textContent = 'Enter the setup key manually in your authenticator.'; }
    element('token').focus();
  });
  const submit = async saved => {
    if (busy) return;
    busy = true;
    const buttons = [...page.querySelectorAll('button')];
    buttons.forEach(b => { b.disabled = true; });
    let key;
    try {
      element('status').textContent = '';
      let signer = window.nostr;
      if (saved) {
        key = await loadKey();
        if (!key) throw Error('No key is saved in this browser. Use your browser signer.');
        signer = { getPublicKey: () => getPublicKey(key), signEvent: event => finalizeEvent(event, key) };
      }
      if (!signer?.getPublicKey || !signer?.signEvent) throw Error('Enable your NIP-07 browser signer, then try again.');
      const token = element('token').value.trim();
      if (!token) throw Error('Enter your authenticator or recovery code.');
      const result = await signedCall(signer, enabled ? 'disable-two-factor' : 'enable-two-factor', {
        twoFactorToken: token, ...(!enabled ? { secret } : {}),
      });
      element('token').value = '';
      secret = undefined;
      element('secret').textContent = '';
      element('qr').removeAttribute('data-qr-url');
      element('enroll').hidden = true;
      element('disable')?.setAttribute('hidden', '');
      element('state').textContent = result.enabled ? 'Two-factor authentication is enabled.' : 'Two-factor authentication is disabled.';
      if (result.enabled) {
        element('codes').value = result.recoveryCodes.join('\n');
        element('recovery').hidden = false;
        element('status').textContent = 'Save these one-time recovery codes now. They are shown only once. Other sessions have been signed out.';
      } else {
        element('status').textContent = 'Other sessions have been signed out.';
        element('done').hidden = false;
      }
    } catch (error) { element('status').textContent = error.message || 'Security settings could not be changed.'; }
    finally { key?.fill(0); busy = false; buttons.forEach(b => { b.disabled = false; }); }
  };
  for (const method of ['extension', 'saved']) {
    page.querySelectorAll(`[data-security-signer="${method}"]`).forEach(button => button.addEventListener('click', () => submit(method === 'saved')));
  }
  loadKey().then(key => {
    page.querySelectorAll('[data-security-signer="saved"]').forEach(button => { button.hidden = !key; }); key?.fill(0);
  }).catch(() => {});
}
