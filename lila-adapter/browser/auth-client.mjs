export async function call(path, data, authorization) {
  const response = await fetch(path, { method: 'POST', credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(authorization ? { Authorization: authorization } : {}) },
    body: typeof data === 'string' ? data : JSON.stringify(data), signal: AbortSignal.timeout(15000) });
  const result = await response.json();
  if (!response.ok) {
    const error = Error(result.error || 'Authentication is temporarily unavailable');
    error.code = result.code;
    throw error;
  }
  return result;
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
