import { bech32 } from '@scure/base';
import { secp256k1 } from '@noble/curves/secp256k1.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, concatBytes, utf8ToBytes } from '@noble/hashes/utils.js';
import { verifyEvent } from 'nostr-tools/pure';

export const support = Object.freeze({
  address: 'dash@walletofsatoshi.com',
  endpoint: 'https://walletofsatoshi.com/.well-known/lnurlp/dash',
  npub: 'npub1w6l8e4mqa4ruqs2vdvwhdxhp9ke9ax8kpncy2wy26tja3d7rzpgq06c9jl',
  recipient: '76be7cd760ed47c0414c6b1d769ae12db25e98f60cf045388ad2e5d8b7c31050',
  issuer: 'be1d89794bf92de5dd64c1e60f6a2c70c140abac9932418fee30c5c637fe9479',
  relays: Object.freeze(['wss://relay.damus.io', 'wss://nos.lol', 'wss://relay.primal.net']),
});
export const lnurl = bech32.encode('lnurl', bech32.toWords(utf8ToBytes(support.endpoint)), 2048);
// Old server-issued invoices can still settle; new invoice requests use only lnurl.
const receiptLnurls = [lnurl, bech32.encode('lnurl', bech32.toWords(utf8ToBytes('https://walletofsatoshi.com/.well-known/lnurlp/eerieatlas700')), 2048)];
const hash = text => bytesToHex(sha256(utf8ToBytes(text)));
// BOLT-11 authenticates either the exact inline description or its hash.
const bindsDescription = (details, description) => details.descriptionHash === hash(description) || details.description === description;
const requireThat = (ok, message) => { if (!ok) throw Error(message); };
const oneTag = (event, name, required = true) => {
  const tags = event.tags.filter(t => t[0] === name);
  requireThat(tags.length === 1 || (!required && tags.length === 0), `Invalid ${name} tag`);
  if (!tags.length) return undefined;
  requireThat(tags[0].length === 2 && typeof tags[0][1] === 'string', `Invalid ${name} tag`);
  return tags[0][1];
};
const number = words => words.reduce((n, word) => n * 32 + word, 0);
function paddedBytes(words) {
  const result = new Uint8Array(Math.ceil(words.length * 5 / 8));
  let value = 0, bits = 0, index = 0;
  for (const word of words) {
    value = (value << 5) | word; bits += 5;
    if (bits >= 8) { bits -= 8; result[index++] = (value >>> bits) & 255; }
  }
  if (bits) result[index] = (value << (8 - bits)) & 255;
  return result;
}

// BOLT-11: checksum, currency, exact millisats, complete fields and ECDSA signature.
export function invoiceDetails(invoice) {
  requireThat(typeof invoice === 'string' && invoice.length <= 4096, 'Invalid Lightning invoice');
  const { prefix, words } = bech32.decode(invoice, 4096);
  const match = /^lnbc([1-9][0-9]*)([munp]?)$/.exec(prefix);
  requireThat(match && words.length >= 111, 'A Bitcoin Lightning amount is required');
  let amount = BigInt(match[1]);
  const unit = match[2];
  requireThat(unit !== 'p' || amount % 10n === 0n, 'Invalid fractional millisats');
  amount = unit === 'p' ? amount / 10n : amount * ({ '': 100000000000n, m: 100000000n, u: 100000n, n: 100n })[unit];
  requireThat(amount >= 1000n && amount <= 100000000000n, 'Lightning amount out of range');
  const data = words.slice(0, -104), signature = bech32.fromWords(words.slice(-104));
  const fields = new Map();
  for (let i = 7; i < data.length;) {
    requireThat(i + 3 <= data.length, 'Incomplete invoice field');
    const type = data[i], size = data[i + 1] * 32 + data[i + 2]; i += 3;
    requireThat(i + size <= data.length, 'Incomplete invoice field');
    if ([1, 16, 23, 19, 6, 13].includes(type)) {
      requireThat(!fields.has(type), 'Duplicate invoice field');
      fields.set(type, data.slice(i, i + size));
    }
    i += size;
  }
  for (const type of [1, 16]) requireThat(fields.get(type)?.length === 52, 'Missing invoice payment data');
  requireThat((fields.has(13) ? 1 : 0) + (fields.has(23) ? 1 : 0) === 1, 'Invalid invoice description');
  if (fields.has(23)) requireThat(fields.get(23).length === 52, 'Invalid description hash');
  if (fields.has(19)) requireThat(fields.get(19).length === 53, 'Invalid invoice payee');
  const digest = sha256(concatBytes(utf8ToBytes(prefix), paddedBytes(data)));
  requireThat(signature.length === 65 && signature[64] <= 3, 'Invalid invoice signature');
  const recovered = concatBytes(Uint8Array.of(signature[64]), signature.slice(0, 64));
  const payee = fields.has(19) ? bech32.fromWords(fields.get(19)) : secp256k1.recoverPublicKey(recovered, digest, { prehash: false });
  requireThat(secp256k1.verify(signature.slice(0, 64), digest, payee, { prehash: false, lowS: fields.has(19) }), 'Invalid invoice signature');
  return {
    amountMsat: Number(amount), paymentHash: bytesToHex(bech32.fromWords(fields.get(1))),
    descriptionHash: fields.has(23) ? bytesToHex(bech32.fromWords(fields.get(23))) : undefined,
    description: fields.has(13) ? new TextDecoder('utf-8', { fatal: true }).decode(bech32.fromWords(fields.get(13))) : undefined,
    createdAt: number(data.slice(0, 7)), expiresIn: fields.has(6) ? number(fields.get(6)) : 3600,
  };
}

export function validateZapRequest(event, now = Math.floor(Date.now() / 1000), allowedLnurls = [lnurl]) {
  requireThat(event?.kind === 9734 && JSON.stringify(event).length <= 8000 && verifyEvent(event), 'A signed Nostr zap request is required');
  requireThat(Math.abs(now - event.created_at) <= 300, 'Zap request expired');
  requireThat(oneTag(event, 'p') === support.recipient && allowedLnurls.includes(oneTag(event, 'lnurl')), 'Wrong donation recipient');
  requireThat(!event.tags.some(t => ['e', 'a'].includes(t[0])), 'Use a profile zap for patron wings');
  const amount = oneTag(event, 'amount');
  requireThat(/^[1-9][0-9]{0,11}$/.test(amount) && Number(amount) >= 1000 && Number(amount) <= 100000000000 && Number(amount) % 1000 === 0, 'Choose a whole-satoshi amount');
  const relays = event.tags.filter(t => t[0] === 'relays');
  requireThat(relays.length === 1 && relays[0].length === support.relays.length + 1 && support.relays.every(r => relays[0].includes(r)), 'Use the configured receipt relays');
  return Number(amount);
}

export function validateZapReceipt(receipt, now = Math.floor(Date.now() / 1000), issuer = support.issuer) {
  requireThat(receipt?.kind === 9735 && JSON.stringify(receipt).length <= 16000 && receipt.pubkey === issuer && verifyEvent(receipt), 'Untrusted payment receipt');
  requireThat(receipt.created_at <= now + 300 && receipt.created_at > now - 30 * 86400, 'Payment receipt expired');
  requireThat(oneTag(receipt, 'p') === support.recipient, 'Wrong payment recipient');
  const description = oneTag(receipt, 'description'), rawInvoice = oneTag(receipt, 'bolt11');
  const request = JSON.parse(description), details = invoiceDetails(rawInvoice);
  const invoice = rawInvoice.toLowerCase();
  // Validate the exact original signed request at its own creation time. The native
  // ledger must additionally match this invoice to one fetched from our wallet.
  const amount = validateZapRequest(request, request.created_at, receiptLnurls);
  requireThat(bindsDescription(details, description) && details.amountMsat === amount, 'Receipt invoice does not match its zap request');
  requireThat(receipt.created_at >= request.created_at - 300 && details.createdAt >= request.created_at - 300 && details.createdAt <= request.created_at + 300, 'Invalid payment timestamps');
  const sender = oneTag(receipt, 'P', false);
  requireThat(!sender || sender === request.pubkey, 'Wrong payment sender');
  const preimage = oneTag(receipt, 'preimage', false);
  if (preimage) {
    requireThat(/^[a-f0-9]{64}$/.test(preimage), 'Invalid payment preimage');
    const bytes = Uint8Array.from(preimage.match(/../g), h => parseInt(h, 16));
    requireThat(bytesToHex(sha256(bytes)) === details.paymentHash, 'Wrong payment preimage');
  }
  return { ...details, invoice, donor: request.pubkey, requestId: request.id, receiptId: receipt.id, paidAt: receipt.created_at };
}

// Keep client messages actionable without exposing provider payloads or request data.
export class InvoiceError extends Error {
  constructor(status, code, publicMessage, cause) {
    super(cause?.message ?? publicMessage, { cause });
    this.name = 'InvoiceError';
    this.status = status;
    this.code = code;
    this.publicMessage = publicMessage;
  }
}

async function readJson(url, fetcher, stage) {
  let response;
  try {
    response = await fetcher(url, { redirect: 'error', signal: AbortSignal.timeout(6000), headers: { Accept: 'application/json' } });
  } catch (cause) {
    throw new InvoiceError(503, `lightning_${stage}_unavailable`, 'The Lightning provider could not be reached. Please try again.', cause);
  }
  if (!response.ok) throw new InvoiceError(503, `lightning_${stage}_unavailable`, 'The Lightning provider is temporarily unavailable. Please try again.');
  let data;
  try {
    let text = '';
    const decoder = new TextDecoder();
    for await (const chunk of response.body) {
      text += decoder.decode(chunk, { stream: true });
      requireThat(text.length <= 16000, 'Lightning response too large');
    }
    text += decoder.decode();
    data = JSON.parse(text);
  } catch (cause) {
    const network = cause?.name === 'TimeoutError' || cause?.name === 'AbortError' || cause?.cause?.code;
    throw new InvoiceError(network ? 503 : 502, `lightning_${stage}_${network ? 'unavailable' : 'invalid'}`,
      network ? 'The Lightning provider did not finish responding. Please try again.' : 'The Lightning provider returned an unreadable response. Please try again later.', cause);
  }
  if (data?.status === 'ERROR') throw new InvoiceError(503, `lightning_${stage}_rejected`, 'The Lightning provider could not create an invoice. Please try again later.');
  return data;
}

export async function createZapInvoice(request, fetcher = fetch, now = Math.floor(Date.now() / 1000)) {
  let amount;
  try { amount = validateZapRequest(request, now); }
  catch (cause) {
    const expired = cause.message === 'Zap request expired';
    throw new InvoiceError(400, expired ? 'lightning_request_expired' : 'lightning_request_invalid',
      expired ? 'Your signed donation request has expired. Check your device clock, then try again.' : 'The signed donation request could not be verified. Refresh this page and try again.', cause);
  }
  const description = JSON.stringify(request);
  try {
    const meta = await readJson(support.endpoint, fetcher, 'metadata');
    requireThat(meta.tag === 'payRequest' && meta.allowsNostr === true && meta.nostrPubkey === support.issuer, 'Lightning provider identity changed');
    requireThat(amount >= meta.minSendable && amount <= meta.maxSendable, 'Amount outside wallet limits');
    const callback = new URL(meta.callback);
    requireThat(callback.protocol === 'https:' && ['livingroomofsatoshi.com', 'walletofsatoshi.com'].includes(callback.hostname) && !callback.port && !callback.username && !callback.password, 'Unexpected Lightning callback');
    callback.searchParams.set('amount', String(amount));
    callback.searchParams.set('nostr', description);
    callback.searchParams.set('lnurl', lnurl);
    const data = await readJson(callback, fetcher, 'invoice');
    requireThat(typeof data.pr === 'string', 'Missing Lightning invoice');
    const details = invoiceDetails(data.pr), invoice = data.pr.toLowerCase();
    requireThat(details.amountMsat === amount && bindsDescription(details, description), 'Lightning invoice does not match the requested donation');
    requireThat(details.createdAt >= now - 60 && details.createdAt <= now + 300 && details.expiresIn > 0 && details.expiresIn <= 30 * 86400, 'Invalid invoice expiry');
    return { ...details, invoice, donor: request.pubkey, requestId: request.id };
  } catch (cause) {
    if (cause instanceof InvoiceError) throw cause;
    throw new InvoiceError(502, 'lightning_invoice_unverified', 'The Lightning provider returned an invoice that could not be verified. Please try again later.', cause);
  }
}
