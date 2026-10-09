import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { importWords } from '../src/lib/importWords.js';
import { Word, Progress } from '../src/models.js';
import { startDb, stopDb, clearDb } from './helpers.js';

const w = (rank, lemma) => ({ rank, lemma, stressed: lemma, respelling: lemma, ipa: '', pos: 'noun', glosses: [lemma], forms: [lemma], audio: [], freq: 100 - rank });

beforeAll(startDb);
afterAll(stopDb);
beforeEach(clearDb);

describe('importWords', () => {
  it('inserts words', async () => {
    const r = await importWords([w(1, 'а'), w(2, 'б')]);
    expect(r).toMatchObject({ upserted: 2, removed: 0 });
    expect(await Word.countDocuments()).toBe(2);
  });

  it('re-seed keeps _id and progress for kept words, shifts ranks, drops removed words and their progress', async () => {
    await importWords([w(1, 'а'), w(2, 'б'), w(3, 'в')]);
    const a = await Word.findOne({ lemma: 'а' });
    const c = await Word.findOne({ lemma: 'в' });
    await Progress.create([{ wordId: a._id, status: 'known' }, { wordId: c._id, status: 'learning' }]);

    const r = await importWords([w(1, 'б'), w(2, 'а'), w(3, 'г')]);
    expect(r).toMatchObject({ upserted: 1, removed: 1 });

    const a2 = await Word.findOne({ lemma: 'а' });
    expect(String(a2._id)).toBe(String(a._id));
    expect(a2.rank).toBe(2);
    expect(await Word.exists({ lemma: 'в' })).toBeNull();
    expect(await Progress.countDocuments()).toBe(1);
    expect(await Progress.exists({ wordId: a._id })).not.toBeNull();
  });

  it('refuses an empty or non-array file', async () => {
    await expect(importWords([])).rejects.toThrow('empty');
    await expect(importWords({})).rejects.toThrow('empty');
  });
});
