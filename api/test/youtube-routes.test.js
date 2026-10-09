import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { Channel } from '../src/models.js';
import { httpError } from '../src/lib/http.js';
import { startDb, stopDb, clearDb, testConfig, login } from './helpers.js';

const page = { items: [{ videoId: 'vid00000001', title: 'T', channelId: 'UCx', channelTitle: 'C', thumbnail: '', duration: 60, publishedAt: '' }], nextPageToken: null };
const yt = { search: vi.fn(), resolveChannel: vi.fn(), channelVideos: vi.fn() };
let agent;

beforeAll(async () => {
  await startDb();
  agent = await login(createApp({ config: testConfig, yt }));
});
afterAll(stopDb);
beforeEach(async () => {
  await clearDb();
  vi.resetAllMocks();
});

describe('GET /api/yt/search', () => {
  it('requires q', async () => {
    await agent.get('/api/yt/search').expect(400);
  });

  it('caches by normalized query and page token', async () => {
    yt.search.mockResolvedValue(page);
    await agent.get('/api/yt/search').query({ q: ' Привіт ' }).expect(200, page);
    await agent.get('/api/yt/search').query({ q: 'привіт' }).expect(200, page);
    expect(yt.search).toHaveBeenCalledTimes(1);
    expect(yt.search).toHaveBeenCalledWith('привіт', undefined);
  });

  it('passes youtube errors through as 503', async () => {
    yt.search.mockRejectedValue(httpError(503, 'youtube_unavailable', 'quota exceeded'));
    const res = await agent.get('/api/yt/search').query({ q: 'x' }).expect(503);
    expect(res.body).toEqual({ error: 'youtube_unavailable', detail: 'quota exceeded' });
  });
});

describe('channels', () => {
  const ch = { channelId: 'UCx', title: 'Chan', thumbnail: 't', uploadsPlaylistId: 'UUx' };

  it('adds, lists, lists videos, and deletes a channel', async () => {
    yt.resolveChannel.mockResolvedValue(ch);
    await agent.post('/api/channels').send({ input: '@chan' }).expect(201);
    await agent.post('/api/channels').send({ input: '@chan' }).expect(201); // idempotent
    const list = await agent.get('/api/channels').expect(200);
    expect(list.body).toEqual([expect.objectContaining(ch)]);

    yt.channelVideos.mockResolvedValue(page);
    await agent.get('/api/channels/UCx/videos').expect(200, page);
    expect(yt.channelVideos).toHaveBeenCalledWith('UUx', undefined);

    await agent.delete('/api/channels/UCx').expect(204);
    expect(await Channel.countDocuments()).toBe(0);
  });

  it('400 without input, 404 for videos of an unpinned channel', async () => {
    await agent.post('/api/channels').send({}).expect(400);
    await agent.get('/api/channels/UCnope/videos').expect(404);
  });
});
