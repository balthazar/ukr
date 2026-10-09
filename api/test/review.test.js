import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createApp } from '../src/app.js';
import { Word, Progress, Video } from '../src/models.js';
import { startDb, stopDb, clearDb, testConfig, login } from './helpers.js';

let now = new Date('2026-03-01T12:00:00Z');
let agent, words;

beforeAll(async () => {
  await startDb();
  // testConfig.newPerDay is 3
  agent = await login(createApp({ config: testConfig, now: () => now }));
});
afterAll(stopDb);
beforeEach(async () => {
  now = new Date('2026-03-01T12:00:00Z');
  await clearDb();
  words = await Word.insertMany(
    Array.from({ length: 6 }, (_, i) => ({ rank: i + 1, lemma: `w${i + 1}`, glosses: [`g${i + 1}`], forms: [] })),
  );
});

describe('GET /api/review', () => {
  it('serves new words by rank up to NEW_PER_DAY when nothing is due', async () => {
    const res = await agent.get('/api/review').expect(200);
    expect(res.body.cards.map((c) => c.word.lemma)).toEqual(['w1', 'w2', 'w3']);
    expect(res.body.cards.every((c) => c.isNew && c.progress === null)).toBe(true);
    expect(res.body).toMatchObject({ dueCount: 0, newCount: 3 });
  });

  it('puts due cards first (oldest due first) and skips not-yet-due and known', async () => {
    await Progress.create([
      { wordId: words[4]._id, status: 'learning', due: new Date('2026-03-01T11:00:00Z') },
      { wordId: words[3]._id, status: 'learning', due: new Date('2026-02-28T00:00:00Z') },
      { wordId: words[2]._id, status: 'learning', due: new Date('2026-03-05T00:00:00Z') },
      { wordId: words[1]._id, status: 'known' },
    ]);
    const res = await agent.get('/api/review').expect(200);
    expect(res.body.cards.map((c) => c.word.lemma)).toEqual(['w4', 'w5', 'w1', 'w6']);
    expect(res.body).toMatchObject({ dueCount: 2, newCount: 2 }); // only w1 and w6 are unstarted
  });

  it('counts words introduced today against the daily limit, resetting at UTC midnight', async () => {
    await agent.post(`/api/review/${words[0]._id}`).send({ grade: 2 }).expect(200);
    await agent.post(`/api/review/${words[1]._id}`).send({ grade: 2 }).expect(200);
    let res = await agent.get('/api/review');
    expect(res.body.cards.map((c) => c.word.lemma)).toEqual(['w3']);
    // Next UTC day: w1/w2 are due at 12:00, not yet; the new-word allowance is back to 3.
    now = new Date('2026-03-02T00:00:01Z');
    res = await agent.get('/api/review');
    expect(res.body.cards.map((c) => c.word.lemma)).toEqual(['w3', 'w4', 'w5']);
  });

  it('ignores progress whose word no longer exists', async () => {
    const ghost = new Word({ rank: 99, lemma: 'ghost' })._id;
    await Progress.create({ wordId: ghost, status: 'learning', due: new Date(0) });
    const res = await agent.get('/api/review').expect(200);
    expect(res.body.cards.map((c) => c.word.lemma)).toEqual(['w1', 'w2', 'w3']);
  });
});

describe('POST /api/review/:id', () => {
  it('creates progress on first grade with introducedAt and SM-2 fields', async () => {
    const res = await agent.post(`/api/review/${words[0]._id}`).send({ grade: 2 }).expect(200);
    expect(res.body.progress).toMatchObject({ status: 'learning', reps: 1, interval: 1, ease: 2.5 });
    expect(new Date(res.body.progress.introducedAt)).toEqual(now);
    expect(new Date(res.body.progress.due)).toEqual(new Date('2026-03-02T12:00:00Z'));
  });

  it('keeps introducedAt on later grades and applies Again', async () => {
    await agent.post(`/api/review/${words[0]._id}`).send({ grade: 2 });
    const first = now;
    now = new Date('2026-03-03T12:00:00Z');
    const res = await agent.post(`/api/review/${words[0]._id}`).send({ grade: 0 }).expect(200);
    expect(res.body.progress).toMatchObject({ reps: 0, lapses: 1 });
    expect(new Date(res.body.progress.introducedAt)).toEqual(first);
  });

  it('validates grade and id', async () => {
    for (const grade of [4, -1, 'good', null]) await agent.post(`/api/review/${words[0]._id}`).send({ grade }).expect(400);
    await agent.post('/api/review/000000000000000000000000').send({ grade: 2 }).expect(404);
  });
});

describe('GET /api/stats', () => {
  it('counts words, statuses, due and videos', async () => {
    await Progress.create([
      { wordId: words[0]._id, status: 'learning', due: new Date('2026-03-01T00:00:00Z'), introducedAt: now },
      { wordId: words[1]._id, status: 'learning', due: new Date('2026-03-09T00:00:00Z') },
      { wordId: words[2]._id, status: 'known' },
    ]);
    await Video.create([
      { videoId: 'aaaaaaaaaaa', watched: true, position: 100 },
      { videoId: 'bbbbbbbbbbb', watched: false, position: 10 },
      { videoId: 'ccccccccccc', watched: false, position: 0 },
    ]);
    const res = await agent.get('/api/stats').expect(200);
    expect(res.body).toEqual({ words: 6, known: 1, learning: 2, due: 1, newToday: 1, videosWatched: 1, videosInProgress: 1 });
  });
});
