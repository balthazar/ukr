import crypto from 'node:crypto';

const hmac = (secret, data) => crypto.createHmac('sha256', secret).update(data).digest();

export function signToken(secret, ttlMs, nowMs = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ exp: nowMs + ttlMs })).toString('base64url');
  return `${payload}.${hmac(secret, payload).toString('base64url')}`;
}

export function verifyToken(secret, token, nowMs = Date.now()) {
  if (typeof token !== 'string') return false;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return false;
  const expected = hmac(secret, payload);
  const given = Buffer.from(sig, 'base64url');
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return false;
  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString()).exp > nowMs;
  } catch {
    return false;
  }
}

// Hash first so inputs of different lengths still compare in constant time.
export function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}
