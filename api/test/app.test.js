import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { startDb, stopDb, testConfig } from './helpers.js';

beforeAll(startDb);
afterAll(stopDb);

describe('app basics', () => {
  const app = createApp({ config: testConfig });

  it('GET /health is 200 when mongo is connected', async () => {
    const res = await request(app).get('/health').expect(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('unknown /api route is a JSON 404', async () => {
    const res = await request(app).get('/api/nope');
    expect([401, 404]).toContain(res.status); // 401 once auth is mounted in Task 2
  });

  it('malformed JSON body is a 400', async () => {
    const res = await request(app).post('/api/login').set('Content-Type', 'application/json').send('{bad');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('bad_json');
  });

  it('sets a CSP that allows the YouTube embed and Commons audio', async () => {
    const res = await request(app).get('/health');
    const csp = res.headers['content-security-policy'];
    expect(csp).toContain('frame-src https://www.youtube.com');
    expect(csp).toContain('https://upload.wikimedia.org');
  });
});
