import { Router } from 'express';
import { Word, Progress } from '../models.js';
import { grade } from '../lib/sm2.js';
import { httpError, isObjectId } from '../lib/http.js';

export const startOfUtcDay = (d) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

export function reviewRoutes({ config, now }) {
  const r = Router();

  r.get('/', async (req, res) => {
    const t = now();
    const due = await Progress.find({ status: 'learning', due: { $lte: t } }).sort({ due: 1 }).lean();
    const dueWords = await Word.find({ _id: { $in: due.map((p) => p.wordId) } }).lean();
    const wordById = new Map(dueWords.map((w) => [String(w._id), w]));
    const dueCards = due
      .filter((p) => wordById.has(String(p.wordId)))
      .map((p) => ({ word: wordById.get(String(p.wordId)), progress: p, isNew: false }));

    const introducedToday = await Progress.countDocuments({ introducedAt: { $gte: startOfUtcDay(t) } });
    const allowance = Math.max(0, config.newPerDay - introducedToday);
    const startedIds = (await Progress.find({}, { wordId: 1 }).lean()).map((p) => p.wordId);
    const newWords = allowance
      ? await Word.find({ _id: { $nin: startedIds } }).sort({ rank: 1 }).limit(allowance).lean()
      : [];

    res.json({
      cards: [...dueCards, ...newWords.map((w) => ({ word: w, progress: null, isNew: true }))],
      dueCount: dueCards.length,
      newCount: newWords.length,
    });
  });

  r.post('/:id', async (req, res) => {
    const g = req.body?.grade;
    if (!Number.isInteger(g) || g < 0 || g > 3) throw httpError(400, 'bad_grade', 'grade must be 0, 1, 2 or 3');
    if (!isObjectId(req.params.id) || !(await Word.exists({ _id: req.params.id }))) {
      throw httpError(404, 'not_found', 'word not found');
    }
    const t = now();
    const existing = await Progress.findOne({ wordId: req.params.id }).lean();
    const next = grade(existing ?? {}, g, t);
    const progress = await Progress.findOneAndUpdate(
      { wordId: req.params.id },
      { $set: { ...next, status: 'learning' }, $setOnInsert: { introducedAt: t } },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
    ).lean();
    res.json({ progress });
  });

  return r;
}
