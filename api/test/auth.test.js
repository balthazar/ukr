import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { startDb, stopDb, testConfig, login } from './helpers.js';

beforeAll(startDb);
afterAll(stopDb);

describe('auth', () => {
  it('rejects a wrong password with 401 and no cookie', async () => {
    const app = createApp({ config: testConfig });
    const res = await request(app).post('/api/login').send({ password: 'nope' }).expect(401);
    expect(res.headers['set-cookie']).toBeUndefined();
  });

  it('rejects a non-string password', async () => {
    const app = createApp({ config: testConfig });
    await request(app).post('/api/login').send({ password: 123 }).expect(401);
  });

  it('sets an httpOnly cookie and unlocks /api/me', async () => {
    const app = createApp({ config: testConfig });
    await request(app).get('/api/me').expect(401);
    const agent = await login(app);
    await agent.get('/api/me').expect(200, { ok: true });
  });

  it('cookie is httpOnly, SameSite=Lax, and Secure only when configured', async () => {
    const plain = await request(createApp({ config: testConfig })).post('/api/login').send({ password: testConfig.appPassword });
    expect(plain.headers['set-cookie'][0]).toMatch(/ukr_session=.*HttpOnly.*SameSite=Lax/);
    expect(plain.headers['set-cookie'][0]).not.toMatch(/Secure/);
    const sec = await request(createApp({ config: { ...testConfig, secureCookies: true } })).post('/api/login').send({ password: testConfig.appPassword });
    expect(sec.headers['set-cookie'][0]).toMatch(/Secure/);
  });

  it('logout clears the session', async () => {
    const app = createApp({ config: testConfig });
    const agent = await login(app);
    await agent.post('/api/logout').expect(200);
    await agent.get('/api/me').expect(401);
  });

  it('unknown /api routes are 401 without a cookie and 404 with one', async () => {
    const app = createApp({ config: testConfig });
    await request(app).get('/api/nope').expect(401);
    const agent = await login(app);
    await agent.get('/api/nope').expect(404);
  });

  it('rate-limits login to 10 attempts per window per client IP', async () => {
    const app = createApp({ config: testConfig });
    for (let i = 0; i < 10; i++) {
      await request(app).post('/api/login').set('X-Forwarded-For', '1.2.3.4').send({ password: 'x' }).expect(401);
    }
    await request(app).post('/api/login').set('X-Forwarded-For', '1.2.3.4').send({ password: testConfig.appPassword }).expect(429);
    await request(app).post('/api/login').set('X-Forwarded-For', '5.6.7.8').send({ password: testConfig.appPassword }).expect(200);
  });
});
