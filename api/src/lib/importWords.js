import { Word, Progress } from '../models.js';

export async function importWords(words) {
  if (!Array.isArray(words) || !words.length) throw new Error('words file is empty or not an array');
  const result = await Word.bulkWrite(
    words.map((w) => ({ updateOne: { filter: { lemma: w.lemma }, update: { $set: w }, upsert: true } })),
    { ordered: false },
  );
  const lemmas = words.map((w) => w.lemma);
  const removed = await Word.deleteMany({ lemma: { $nin: lemmas } });
  const keptIds = await Word.distinct('_id');
  await Progress.deleteMany({ wordId: { $nin: keptIds } });
  return { upserted: result.upsertedCount, modified: result.modifiedCount, removed: removed.deletedCount };
}
