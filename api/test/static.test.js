import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { startDb, stopDb, testConfig } from './helpers.js';

let dist;
beforeAll(async () => {
  await startDb();
  dist = fs.mkdtempSync(path.join(os.tmpdir(), 'ukr-dist-'));
  fs.mkdirSync(path.join(dist, 'assets'));
  fs.writeFileSync(path.join(dist, 'index.html'), '<!doctype html><div id="root"></div>');
  fs.writeFileSync(path.join(dist, 'assets', 'app-abc123.js'), 'console.log(1)');
});
afterAll(stopDb);

describe('static SPA', () => {
  it('serves index.html at / and for client routes, with no-cache', async () => {
    const app = createApp({ config: { ...testConfig, webDist: dist } });
    for (const p of ['/', '/words', '/anything/deep']) {
      const res = await request(app).get(p).expect(200);
      expect(res.text).toContain('id="root"');
      expect(res.headers['cache-control']).toBe('no-cache');
    }
  });

  it('serves hashed assets with long cache', async () => {
    const app = createApp({ config: { ...testConfig, webDist: dist } });
    const res = await request(app).get('/assets/app-abc123.js').expect(200);
    expect(res.headers['cache-control']).toContain('immutable');
  });

  it('API 404s stay JSON and unauthenticated API stays 401', async () => {
    const app = createApp({ config: { ...testConfig, webDist: dist } });
    await request(app).get('/api/words').expect(401);
  });
});
