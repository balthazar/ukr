import { Router } from 'express';
import { Video } from '../models.js';
import { httpError } from '../lib/http.js';

const VIDEO_ID = /^[\w-]{11}$/;
const WATCHED_RATIO = 0.9;
const STATES = { inprogress: { watched: false, position: { $gt: 0 } }, watched: { watched: true } };
const isNonNegative = (n) => typeof n === 'number' && Number.isFinite(n) && n >= 0;

function videoId(req) {
  if (!VIDEO_ID.test(req.params.videoId)) throw httpError(400, 'bad_video_id', 'invalid video id');
  return req.params.videoId;
}

function pickMeta(meta) {
  const out = {};
  for (const k of ['title', 'channelId', 'channelTitle', 'thumbnail']) {
    if (typeof meta?.[k] === 'string' && meta[k]) out[k] = meta[k].slice(0, 500);
  }
  return out;
}

export function videoRoutes({ now }) {
  const r = Router();

  r.get('/', async (req, res) => {
    const filter = STATES[req.query.state];
    if (!filter) throw httpError(400, 'bad_state', 'state must be inprogress or watched');
    res.json(await Video.find(filter).sort({ lastWatchedAt: -1 }).limit(100).lean());
  });

  r.get('/:videoId', async (req, res) => {
    const video = await Video.findOne({ videoId: videoId(req) }).lean();
    if (!video) throw httpError(404, 'not_found', 'video never played');
    res.json(video);
  });

  r.put('/:videoId/progress', async (req, res) => {
    const id = videoId(req);
    const { position, duration, meta } = req.body ?? {};
    if (!isNonNegative(position) || !isNonNegative(duration) || duration === 0) {
      throw httpError(400, 'bad_progress', 'position must be >= 0 and duration > 0');
    }
    const set = { position, duration, lastWatchedAt: now(), ...pickMeta(meta) };
    if (position / duration >= WATCHED_RATIO) set.watched = true;
    const video = await Video.findOneAndUpdate({ videoId: id }, { $set: set }, { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }).lean();
    res.json(video);
  });

  r.put('/:videoId/watched', async (req, res) => {
    const id = videoId(req);
    const { watched } = req.body ?? {};
    if (typeof watched !== 'boolean') throw httpError(400, 'bad_watched', 'watched must be a boolean');
    const video = await Video.findOneAndUpdate(
      { videoId: id },
      { $set: { watched, lastWatchedAt: now() } },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
    ).lean();
    res.json(video);
  });

  return r;
}
