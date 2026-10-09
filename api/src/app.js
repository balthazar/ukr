import path from 'node:path';
import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import { errorHandler } from './lib/http.js';
import { authRoutes, requireAuth } from './routes/auth.js';
import { wordRoutes } from './routes/words.js';
import { reviewRoutes } from './routes/review.js';
import { statsRoutes } from './routes/stats.js';
import { youtubeRoutes } from './routes/youtube.js';
import { videoRoutes } from './routes/videos.js';

const CSP = {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'", 'https://www.youtube.com', 'https://s.ytimg.com'],
  frameSrc: ['https://www.youtube.com', 'https://www.youtube-nocookie.com'],
  imgSrc: ["'self'", 'data:', 'https://i.ytimg.com', 'https://yt3.ggpht.com'],
  mediaSrc: ["'self'", 'blob:', 'https://upload.wikimedia.org'],
  connectSrc: ["'self'"],
  styleSrc: ["'self'", "'unsafe-inline'"],
  upgradeInsecureRequests: null,
};

export function createApp({ config, yt = null, now = () => new Date() }) {
  const app = express();
  // Cloudflare -> Traefik -> pod: trust X-Forwarded-For so req.ip is the client.
  app.set('trust proxy', true);
  app.disable('x-powered-by');
  // YouTube embeds need a Referer; helmet's default is no-referrer.
  app.use(helmet({ contentSecurityPolicy: { directives: CSP }, referrerPolicy: { policy: 'strict-origin-when-cross-origin' } }));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  app.get('/health', (req, res) => {
    const up = mongoose.connection.readyState === 1;
    res.status(up ? 200 : 503).json({ ok: up });
  });

  app.use('/api', authRoutes(config));
  app.use('/api', requireAuth(config));
  app.get('/api/me', (req, res) => res.json({ ok: true }));
  // ROUTES: protected routers are mounted below by later tasks.
  app.use('/api/words', wordRoutes({ now }));
  app.use('/api/review', reviewRoutes({ config, now }));
  app.use('/api/stats', statsRoutes({ now }));
  app.use('/api', youtubeRoutes({ yt }));
  app.use('/api/videos', videoRoutes({ now }));

  app.use('/api', (req, res) => res.status(404).json({ error: 'not_found' }));

  if (config.webDist) {
    app.use('/assets', express.static(path.join(config.webDist, 'assets'), { immutable: true, maxAge: '1y' }));
    app.use(express.static(config.webDist, { index: false, maxAge: 0 }));
    app.get('/{*splat}', (req, res) => {
      res.set('Cache-Control', 'no-cache');
      res.sendFile(path.join(config.webDist, 'index.html'));
    });
  }

  app.use(errorHandler);
  return app;
}
