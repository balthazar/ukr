import { describe, it, expect } from 'vitest';
import { createIndex, addEntry } from '../lib/kaikki.js';
import { parseFrequency, fold } from '../lib/fold.js';
import { buildWords } from '../lib/build.js';
import { ttsFile, attachTts } from '../lib/tts.js';

const MP3 = (w) => `https://upload.wikimedia.org/x/Uk-${w}.ogg.mp3`;

function index() {
  const ix = createIndex();
  for (const e of [
    { word: 'у', pos: 'character', lang_code: 'uk', sounds: [{ mp3_url: MP3('у') }], senses: [{ glosses: ['letter у'] }] },
    { word: 'в', pos: 'character', lang_code: 'uk', sounds: [{ mp3_url: MP3('в') }], senses: [{ glosses: ['letter в'] }] },
    { word: 'у', pos: 'prep', lang_code: 'uk', senses: [{ glosses: ['in'] }] },
    { word: 'в', pos: 'prep', lang_code: 'uk', senses: [{ glosses: ['in'] }] },
    { word: 'хата', pos: 'noun', lang_code: 'uk', senses: [{ glosses: ['house'] }] },
  ]) addEntry(ix, e);
  return ix;
}

describe('letter recordings', () => {
  const ix = index();
  const words = buildWords(ix, fold(parseFrequency('у 30\nв 20\nхата 10\n'), ix));
  const byLemma = Object.fromEntries(words.map((w) => [w.lemma, w]));

  it('gives a one-vowel word without its own audio the native recording of that letter', () => {
    expect(byLemma['у'].audio).toEqual([{ url: MP3('у'), source: 'commons-letter' }]);
  });

  it('never uses consonant letter recordings, which say the letter name (в = "ve")', () => {
    expect(byLemma['в'].audio).toEqual([]);
  });

  it('still skips letters as words', () => {
    expect(words.map((w) => w.lemma)).toEqual(['у', 'в', 'хата']);
  });
});

describe('pre-rendered tts', () => {
  it('names files by a stable hash of the lemma', () => {
    expect(ttsFile('хата')).toMatch(/^[0-9a-f]{12}\.mp3$/);
    expect(ttsFile('хата')).toBe(ttsFile('хата'));
    expect(ttsFile('хата')).not.toBe(ttsFile('хати'));
  });

  it('attaches a rendered file only to words with no recording', () => {
    const words = [
      { lemma: 'хата', audio: [] },
      { lemma: 'дім', audio: [] },
      { lemma: 'я', audio: [{ url: MP3('я'), source: 'commons' }] },
    ];
    const rendered = new Set([ttsFile('хата'), ttsFile('я')]);
    const out = attachTts(words, (file) => rendered.has(file));
    expect(out[0].audio).toEqual([{ url: `/tts/${ttsFile('хата')}`, source: 'tts' }]);
    expect(out[1].audio).toEqual([]);
    expect(out[2].audio).toEqual([{ url: MP3('я'), source: 'commons' }]);
  });
});

import { hasLoudTail } from '../lib/tts.js';

describe('hasLoudTail', () => {
  it('passes speech that fades out', () => {
    expect(hasLoudTail([-15, -14.5, -16.7, -19, -22.7, -34.9])).toBe(false);
  });
  it('flags a final window near the loudest one (a burst at the end)', () => {
    expect(hasLoudTail([-15, -20, -30, -12])).toBe(true);
  });
  it('flags a final window that is still loud in absolute terms', () => {
    expect(hasLoudTail([-15, -16, -18, -24])).toBe(true);
  });
  it('treats empty input as broken', () => {
    expect(hasLoudTail([])).toBe(true);
  });
});

describe('gloss overrides', () => {
  it('drops glosses listed as wrong for a lemma (я is not "ego")', () => {
    const ix = createIndex();
    addEntry(ix, { word: 'я', pos: 'pron', lang_code: 'uk', senses: [{ glosses: ['I'] }] });
    addEntry(ix, { word: 'я', pos: 'noun', lang_code: 'uk', senses: [{ glosses: ['ego'] }] });
    const [w] = buildWords(ix, fold(parseFrequency('я 10\n'), ix), { excludedGlosses: { я: ['ego'] } });
    expect(w.glosses).toEqual(['I']);
  });
});
