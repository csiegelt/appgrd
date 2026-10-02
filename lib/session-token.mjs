import { createHmac, timingSafeEqual } from 'node:crypto';

// Serverless instances share a signing secret, not in-memory login state.
// Tokens contain only an opaque session ID, an expiry and the app origin.
export function sessionTokens({ secret, origin, now = Date.now }) {
  const signature = value => createHmac('sha256', secret).update('appgrd-session-v1.' + value).digest('base64url');
  function issue(session) {
    const payload = Buffer.from(JSON.stringify({ v: 1, id: session.id, exp: session.expires, aud: origin })).toString('base64url');
    return payload + '.' + signature(payload);
  }
  function verify(token) {
    if (typeof token !== 'string' || token.length > 1024) return null;
    const parts = token.split('.');
    if (parts.length !== 2 || !parts.every(part => /^[A-Za-z0-9_-]+$/.test(part))) return null;
    const expected = Buffer.from(signature(parts[0])), provided = Buffer.from(parts[1]);
    if (provided.length !== expected.length || !timingSafeEqual(expected, provided)) return null;
    try {
      const value = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
      if (value.v !== 1 || value.aud !== origin || !/^[A-Za-z0-9_-]{43}$/.test(value.id) || !Number.isSafeInteger(value.exp) || value.exp <= now() || value.exp > now() + 8 * 3600000) return null;
      return { id: value.id, expires: value.exp };
    } catch { return null; }
  }
  return { issue, verify };
}
