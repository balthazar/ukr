import { httpError } from './http.js';

const BASE = 'https://www.googleapis.com/youtube/v3';

export function parseDuration(iso) {
  const m = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(iso ?? '');
  if (!m) return 0;
  const [, d = 0, h = 0, min = 0, s = 0] = m.map((x) => (x === undefined ? 0 : Number(x)));
  return d * 86400 + h * 3600 + min * 60 + s;
}

export function parseChannelInput(input) {
  const s = String(input ?? '').trim();
  const id = /(?:^|\/channel\/)(UC[\w-]{22})(?:[/?#]|$)/.exec(s);
  if (id) return { id: id[1] };
  const handle = /(?:^|youtube\.com\/)(@[\w.-]+)/.exec(s);
  if (handle) return { handle: handle[1] };
  return null;
}

const thumb = (t) => t?.medium?.url ?? t?.high?.url ?? t?.default?.url ?? '';

export function createYouTube({ apiKey, fetchImpl = fetch }) {
  async function call(path, params) {
    if (!apiKey) throw httpError(503, 'youtube_not_configured', 'YOUTUBE_API_KEY is not set');
    const url = new URL(BASE + path);
    for (const [k, v] of Object.entries({ ...params, key: apiKey })) {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
    }
    let res;
    try {
      res = await fetchImpl(url);
    } catch (err) {
      throw httpError(503, 'youtube_unavailable', err.message);
    }
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw httpError(503, 'youtube_unavailable', body?.error?.message || `HTTP ${res.status}`);
    return body;
  }

  // videos.list gives durations and titles without HTML entities (search.list escapes them).
  async function describe(ids) {
    if (!ids.length) return [];
    const body = await call('/videos', { part: 'snippet,contentDetails', id: ids.join(','), maxResults: 50 });
    const byId = new Map((body.items ?? []).map((v) => [v.id, v]));
    return ids.filter((id) => byId.has(id)).map((id) => {
      const v = byId.get(id);
      return {
        videoId: id,
        title: v.snippet?.title ?? '',
        channelId: v.snippet?.channelId ?? '',
        channelTitle: v.snippet?.channelTitle ?? '',
        thumbnail: thumb(v.snippet?.thumbnails),
        duration: parseDuration(v.contentDetails?.duration),
        publishedAt: v.snippet?.publishedAt ?? '',
      };
    });
  }

  return {
    async search(q, pageToken) {
      const body = await call('/search', { part: 'snippet', type: 'video', maxResults: 24, relevanceLanguage: 'uk', q, pageToken });
      const ids = (body.items ?? []).map((i) => i.id?.videoId).filter(Boolean);
      return { items: await describe(ids), nextPageToken: body.nextPageToken ?? null };
    },

    async resolveChannel(input) {
      const parsed = parseChannelInput(input);
      if (!parsed) throw httpError(404, 'channel_not_found', 'not a channel id, handle or URL');
      const body = await call('/channels', { part: 'snippet,contentDetails', ...(parsed.id ? { id: parsed.id } : { forHandle: parsed.handle }) });
      const c = body.items?.[0];
      if (!c) throw httpError(404, 'channel_not_found', 'channel not found');
      return { channelId: c.id, title: c.snippet?.title ?? '', thumbnail: thumb(c.snippet?.thumbnails), uploadsPlaylistId: c.contentDetails?.relatedPlaylists?.uploads };
    },

    async channelVideos(uploadsPlaylistId, pageToken) {
      const body = await call('/playlistItems', { part: 'contentDetails', playlistId: uploadsPlaylistId, maxResults: 24, pageToken });
      const ids = (body.items ?? []).map((i) => i.contentDetails?.videoId).filter(Boolean);
      return { items: await describe(ids), nextPageToken: body.nextPageToken ?? null };
    },
  };
}
