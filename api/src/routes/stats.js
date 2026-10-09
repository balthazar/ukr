import { Router } from 'express';
import { Word, Progress, Video } from '../models.js';
import { startOfUtcDay } from './review.js';

export function statsRoutes({ now }) {
  const r = Router();
  r.get('/', async (req, res) => {
    const t = now();
    const [words, known, learning, due, newToday, videosWatched, videosInProgress] = await Promise.all([
      Word.countDocuments(),
      Progress.countDocuments({ status: 'known' }),
      Progress.countDocuments({ status: 'learning' }),
      Progress.countDocuments({ status: 'learning', due: { $lte: t } }),
      Progress.countDocuments({ introducedAt: { $gte: startOfUtcDay(t) } }),
      Video.countDocuments({ watched: true }),
      Video.countDocuments({ watched: false, position: { $gt: 0 } }),
    ]);
    res.json({ words, known, learning, due, newToday, videosWatched, videosInProgress });
  });
  return r;
}
