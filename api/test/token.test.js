import { describe, it, expect } from 'vitest';
import { signToken, verifyToken, safeEqual } from '../src/lib/token.js';

describe('token', () => {
  it('round-trips before expiry', () => {
    const t = signToken('s', 1000, 0);
    expect(verifyToken('s', t, 999)).toBe(true);
  });
  it('rejects after expiry', () => {
    expect(verifyToken('s', signToken('s', 1000, 0), 1000)).toBe(false);
  });
  it('rejects a different secret', () => {
    expect(verifyToken('other', signToken('s', 1000, 0), 1)).toBe(false);
  });
  it('rejects tampered payloads and garbage', () => {
    const [, sig] = signToken('s', 1000, 0).split('.');
    const forged = Buffer.from(JSON.stringify({ exp: 9e15 })).toString('base64url') + '.' + sig;
    expect(verifyToken('s', forged, 1)).toBe(false);
    for (const bad of [undefined, '', 'x', 'a.b', '..', 42]) expect(verifyToken('s', bad, 1)).toBe(false);
  });
  it('safeEqual compares strings of any length', () => {
    expect(safeEqual('abc', 'abc')).toBe(true);
    expect(safeEqual('abc', 'abcd')).toBe(false);
  });
});
