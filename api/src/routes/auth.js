import { Router } from 'express';
import { rateLimit, ipKeyGenerator } from 'express-rate-limit';
import { signToken, verifyToken, safeEqual } from '../lib/token.js';

export const COOKIE = 'ukr_session';
const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

export function authRoutes(config) {
  const r = Router();
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'too_many_attempts' },
    // Cloudflare sets CF-Connecting-IP to the real client; X-Forwarded-For is client-controlled.
    keyGenerator: (req) => req.get('cf-connecting-ip') || ipKeyGenerator(req.ip),
    // trust proxy is deliberately `true` (Cloudflare -> Traefik -> pod).
    validate: { trustProxy: false },
  });

  r.post('/login', limiter, (req, res) => {
    const password = req.body?.password;
    if (typeof password !== 'string' || !safeEqual(password, config.appPassword)) {
      return res.status(401).json({ error: 'bad_password' });
    }
    res.cookie(COOKIE, signToken(config.sessionSecret, YEAR_MS), {
      httpOnly: true,
      sameSite: 'lax',
      secure: config.secureCookies,
      maxAge: YEAR_MS,
      path: '/',
    });
    res.json({ ok: true });
  });

  r.post('/logout', (req, res) => {
    res.clearCookie(COOKIE, { path: '/' });
    res.json({ ok: true });
  });

  return r;
}

export function requireAuth(config) {
  return (req, res, next) =>
    verifyToken(config.sessionSecret, req.cookies?.[COOKIE]) ? next() : res.status(401).json({ error: 'unauthorized' });
}
