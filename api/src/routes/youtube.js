import { Router } from 'express';
import { Channel, YtCache } from '../models.js';
import { httpError } from '../lib/http.js';

async function cached(key, fn) {
  const hit = await YtCache.findOne({ key }).lean();
  if (hit) return hit.data;
  const data = await fn();
  await YtCache.updateOne({ key }, { $set: { data, createdAt: new Date() } }, { upsert: true });
  return data;
}

const token = (v) => (typeof v === 'string' && v ? v : undefined);

export function youtubeRoutes({ yt }) {
  const r = Router();

  r.get('/yt/search', async (req, res) => {
    const q = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : '';
    if (!q) throw httpError(400, 'bad_query', 'q is required');
    const pageToken = token(req.query.pageToken);
    res.json(await cached(`search:${q}:${pageToken ?? ''}`, () => yt.search(q, pageToken)));
  });

  r.get('/channels', async (req, res) => {
    res.json(await Channel.find().sort({ title: 1 }).lean());
  });

  r.post('/channels', async (req, res) => {
    const input = req.body?.input;
    if (typeof input !== 'string' || !input.trim()) throw httpError(400, 'bad_input', 'input is required');
    const ch = await yt.resolveChannel(input);
    const doc = await Channel.findOneAndUpdate({ channelId: ch.channelId }, { $set: ch }, { upsert: true, returnDocument: 'after' }).lean();
    res.status(201).json(doc);
  });

  r.delete('/channels/:channelId', async (req, res) => {
    await Channel.deleteOne({ channelId: req.params.channelId });
    res.status(204).end();
  });

  r.get('/channels/:channelId/videos', async (req, res) => {
    const ch = await Channel.findOne({ channelId: req.params.channelId }).lean();
    if (!ch) throw httpError(404, 'not_found', 'channel is not pinned');
    const pageToken = token(req.query.pageToken);
    res.json(await cached(`channel:${ch.channelId}:${pageToken ?? ''}`, () => yt.channelVideos(ch.uploadsPlaylistId, pageToken)));
  });

  return r;
}
