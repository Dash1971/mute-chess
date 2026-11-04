import { getPublicKey, finalizeEvent } from 'nostr-tools/pure';
import { SimplePool } from 'nostr-tools/pool';
import { loadKey } from './key-store.mjs';
import { support, lnurl, invoiceDetails } from '../lightning.mjs';
import { call } from './auth-client.mjs';

const page = typeof document === 'undefined' ? null : document.getElementById('nostr-patron');
if (page) {
  const element = name => document.getElementById('patron-' + name);
  const status = text => { if (!settled) element('status').textContent = text; };
  const account = page.dataset.pubkey;
  const pool = new SimplePool();
  const seen = new Set(), pending = new Set(), dismissed = new Set();
  let subscription, invoice, expiry, reloadTimer, quote, busy = false, settled = false, generation = 0, presentation = 0;
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
        if (settled || current !== generation || seen.has(receipt.id)) return;
        seen.add(receipt.id);
        if (seen.size > 2000) seen.delete(seen.values().next().value);
        try {
          const request = JSON.parse(receipt.tags.find(t => t[0] === 'description')?.[1]);
          if (request.pubkey !== account) return;
          const paidInvoice = receipt.tags.find(t => t[0] === 'bolt11')?.[1];
          if (!pending.has(invoiceDetails(paidInvoice).paymentHash)) return;
          const result = await call('/club/patron/receipt', { receipt });
          if (!result.confirmed || settled || current !== generation) return;
          settled = true; generation++; clearTimeout(expiry); clearTimeout(reloadTimer); subscription?.close(); pool.destroy();
          element('payment').hidden = true;
          element('create').disabled = true;
          element('thanks').hidden = false;
          page.classList.add('payment-confirmed');
          element('status').textContent = page.dataset.paidStatus || 'Payment confirmed. Thank you!';
          reloadTimer = setTimeout(() => location.reload(), 2500);
        } catch { /* Ignore unrelated/untrusted relay data; only the server awards wings. */ }
      },
      onclose() {
        if (current !== generation) return;
        subscription = undefined;
        if (invoice && !settled) status('Connection lost. Use Check payment to reconnect.');
      },
    });
  }
  async function display(value) {
    if (settled) return;
    const details = invoiceDetails(value);
    if (dismissed.has(details.paymentHash)) return;
    const current = ++presentation;
    pending.add(details.paymentHash); invoice = value;
    element('payment').hidden = false;
    element('open').href = 'lightning:' + value;
    element('invoice-amount').textContent = `${(details.amountMsat / 1000).toLocaleString()} sats`;
    if (!subscription) watch();
    await showQr('LIGHTNING:' + value.toUpperCase());
    if (settled || current !== presentation || invoice !== value) return;
    clearTimeout(expiry);
    const remaining = (details.createdAt + details.expiresIn) * 1000 - Date.now();
    if (remaining <= 0) {
      element('payment').hidden = true; status('Invoice expired. Create a new invoice.');
    } else {
      status(page.dataset.waiting || 'Scan to pay. Waiting for payment…');
      const expire = () => {
        if (settled || current !== presentation || invoice !== value) return;
        const left = (details.createdAt + details.expiresIn) * 1000 - Date.now();
        if (left > 0) { expiry = setTimeout(expire, Math.min(left, 2147483647)); return; }
        element('payment').hidden = true;
        status('Invoice expired. Create a new invoice if you have not paid.');
      };
      expiry = setTimeout(expire, Math.min(remaining, 2147483647));
    }
  }
  async function dismiss() {
    if (busy || settled || !invoice) return;
    const value = invoice, paymentHash = invoiceDetails(value).paymentHash;
    busy = true;
    element('create').disabled = element('dismiss').disabled = true;
    try {
      const result = await call('/club/patron/dismiss', { paymentHash });
      if (settled || invoice !== value) return;
      if (!result.dismissed) throw Error();
      dismissed.add(paymentHash);
      invoice = undefined;
      presentation++;
      clearTimeout(expiry);
      element('payment').hidden = true;
      status(page.dataset.dismissed);
      // Keep receipt tracking: dismissing the prompt does not revoke the wallet invoice.
    } catch {
      if (!settled && invoice === value) status(page.dataset.dismissFailed);
    } finally {
      busy = false;
      element('create').disabled = element('dismiss').disabled = settled;
    }
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
  async function create() {
    if (busy || settled) return;
    busy = true; let key;
    element('create').disabled = true;
    try {
      status('Preparing donation…');
      const amount = await sats();
      if (amount < 1 || amount > 100000000) throw Error('Choose between 1 and 100,000,000 sats.');
      let signer = window.nostr;
      if (!signer?.getPublicKey || !signer?.signEvent) {
        key = await loadKey();
        if (!key) throw Error(page.dataset.signerNeeded || 'Please sign in again here to create an invoice.');
        signer = { getPublicKey: () => getPublicKey(key), signEvent: event => finalizeEvent(event, key) };
      }
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
    finally { key?.fill(0); busy = false; element('create').disabled = settled; }
  }
  if (account) {
    element('create').addEventListener('click', create);
    element('dismiss').addEventListener('click', dismiss);
    element('currency').addEventListener('change', () => {
      const usd = element('currency').value === 'USD';
      element('amount').value = usd ? '5' : '1000';
      element('amount').step = usd ? '0.01' : '1';
      element('amount').min = usd ? '0.01' : '1';
      void updateQuote();
    });
    element('amount').addEventListener('change', updateQuote);
    element('copy').addEventListener('click', () => {
      const value = invoice;
      if (value) void navigator.clipboard.writeText(value).then(() => { if (invoice === value) status('Invoice copied.'); });
    });
    element('check').addEventListener('click', () => { seen.clear(); status('Checking payment…'); watch(); });
    fetch('/club/patron/pending', { credentials: 'same-origin', headers: { Accept: 'application/json' } })
      .then(async r => {
        if (!r.ok) throw Error();
        return { values: await r.json(), paidAt: Number(r.headers.get('X-Mute-Patron-Paid-At')) || 0,
          hidden: (r.headers.get('X-Mute-Patron-Dismissed') || '').split(',') };
      })
      .then(({ values, paidAt, hidden }) => {
        if (settled) return;
        for (const value of values) pending.add(invoiceDetails(value).paymentHash);
        for (const hash of hidden) if (hash) dismissed.add(hash);
        if (invoice || busy) return;
        const current = values.find(value => {
          const details = invoiceDetails(value);
          return details.createdAt > paidAt && !dismissed.has(details.paymentHash);
        });
        if (current) return display(current);
        // Older invoices stay eligible for late receipts, without resurfacing a payment prompt.
        if (values.length && !subscription) watch();
      }).catch(() => { if (!settled && !invoice) status('Previous invoices could not be loaded. You can create a new one.'); });
  } else {
    element('open').href = 'lightning:' + lnurl;
    void showQr('LIGHTNING:' + lnurl.toUpperCase());
  }
  window.addEventListener('pagehide', () => { generation++; clearTimeout(expiry); clearTimeout(reloadTimer); subscription?.close(); pool.destroy(); }, { once: true });
}
