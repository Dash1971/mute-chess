import { createHash, randomBytes } from 'node:crypto';
import { verifyEvent } from 'nostr-tools/pure';

export const digest = value => createHash('sha256').update(value).digest('hex');
export class AdapterError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const reject = message => { throw new AdapterError(401, message); };

export class NostrAuth {
  challenges = new Map();
  constructor(origin, now = Date.now) { this.origin = origin; this.now = now; }
  challenge(pubkey, action = 'login') {
    if (!['login', 'enable-two-factor', 'disable-two-factor'].includes(action))
      throw new AdapterError(400, 'Invalid authentication action');
    if (typeof pubkey !== 'string' || !/^[a-f0-9]{64}$/.test(pubkey))
      throw new AdapterError(400, 'Invalid Nostr public key');
    const now = this.now();
    for (const [key, value] of this.challenges) if (value.expires <= now) this.challenges.delete(key);
    if (this.challenges.size >= 1024) throw new AdapterError(429, 'Too many pending sign-ins');
    const challenge = randomBytes(32).toString('hex');
    this.challenges.set(challenge, { pubkey, action, expires: now + 60000 });
    return { challenge, expiresIn: 60, url: this.origin + (action === 'login' ? '/club/login' : '/club/security'), method: 'POST' };
  }
  verify(authorization, rawBody) {
    try {
      if (typeof rawBody !== 'string' || rawBody.length > 4096 ||
          typeof authorization !== 'string' || !authorization.startsWith('Nostr ') || authorization.length > 8000)
        reject('Signed authentication required');
      const body = JSON.parse(rawBody);
      if (!body || typeof body !== 'object' || Array.isArray(body) ||
          Object.keys(body).some(key => !['challenge', 'username', 'twoFactorToken', 'action', 'secret'].includes(key)) ||
          !/^[0-9a-f]{64}$/.test(body.challenge) ||
          (body.username !== undefined && (typeof body.username !== 'string' || body.username.length > 20)) ||
          (body.twoFactorToken !== undefined && (typeof body.twoFactorToken !== 'string' || body.twoFactorToken.length > 64)) ||
          (body.secret !== undefined && (typeof body.secret !== 'string' || !/^[A-Z2-7]{32}$/.test(body.secret))))
        reject('Invalid login payload');
      const event = JSON.parse(Buffer.from(authorization.slice(6), 'base64').toString('utf8'));
      const challenge = this.challenges.get(body.challenge);
      if (!challenge || challenge.expires <= this.now()) reject('Challenge expired or already used');
      if ((body.action ?? 'login') !== challenge.action) reject('Authentication action mismatch');
      if (challenge.action === 'login' && body.secret !== undefined) reject('Invalid login payload');
      const path = challenge.action === 'login' ? '/club/login' : '/club/security';
      if (!event || !Array.isArray(event.tags) || event.tags.length > 8) reject('Invalid signed event');
      const tag = name => {
        const found = event.tags.filter(t => Array.isArray(t) && t[0] === name);
        if (found.length !== 1 || found[0].length !== 2 || typeof found[0][1] !== 'string') reject('Invalid authentication tags');
        return found[0][1];
      };
      if (event.pubkey !== challenge.pubkey || event.kind !== 27235 || event.content !== '' ||
          !Number.isInteger(event.created_at) || Math.abs(event.created_at - this.now() / 1000) > 60 ||
          tag('u') !== this.origin + path || tag('method') !== 'POST' ||
          tag('challenge') !== body.challenge || tag('payload') !== digest(rawBody) || !verifyEvent(event))
        reject('Invalid or expired signature');
      // This synchronous consume happens before returning to any await boundary.
      this.challenges.delete(body.challenge);
      return { pubkey: event.pubkey, ...(challenge.action === 'login' ? {} : { action: challenge.action }) };
    } catch (error) {
      if (error instanceof AdapterError) throw error;
      reject('Invalid signed authentication');
    }
  }
}
