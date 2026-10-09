import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createApp } from '../src/app.js';
import { Word, Progress } from '../src/models.js';
import { startDb, stopDb, clearDb, testConfig, login } from './helpers.js';

const NOW = new Date('2026-03-01T12:00:00Z');
let agent, words;

beforeAll(async () => {
  await startDb();
  agent = await login(createApp({ config: testConfig, now: () => NOW }));
});
afterAll(stopDb);
beforeEach(async () => {
  await clearDb();
  words = await Word.insertMany([
    { rank: 1, lemma: 'я', stressed: 'я', respelling: 'ya', glosses: ['I'], forms: ['я', 'мене'] },
    { rank: 2, lemma: 'дякувати', stressed: 'дя́кувати', respelling: 'DYA-koo-va-ty', glosses: ['to thank'], forms: ['дякую'] },
    { rank: 3, lemma: 'хата', stressed: 'ха́та', respelling: 'KHA-ta', glosses: ['house, hut'], forms: ['хата'] },
  ]);
});

describe('GET /api/words', () => {
  it('lists by rank with null progress for unstarted words', async () => {
    const res = await agent.get('/api/words').expect(200);
    expect(res.body.items.map((w) => w.lemma)).toEqual(['я', 'дякувати', 'хата']);
    expect(res.body.items[0].progress).toBeNull();
    expect(res.body).toMatchObject({ total: 3, page: 1, limit: 50 });
  });

  it('paginates', async () => {
    const res = await agent.get('/api/words?limit=2&page=2').expect(200);
    expect(res.body.items.map((w) => w.lemma)).toEqual(['хата']);
  });

  it('filters by status', async () => {
    await Progress.create({ wordId: words[1]._id, status: 'learning', due: NOW });
    await Progress.create({ wordId: words[2]._id, status: 'known' });
    const lemmas = async (s) => (await agent.get(`/api/words?status=${s}`)).body.items.map((w) => w.lemma);
    expect(await lemmas('new')).toEqual(['я']);
    expect(await lemmas('learning')).toEqual(['дякувати']);
    expect(await lemmas('known')).toEqual(['хата']);
    await agent.get('/api/words?status=bogus').expect(400);
  });

  it('searches lemma prefix and gloss substring', async () => {
    expect((await agent.get('/api/words').query({ q: 'дяк' })).body.items.map((w) => w.lemma)).toEqual(['дякувати']);
    expect((await agent.get('/api/words').query({ q: 'HOUSE' })).body.items.map((w) => w.lemma)).toEqual(['хата']);
  });

  it('search matches typographic apostrophes against stored ASCII ones', async () => {
    await Word.create({ rank: 4, lemma: "сім'я", glosses: ['family'], forms: [] });
    for (const q of ['сім’я', 'сімʼя', "сім'я"]) {
      const res = await agent.get('/api/words').query({ q }).expect(200);
      expect(res.body.items.map((w) => w.lemma)).toEqual(["сім'я"]);
    }
  });

  it('search survives regex metacharacters and stress marks', async () => {
    for (const q of ['(', '.*', '[', '\\']) {
      const res = await agent.get('/api/words').query({ q }).expect(200);
      expect(res.body.items).toEqual([]);
    }
    const res = await agent.get('/api/words').query({ q: 'дя́кувати' }).expect(200);
    expect(res.body.items.map((w) => w.lemma)).toEqual(['дякувати']);
  });
});

describe('word detail and status', () => {
  it('GET /:id returns word + progress, 404 for bad or unknown ids', async () => {
    const res = await agent.get(`/api/words/${words[0]._id}`).expect(200);
    expect(res.body).toMatchObject({ lemma: 'я', progress: null });
    await agent.get('/api/words/not-an-id').expect(404);
    await agent.get('/api/words/000000000000000000000000').expect(404);
  });

  it('PUT status known / learning / reset', async () => {
    const id = words[0]._id;
    let res = await agent.put(`/api/words/${id}/status`).send({ status: 'known' }).expect(200);
    expect(res.body.progress.status).toBe('known');
    res = await agent.put(`/api/words/${id}/status`).send({ status: 'learning' }).expect(200);
    expect(res.body.progress.status).toBe('learning');
    expect(new Date(res.body.progress.due)).toEqual(NOW);
    res = await agent.put(`/api/words/${id}/status`).send({ status: 'reset' }).expect(200);
    expect(res.body.progress).toBeNull();
    expect(await Progress.countDocuments()).toBe(0);
    await agent.put(`/api/words/${id}/status`).send({ status: 'nope' }).expect(400);
  });

  it('POST mic tallies only for started words', async () => {
    const id = words[0]._id;
    let res = await agent.post(`/api/words/${id}/mic`).send({ pass: true }).expect(200);
    expect(res.body.progress).toBeNull();
    expect(await Progress.countDocuments()).toBe(0);
    await Progress.create({ wordId: id, status: 'learning', due: NOW });
    await agent.post(`/api/words/${id}/mic`).send({ pass: true }).expect(200);
    res = await agent.post(`/api/words/${id}/mic`).send({ pass: false }).expect(200);
    expect(res.body.progress).toMatchObject({ micPass: 1, micTotal: 2 });
    await agent.post(`/api/words/${id}/mic`).send({ pass: 'yes' }).expect(400);
  });
});
