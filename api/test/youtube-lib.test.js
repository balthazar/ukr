import { describe, it, expect, vi } from 'vitest';
import { createYouTube, parseDuration, parseChannelInput } from '../src/lib/youtube.js';

const json = (body, status = 200) => ({ ok: status < 400, status, json: async () => body });
// Plain-object view of a rejection, so assertions don't depend on Error matching semantics.
const failure = (p) => p.then(
  () => { throw new Error('expected a rejection'); },
  (e) => ({ status: e.status, code: e.code, message: e.message }),
);

const videosBody = {
  items: [
    {
      id: 'vid00000001',
      snippet: { title: 'Ukrainian "basics" & more', channelId: 'UCx', channelTitle: 'Chan', publishedAt: '2026-01-01T00:00:00Z', thumbnails: { medium: { url: 'https://i.ytimg.com/vi/vid00000001/mqdefault.jpg' } } },
      contentDetails: { duration: 'PT12M5S' },
    },
  ],
};

describe('parseDuration', () => {
  it.each([['PT1H2M3S', 3723], ['PT45S', 45], ['PT3M', 180], ['P0D', 0], ['P1DT1S', 86401], [undefined, 0]])('%s -> %i', (iso, s) => {
    expect(parseDuration(iso)).toBe(s);
  });
});

describe('parseChannelInput', () => {
  it.each([
    ['UCabcdefghijklmnopqrstuv', { id: 'UCabcdefghijklmnopqrstuv' }],
    ['https://www.youtube.com/channel/UCabcdefghijklmnopqrstuv', { id: 'UCabcdefghijklmnopqrstuv' }],
    ['@UkrainianLessons', { handle: '@UkrainianLessons' }],
    ['https://www.youtube.com/@UkrainianLessons/videos', { handle: '@UkrainianLessons' }],
    ['', null],
    ['https://example.com/', null],
  ])('%s', (input, out) => expect(parseChannelInput(input)).toEqual(out));
});

describe('createYouTube', () => {
  it('search enriches results with durations and unescaped titles from videos.list', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(json({ items: [{ id: { videoId: 'vid00000001' } }], nextPageToken: 'N' }))
      .mockResolvedValueOnce(json(videosBody));
    const yt = createYouTube({ apiKey: 'K', fetchImpl });
    const out = await yt.search('привіт');
    expect(out).toEqual({
      nextPageToken: 'N',
      items: [{ videoId: 'vid00000001', title: 'Ukrainian "basics" & more', channelId: 'UCx', channelTitle: 'Chan', thumbnail: 'https://i.ytimg.com/vi/vid00000001/mqdefault.jpg', duration: 725, publishedAt: '2026-01-01T00:00:00Z' }],
    });
    const searchUrl = fetchImpl.mock.calls[0][0];
    expect(searchUrl.pathname).toBe('/youtube/v3/search');
    expect(searchUrl.searchParams.get('q')).toBe('привіт');
    expect(searchUrl.searchParams.get('relevanceLanguage')).toBe('uk');
    expect(searchUrl.searchParams.get('type')).toBe('video');
    expect(searchUrl.searchParams.get('key')).toBe('K');
  });

  it('search with no hits skips videos.list', async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(json({ items: [] }));
    const out = await createYouTube({ apiKey: 'K', fetchImpl }).search('zzz');
    expect(out).toEqual({ items: [], nextPageToken: null });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('resolveChannel by handle', async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(json({ items: [{ id: 'UCx', snippet: { title: 'Chan', thumbnails: { default: { url: 't' } } }, contentDetails: { relatedPlaylists: { uploads: 'UUx' } } }] }));
    const ch = await createYouTube({ apiKey: 'K', fetchImpl }).resolveChannel('@chan');
    expect(ch).toEqual({ channelId: 'UCx', title: 'Chan', thumbnail: 't', uploadsPlaylistId: 'UUx' });
    expect(fetchImpl.mock.calls[0][0].searchParams.get('forHandle')).toBe('@chan');
  });

  it('resolveChannel 404s for unknown or unparseable input', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(json({ items: [] }));
    const yt = createYouTube({ apiKey: 'K', fetchImpl });
    expect(await failure(yt.resolveChannel('@nobody'))).toMatchObject({ status: 404, code: 'channel_not_found' });
    expect(await failure(yt.resolveChannel('not a channel'))).toMatchObject({ status: 404, code: 'channel_not_found' });
  });

  it('channelVideos lists the uploads playlist', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(json({ items: [{ contentDetails: { videoId: 'vid00000001' } }] }))
      .mockResolvedValueOnce(json(videosBody));
    const out = await createYouTube({ apiKey: 'K', fetchImpl }).channelVideos('UUx', 'P2');
    expect(out.items[0].videoId).toBe('vid00000001');
    expect(fetchImpl.mock.calls[0][0].searchParams.get('playlistId')).toBe('UUx');
    expect(fetchImpl.mock.calls[0][0].searchParams.get('pageToken')).toBe('P2');
  });

  it('maps quota errors and network failures to 503 youtube_unavailable', async () => {
    const quota = vi.fn().mockResolvedValue(json({ error: { message: 'quota exceeded' } }, 403));
    expect(await failure(createYouTube({ apiKey: 'K', fetchImpl: quota }).search('x'))).toEqual({ status: 503, code: 'youtube_unavailable', message: 'quota exceeded' });
    const down = vi.fn().mockRejectedValue(new Error('ECONNRESET'));
    expect(await failure(createYouTube({ apiKey: 'K', fetchImpl: down }).search('x'))).toEqual({ status: 503, code: 'youtube_unavailable', message: 'ECONNRESET' });
  });

  it('503 youtube_not_configured without a key', async () => {
    expect(await failure(createYouTube({ apiKey: '' }).search('x'))).toMatchObject({ status: 503, code: 'youtube_not_configured' });
  });
});
