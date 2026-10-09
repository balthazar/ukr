import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createApp } from '../src/app.js';
import { Video } from '../src/models.js';
import { startDb, stopDb, clearDb, testConfig, login } from './helpers.js';

let now = new Date('2026-03-01T12:00:00Z');
let agent;
const ID = 'dQw4w9WgXcQ';
const meta = { title: 'Title', channelTitle: 'Chan', thumbnail: 'https://i.ytimg.com/vi/x/mqdefault.jpg' };

beforeAll(async () => {
  await startDb();
  agent = await login(createApp({ config: testConfig, now: () => now }));
});
afterAll(stopDb);
beforeEach(clearDb);

describe('video progress', () => {
  it('upserts position, duration, meta and lastWatchedAt', async () => {
    const res = await agent.put(`/api/videos/${ID}/progress`).send({ position: 30, duration: 600, meta }).expect(200);
    expect(res.body).toMatchObject({ videoId: ID, position: 30, duration: 600, watched: false, ...meta });
    expect(new Date(res.body.lastWatchedAt)).toEqual(now);
    await agent.get(`/api/videos/${ID}`).expect(200);
  });

  it('marks watched at 90% and never un-marks automatically', async () => {
    await agent.put(`/api/videos/${ID}/progress`).send({ position: 539, duration: 600 }).expect(200);
    let res = await agent.put(`/api/videos/${ID}/progress`).send({ position: 540, duration: 600 }).expect(200);
    expect(res.body.watched).toBe(true);
    res = await agent.put(`/api/videos/${ID}/progress`).send({ position: 5, duration: 600 }).expect(200);
    expect(res.body.watched).toBe(true);
  });

  it('rejects junk position/duration without storing anything', async () => {
    const bad = [
      { position: 10, duration: 0 },
      { position: -1, duration: 100 },
      { position: 10 },
      { position: 'x', duration: 100 },
      { position: null, duration: 100 },
      { position: 10, duration: -5 },
    ];
    for (const body of bad) await agent.put(`/api/videos/${ID}/progress`).send(body).expect(400);
    expect(await Video.countDocuments()).toBe(0);
  });

  it('rejects malformed video ids', async () => {
    await agent.put('/api/videos/short/progress').send({ position: 1, duration: 2 }).expect(400);
    await agent.get('/api/videos/has$bad$chars').expect(400);
  });

  it('manual watched toggle', async () => {
    await agent.put(`/api/videos/${ID}/progress`).send({ position: 10, duration: 100 });
    let res = await agent.put(`/api/videos/${ID}/watched`).send({ watched: true }).expect(200);
    expect(res.body.watched).toBe(true);
    res = await agent.put(`/api/videos/${ID}/watched`).send({ watched: false }).expect(200);
    expect(res.body.watched).toBe(false);
    await agent.put(`/api/videos/${ID}/watched`).send({ watched: 'yes' }).expect(400);
  });

  it('GET unknown video is 404', async () => {
    await agent.get(`/api/videos/${ID}`).expect(404);
  });
});

describe('GET /api/videos', () => {
  it('lists in-progress and watched, newest first', async () => {
    await Video.create([
      { videoId: 'aaaaaaaaaaa', position: 10, duration: 100, watched: false, lastWatchedAt: new Date(1) },
      { videoId: 'bbbbbbbbbbb', position: 20, duration: 100, watched: false, lastWatchedAt: new Date(2) },
      { videoId: 'ccccccccccc', position: 95, duration: 100, watched: true, lastWatchedAt: new Date(3) },
      { videoId: 'ddddddddddd', position: 0, duration: 100, watched: false, lastWatchedAt: new Date(4) },
    ]);
    const ids = async (state) => (await agent.get(`/api/videos?state=${state}`).expect(200)).body.map((v) => v.videoId);
    expect(await ids('inprogress')).toEqual(['bbbbbbbbbbb', 'aaaaaaaaaaa']);
    expect(await ids('watched')).toEqual(['ccccccccccc']);
    await agent.get('/api/videos?state=nope').expect(400);
  });
});
