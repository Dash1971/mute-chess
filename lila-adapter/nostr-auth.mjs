import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { verifyEvent } from 'nostr-tools/pure';

export const digest = value => createHash('sha256').update(value).digest('hex');
export class AdapterError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const reject = message => { throw new AdapterError(401, message); };

const actions = ['login', 'enable-two-factor', 'disable-two-factor'];
const lifetimeMs = 60_000;
const maxSpentPerBucket = 256;

function challengeMac(key, prefix, pubkey) {
  return createHmac('sha256', key).update(prefix).update(pubkey).digest().subarray(0, 16);
}

export class NostrAuth {
  // Only successful proofs occupy replay storage. Independent keys keep rollover local to one bucket.
  #buckets = Array.from({ length: 256 }, () => ({ key: randomBytes(32), spent: new Map() }));

  #lastTime = 0;
  #nonce;
  constructor(origin, now = Date.now, nonce = randomBytes) {
    this.origin = origin;
    this.now = now;
    this.#nonce = nonce;
  }
  #time() {
    // A backwards wall-clock adjustment must never revive an expired proof.
    this.#lastTime = Math.max(this.#lastTime, this.now());
    return this.#lastTime;
  }
  challenge(pubkey, action = 'login') {
    const actionId = actions.indexOf(action);
    if (actionId < 0) throw new AdapterError(400, 'Invalid authentication action');
    if (typeof pubkey !== 'string' || !/^[a-f0-9]{64}$/.test(pubkey))
      throw new AdapterError(400, 'Invalid Nostr public key');
    // 9 random bytes (the first selects a bucket), 1 action byte and 6 timestamp bytes.
    const prefix = this.#nonce(16);
    prefix[9] = actionId;
    prefix.writeUIntBE(this.#time(), 10, 6);
    const mac = challengeMac(this.#buckets[prefix[0]].key, prefix, pubkey);
    const challenge = Buffer.concat([prefix, mac]).toString('hex');
    return { challenge, expiresIn: lifetimeMs / 1000, url: this.origin + (action === 'login' ? '/club/login' : '/club/security'), method: 'POST' };
  }

  #consume(bucket, challenge, expires, now) {
    if (bucket.spent.size >= maxSpentPerBucket) {
      for (const [token, until] of bucket.spent) if (until <= now) bucket.spent.delete(token);
      if (bucket.spent.size >= maxSpentPerBucket) {
        // Invalidate this generation before forgetting any unexpired proof, including this one.
        bucket.key = randomBytes(32);
        bucket.spent.clear();
        return;
      }
    }
    bucket.spent.set(challenge, expires);
  }

  verify(authorization, rawBody) {
    try {
      if (typeof rawBody !== 'string' || rawBody.length > 4096 ||
          typeof authorization !== 'string' || !authorization.startsWith('Nostr ') || authorization.length > 8000)
        reject('Signed authentication required');
      const body = JSON.parse(rawBody);
      if (!body || typeof body !== 'object' || Array.isArray(body) ||
          Object.keys(body).some(key => !['challenge', 'username', 'twoFactorToken', 'action', 'secret'].includes(key)) ||
          typeof body.challenge !== 'string' || !/^[0-9a-f]{64}$/.test(body.challenge) ||
          (body.username !== undefined && (typeof body.username !== 'string' || body.username.length > 20)) ||
          (body.twoFactorToken !== undefined && (typeof body.twoFactorToken !== 'string' || body.twoFactorToken.length > 64)) ||
          (body.secret !== undefined && (typeof body.secret !== 'string' || !/^[A-Z2-7]{32}$/.test(body.secret))))
        reject('Invalid login payload');
      const event = JSON.parse(Buffer.from(authorization.slice(6), 'base64').toString('utf8'));
      if (!event || typeof event.pubkey !== 'string' || !/^[a-f0-9]{64}$/.test(event.pubkey) ||
          !Array.isArray(event.tags) || event.tags.length > 8) reject('Invalid signed event');
      const token = Buffer.from(body.challenge, 'hex');
      const bucket = this.#buckets[token[0]];
      const now = this.#time();
      const issued = token.readUIntBE(10, 6);
      const expires = issued + lifetimeMs;
      if (issued > now || expires <= now || bucket.spent.has(body.challenge)) reject('Challenge expired or already used');
      if (!timingSafeEqual(token.subarray(16), challengeMac(bucket.key, token.subarray(0, 16), event.pubkey)))
        reject('Invalid challenge');
      const action = actions[token[9]];
      if ((body.action ?? 'login') !== action) reject('Authentication action mismatch');
      if (action === 'login' && body.secret !== undefined) reject('Invalid login payload');
      const path = action === 'login' ? '/club/login' : '/club/security';
      const tag = name => {
        const found = event.tags.filter(t => Array.isArray(t) && t[0] === name);
        if (found.length !== 1 || found[0].length !== 2 || typeof found[0][1] !== 'string') reject('Invalid authentication tags');
        return found[0][1];
      };
      if (event.kind !== 27235 || event.content !== '' ||
          !Number.isInteger(event.created_at) || Math.abs(event.created_at - now / 1000) > 60 ||
          tag('u') !== this.origin + path || tag('method') !== 'POST' ||
          tag('challenge') !== body.challenge || tag('payload') !== digest(rawBody) || !verifyEvent(event))
        reject('Invalid or expired signature');
      // This synchronous consume happens before returning to any await boundary.
      this.#consume(bucket, body.challenge, expires, now);
      return { pubkey: event.pubkey, ...(action === 'login' ? {} : { action }) };
    } catch (error) {
      if (error instanceof AdapterError) throw error;
      reject('Invalid signed authentication');
    }
  }
}
