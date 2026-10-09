import { Router } from 'express';
import { Word, Progress } from '../models.js';
import { httpError, escapeRegex, isObjectId } from '../lib/http.js';

const STATUSES = ['new', 'learning', 'known'];

async function findWord(id) {
  if (!isObjectId(id)) throw httpError(404, 'not_found', 'word not found');
  const word = await Word.findById(id).lean();
  if (!word) throw httpError(404, 'not_found', 'word not found');
  return word;
}

export function wordRoutes({ now }) {
  const r = Router();

  r.get('/', async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const { status } = req.query;
    const q = typeof req.query.q === 'string' ? req.query.q.replace(/[̀́]/g, '').trim().toLowerCase() : '';
    const filter = {};

    if (q) {
      const rx = escapeRegex(q);
      filter.$or = [{ lemma: new RegExp(`^${rx}`) }, { glosses: new RegExp(rx, 'i') }];
    }
    if (status !== undefined) {
      if (!STATUSES.includes(status)) throw httpError(400, 'bad_status', `status must be one of ${STATUSES.join(', ')}`);
      const started = await Progress.find(status === 'new' ? {} : { status }, { wordId: 1 }).lean();
      const ids = started.map((p) => p.wordId);
      filter._id = status === 'new' ? { $nin: ids } : { $in: ids };
    }

    const [items, total] = await Promise.all([
      Word.find(filter).sort({ rank: 1 }).skip((page - 1) * limit).limit(limit).lean(),
      Word.countDocuments(filter),
    ]);
    const progress = await Progress.find({ wordId: { $in: items.map((w) => w._id) } }).lean();
    const byWord = new Map(progress.map((p) => [String(p.wordId), p]));
    res.json({ items: items.map((w) => ({ ...w, progress: byWord.get(String(w._id)) ?? null })), total, page, limit });
  });

  r.get('/:id', async (req, res) => {
    const word = await findWord(req.params.id);
    const progress = await Progress.findOne({ wordId: word._id }).lean();
    res.json({ ...word, progress });
  });

  r.put('/:id/status', async (req, res) => {
    const word = await findWord(req.params.id);
    const { status } = req.body ?? {};
    if (status === 'reset') {
      await Progress.deleteOne({ wordId: word._id });
      return res.json({ progress: null });
    }
    if (status !== 'known' && status !== 'learning') throw httpError(400, 'bad_status', 'status must be known, learning or reset');
    const update = status === 'known' ? { $set: { status } } : { $set: { status, due: now() } };
    const progress = await Progress.findOneAndUpdate({ wordId: word._id }, update, { upsert: true, new: true, setDefaultsOnInsert: true }).lean();
    res.json({ progress });
  });

  r.post('/:id/mic', async (req, res) => {
    const word = await findWord(req.params.id);
    const { pass } = req.body ?? {};
    if (typeof pass !== 'boolean') throw httpError(400, 'bad_pass', 'pass must be a boolean');
    // A mic attempt must not silently start a word, so no upsert here.
    const progress = await Progress.findOneAndUpdate(
      { wordId: word._id },
      { $inc: { micTotal: 1, micPass: pass ? 1 : 0 } },
      { new: true },
    ).lean();
    res.json({ progress });
  });

  return r;
}
