export class AuthResponseError extends Error {
  constructor(message, code, status) { super(message); this.code = code; this.status = status; }
}
// Only catalog messages rendered by the page or returned by the native name validator are shown verbatim.
export class AuthUiError extends Error {}
export function authFeedback(error, labels) {
  if (error instanceof AuthUiError) return error.message;
  if (!(error instanceof AuthResponseError)) return labels.failure;
  if (error.status === 429) return labels.busy;
  if (error.code === 'invalid_factor') return labels.invalidCode;
  if (error.code === 'invalid_name') return labels.badName;
  if (error.code === 'wrong_signer') return labels.wrongSigner;
  if (error.code === 'reserved_public_name') return error.message;
  if (error.status === 409) return labels.nameUnavailable ?? labels.reload;
  return labels.failure;
}
export async function call(path, data, authorization) {
  const response = await fetch(path, { method: 'POST', credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(authorization ? { Authorization: authorization } : {}) },
    body: typeof data === 'string' ? data : JSON.stringify(data), signal: AbortSignal.timeout(15000) });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new AuthResponseError(result.error || 'Authentication is temporarily unavailable', result.code, response.status);
  }
  return response.json();
}
export async function signedCall(signer, action, fields = {}) {
  const pubkey = await signer.getPublicKey();
  const challenge = await call('/club/challenge', { pubkey, action });
  const body = JSON.stringify({ challenge: challenge.challenge, ...(action === 'login' ? {} : { action }), ...fields });
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(body));
  const payload = Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('');
  const event = await signer.signEvent({ kind: 27235, created_at: Math.floor(Date.now() / 1000), content: '', tags: [
    ['u', challenge.url], ['method', 'POST'], ['challenge', challenge.challenge], ['payload', payload],
  ] });
  return call(action === 'login' ? '/club/login' : '/club/security', body, 'Nostr ' + btoa(JSON.stringify(event)));
}
