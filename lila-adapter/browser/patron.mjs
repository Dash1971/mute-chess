import { getPublicKey, finalizeEvent } from 'nostr-tools/pure';
import { SimplePool } from 'nostr-tools/pool';
import { loadKey } from './key-store.mjs';
import { support, lnurl, invoiceDetails } from '../lightning.mjs';
import { call } from './auth-client.mjs';

const page = typeof document === 'undefined' ? null : document.getElementById('nostr-patron');
if (page) {
  const element = name => document.getElementById('patron-' + name);
  const status = text => { element('status').textContent = text; };
  const account = page.dataset.pubkey;
  const pool = new SimplePool();
  const seen = new Set(), pending = new Set();
  let subscription, invoice, expiry, quote, busy = false, settled = false, generation = 0;
  async function showQr(value) {
    element('qr').hidden = true;
    element('qr').dataset.qrUrl = value;
    await site.asset.loadEsm('bits.qrcode');
    element('qr').hidden = false;
  }
  function watch() {
    const current = ++generation;
    subscription?.close();
    subscription = pool.subscribeMany(support.relays, {
      kinds: [9735], authors: [support.issuer], '#p': [support.recipient],
      since: Math.floor(Date.now() / 1000) - 30 * 86400, limit: 200,
    }, {
      async onevent(receipt) {
        if (seen.has(receipt.id)) return;
        seen.add(receipt.id);
        if (seen.size > 2000) seen.delete(seen.values().next().value);
        try {
          const request = JSON.parse(receipt.tags.find(t => t[0] === 'description')?.[1]);
          if (request.pubkey !== account) return;
          const paidInvoice = receipt.tags.find(t => t[0] === 'bolt11')?.[1];
          if (!pending.has(invoiceDetails(paidInvoice).paymentHash)) return;
          const result = await call('/club/patron/receipt', { receipt });
          if (!result.confirmed) return;
          settled = true; clearTimeout(expiry); subscription?.close(); pool.destroy();
          status('Payment confirmed. Thank you! Your patron wings are active.');
          location.reload();
        } catch { /* Ignore unrelated/untrusted relay data; only the server awards wings. */ }
      },
      onclose() { if (invoice && !settled && current === generation) status('Receipt relays disconnected. Use Check payment to reconnect.'); },
    });
  }
  async function display(value) {
    const details = invoiceDetails(value);
    pending.add(details.paymentHash); invoice = value;
    element('payment').hidden = false;
    element('open').href = 'lightning:' + value;
    element('invoice-amount').textContent = `${(details.amountMsat / 1000).toLocaleString()} sats · ${support.address}`;
    await showQr('LIGHTNING:' + value.toUpperCase());
    clearTimeout(expiry);
    const remaining = (details.createdAt + details.expiresIn) * 1000 - Date.now();
    if (remaining <= 0) {
      element('payment').hidden = true; status('Invoice expired. Create a new invoice.');
    } else {
      status('Scan to pay. Waiting for the wallet’s signed payment receipt…');
      const expire = () => {
        const left = (details.createdAt + details.expiresIn) * 1000 - Date.now();
        if (left > 0) { expiry = setTimeout(expire, Math.min(left, 2147483647)); return; }
        element('payment').hidden = true;
        status('Invoice expired. Create a new invoice if you have not paid.');
      };
      expiry = setTimeout(expire, Math.min(remaining, 2147483647));
    }
    watch();
  }
  async function sats() {
    const amount = Number(element('amount').value);
    if (!Number.isFinite(amount) || amount <= 0) throw Error('Enter a positive amount.');
    if (element('currency').value === 'USD') {
      if (!quote || Date.now() - quote.at > 60000) {
        const response = await fetch('https://mempool.space/api/v1/prices', { signal: AbortSignal.timeout(8000) });
        if (!response.ok) throw Error('USD quote unavailable. You can choose satoshis instead.');
        const prices = await response.json();
        if (!(prices.USD > 0) || Math.abs(Date.now() / 1000 - prices.time) > 900) throw Error('USD quote is stale. Choose satoshis instead.');
        quote = { usd: prices.USD, at: Date.now() };
      }
      return Math.max(1, Math.round(amount / quote.usd * 100000000));
    }
    if (!Number.isSafeInteger(amount)) throw Error('Enter a whole number of satoshis.');
    return amount;
  }
  async function updateQuote() {
    try {
      const amount = await sats();
      element('quote').textContent = element('currency').value === 'USD'
        ? `Approximately ${amount.toLocaleString()} sats. The invoice fixes the Bitcoin amount.` : '';
    } catch (error) { element('quote').textContent = error.message; }
  }
  async function create(saved) {
    if (busy) return;
    busy = true; let key;
    for (const id of ['create', 'saved']) element(id).disabled = true;
    try {
      status('Preparing donation…');
      const amount = await sats();
      if (amount < 1 || amount > 100000000) throw Error('Choose between 1 and 100,000,000 sats.');
      let signer = window.nostr;
      if (saved) {
        key = await loadKey();
        if (!key) throw Error('No key is saved in this browser. Use a NIP-07 signer.');
        signer = { getPublicKey: () => getPublicKey(key), signEvent: event => finalizeEvent(event, key) };
      }
      if (!signer?.getPublicKey || !signer?.signEvent) throw Error('Enable a NIP-07 browser signer, then try again.');
      if (await signer.getPublicKey() !== account) throw Error('Use the Nostr key for your signed-in account.');
      const request = await signer.signEvent({ kind: 9734, created_at: Math.floor(Date.now() / 1000),
        content: 'Support Mute Chess', tags: [
          ['p', support.recipient], ['amount', String(amount * 1000)], ['lnurl', lnurl], ['relays', ...support.relays],
        ] });
      const result = await call('/club/patron/invoice', { request });
      const details = invoiceDetails(result.invoice);
      if (details.amountMsat !== amount * 1000) throw Error('The invoice amount does not match your donation.');
      await display(result.invoice);
    } catch (error) { status(error.message || 'Could not create a Lightning invoice.'); }
    finally { key?.fill(0); busy = false; for (const id of ['create', 'saved']) element(id).disabled = false; }
  }
  if (account) {
    element('create').addEventListener('click', () => create(false));
    element('saved').addEventListener('click', () => create(true));
    element('currency').addEventListener('change', () => {
      const usd = element('currency').value === 'USD';
      element('amount').value = usd ? '5' : '1000';
      element('amount').step = usd ? '0.01' : '1';
      element('amount').min = usd ? '0.01' : '1';
      void updateQuote();
    });
    element('amount').addEventListener('change', updateQuote);
    element('copy').addEventListener('click', () => navigator.clipboard.writeText(invoice).then(() => status('Invoice copied.')));
    element('check').addEventListener('click', () => { seen.clear(); status('Checking for a signed payment receipt…'); watch(); });
    loadKey().then(key => { element('saved').hidden = !key; key?.fill(0); }).catch(() => {});
    fetch('/club/patron/pending', { credentials: 'same-origin', headers: { Accept: 'application/json' } })
      .then(r => { if (!r.ok) throw Error(); return r.json(); })
      .then(values => {
        for (const value of values) pending.add(invoiceDetails(value).paymentHash);
        if (values.length) return display(values[0]);
      }).catch(() => status('Previous invoices could not be loaded. You can create a new one.'));
  } else {
    element('open').href = 'lightning:' + lnurl;
    void showQr('LIGHTNING:' + lnurl.toUpperCase());
  }
  window.addEventListener('pagehide', () => { generation++; clearTimeout(expiry); subscription?.close(); pool.destroy(); }, { once: true });
}
