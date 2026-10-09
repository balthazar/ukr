import { describe, it, expect } from 'vitest';
import { plain, isUkrainianWord, createIndex, addEntry } from '../lib/kaikki.js';
import { parseFrequency, fold } from '../lib/fold.js';
import { buildWords } from '../lib/build.js';

const MP3 = (w) => `https://upload.wikimedia.org/x/Uk-${w}.ogg.mp3`;

// Shapes copied from real kaikki entries, trimmed.
const ENTRIES = [
  { word: 'я', pos: 'character', lang_code: 'uk', senses: [{ glosses: ['The thirty-third letter'] }] },
  { word: 'я', pos: 'pron', lang_code: 'uk', forms: [{ form: 'я', tags: ['canonical'] }], sounds: [{ ipa: '[ja]' }, { mp3_url: MP3('я') }], senses: [{ glosses: ['I'] }] },
  { word: 'мене', pos: 'pron', lang_code: 'uk', senses: [{ glosses: ['genitive/accusative of я (ja)'], tags: ['form-of'], form_of: [{ word: 'я' }] }] },
  {
    word: 'дякувати', pos: 'verb', lang_code: 'uk',
    forms: [
      { form: 'дя́кувати', tags: ['canonical'] },
      { form: 'djákuvaty', tags: ['romanization'] },
      { form: 'дя́кую', source: 'conjugation', tags: ['first-person'] },
      { form: 'impersonal: дя́кувано', source: 'conjugation', tags: [] },
      { form: '-', source: 'conjugation', tags: [] },
    ],
    sounds: [{ ipa: '[ˈdʲakʊʋɐte]' }, { mp3_url: MP3('дякувати') }],
    senses: [{ glosses: ['to thank'] }],
  },
  { word: 'дякую', pos: 'verb', lang_code: 'uk', senses: [{ glosses: ['first-person singular of дя́кувати'], tags: ['form-of'], form_of: [{ word: 'дя́кувати' }] }] },
  { word: 'мати', pos: 'noun', lang_code: 'uk', forms: [{ form: 'ма́ти', tags: ['canonical'] }], senses: [{ glosses: ['mother'] }] },
  { word: 'мати', pos: 'verb', lang_code: 'uk', forms: [{ form: 'ма́ти', tags: ['canonical'] }, { form: 'ма́ю', source: 'conjugation' }], senses: [{ glosses: ['to have'] }] },
  { word: 'Київ', pos: 'name', lang_code: 'uk', senses: [{ glosses: ['Kyiv'] }] },
  { word: 'старий', pos: 'adj', lang_code: 'uk', senses: [{ glosses: ['old (obsolete sense)'], tags: ['obsolete'] }] },
  { word: 'сімʼя', pos: 'noun', lang_code: 'uk', forms: [{ form: "сім'я́", tags: ['canonical'] }], senses: [{ glosses: ['family'] }] },
];

function index() {
  const ix = createIndex();
  for (const e of ENTRIES) addEntry(ix, e);
  return ix;
}

describe('plain / isUkrainianWord', () => {
  it('strips stress, lowercases, normalizes apostrophes', () => {
    expect(plain('Дя́кую')).toBe('дякую');
    expect(plain('пі̀вдорозі')).toBe('півдорозі');
    expect(plain('сімʼя')).toBe("сім'я");
    expect(plain('сім’я')).toBe("сім'я");
  });
  it('rejects Russian-only letters, Latin, digits and empty strings', () => {
    for (const w of ['ты', 'это', 'ёлка', 'объект', 'hello', '123', '', '-']) expect(isUkrainianWord(w)).toBe(false);
    for (const w of ['я', "сім'я", 'що-небудь', 'ґанок', 'їжа']) expect(isUkrainianWord(w)).toBe(true);
  });
});

describe('addEntry', () => {
  const ix = index();
  it('keeps real lemmas and skips letters, names and obsolete-only entries', () => {
    expect([...ix.lemmas.keys()].sort()).toEqual(["сім'я", 'дякувати', 'мати', 'я'].sort());
  });
  it('merges homographs', () => {
    expect(ix.lemmas.get('мати')).toMatchObject({ pos: ['noun', 'verb'], glosses: ['mother', 'to have'], stressed: 'ма́ти' });
  });
  it('collects stressed form, ipa and mp3 audio', () => {
    expect(ix.lemmas.get('дякувати')).toMatchObject({
      stressed: 'дя́кувати',
      ipa: '[ˈdʲakʊʋɐte]',
      audio: [{ url: MP3('дякувати'), source: 'commons' }],
    });
  });
  it('maps form-of entries and table forms to lemmas, skipping junk forms', () => {
    expect([...ix.formToLemmas.get('мене')]).toEqual(['я']);
    expect([...ix.formToLemmas.get('дякую')]).toEqual(['дякувати']);
    expect([...ix.formToLemmas.get('маю')]).toEqual(['мати']);
    expect(ix.formToLemmas.has('-')).toBe(false);
    expect([...ix.formToLemmas.keys()].some((k) => k.includes('impersonal'))).toBe(false);
  });
});

describe('parseFrequency + fold', () => {
  const text = 'я 100\nне 90\nмене 40\nчто 80\nты 70\nдякую 30\nдякувати 5\nКиїв 20\nhello 10\n123 5\nмаю 3\nбогус\n\n';
  const folded = fold(parseFrequency(text), index());

  it('parses lines and ignores malformed ones', () => {
    expect(parseFrequency(text)).toContainEqual(['я', 100]);
    expect(parseFrequency(text).some(([t]) => t === 'богус')).toBe(false);
  });

  it('folds forms into lemmas, summing frequency, forms ordered by count', () => {
    expect(folded.find((f) => f.lemma === 'я')).toEqual({ lemma: 'я', freq: 140, forms: ['я', 'мене'] });
    expect(folded.find((f) => f.lemma === 'дякувати')).toEqual({ lemma: 'дякувати', freq: 35, forms: ['дякую', 'дякувати'] });
  });

  it('drops Russian tokens, names, Latin, digits and unknown words', () => {
    const lemmas = folded.map((f) => f.lemma);
    for (const w of ['что', 'ты', 'київ', 'hello', '123', 'не']) expect(lemmas).not.toContain(w);
  });

  it('is sorted by summed frequency', () => {
    expect(folded.map((f) => f.lemma)).toEqual(['я', 'дякувати', 'мати']);
  });
});

describe('buildWords', () => {
  it('ranks, respells and shapes words; honors limit', () => {
    const ix = index();
    const folded = fold(parseFrequency('я 100\nмене 40\nдякую 30\nмаю 3\n'), ix);
    const words = buildWords(ix, folded, { limit: 2 });
    expect(words).toEqual([
      { rank: 1, lemma: 'я', stressed: 'я', respelling: 'ya', ipa: '[ja]', pos: 'pron', glosses: ['I'], forms: ['я', 'мене'], audio: [{ url: MP3('я'), source: 'commons' }], freq: 140 },
      { rank: 2, lemma: 'дякувати', stressed: 'дя́кувати', respelling: 'DYA-koo-va-ty', ipa: '[ˈdʲakʊʋɐte]', pos: 'verb', glosses: ['to thank'], forms: ['дякую'], audio: [{ url: MP3('дякувати'), source: 'commons' }], freq: 30 },
    ]);
  });
});

describe('fold: shared forms and Russian contamination', () => {
  const ix = createIndex();
  for (const e of [
    { word: 'ти', pos: 'pron', lang_code: 'uk', forms: [{ form: 'тебе́', source: 'declension' }], senses: [{ glosses: ['you'] }] },
    { word: 'він', pos: 'pron', lang_code: 'uk', forms: [{ form: 'тебе', source: 'declension' }, { form: 'його', source: 'declension' }], senses: [{ glosses: ['he'] }] },
    { word: "м'яти", pos: 'verb', lang_code: 'uk', forms: [{ form: 'мне', source: 'conjugation' }, { form: 'мну', source: 'conjugation' }], senses: [{ glosses: ['to rumple'] }] },
    { word: 'знати', pos: 'verb', lang_code: 'uk', forms: [{ form: 'знаю', source: 'conjugation' }, { form: 'знає', source: 'conjugation' }], senses: [{ glosses: ['to know'] }] },
  ]) addEntry(ix, e);

  it('credits a form shared by several lemmas only to the lemma seen most on its own', () => {
    const folded = fold(parseFrequency('ти 500\nвін 300\nтебе 200\n'), ix);
    expect(folded.find((f) => f.lemma === 'ти')).toMatchObject({ freq: 700, forms: ['ти', 'тебе'] });
    expect(folded.find((f) => f.lemma === 'він')).toMatchObject({ freq: 300, forms: ['він'] });
  });

  it('drops tokens flagged as Russian, keeping the rest of the lemma', () => {
    const folded = fold(parseFrequency('мне 1000\nмну 2\nзнаю 400\nзнає 300\n'), ix, { russian: new Set(['мне']) });
    expect(folded.find((f) => f.lemma === "м'яти")).toEqual({ lemma: "м'яти", freq: 2, forms: ['мну'] });
    expect(folded.find((f) => f.lemma === 'знати')).toMatchObject({ freq: 700, forms: ['знаю', 'знає'] });
  });

  it('drops a flagged token even when it is itself a lemma', () => {
    const folded = fold(parseFrequency('знати 50\n'), ix, { russian: new Set(['знати']) });
    expect(folded.map((f) => f.lemma)).not.toContain('знати');
  });

  it('removes a lemma entirely when only Russian evidence remains', () => {
    const folded = fold(parseFrequency('мне 1000\n'), ix, { russian: new Set(['мне']) });
    expect(folded.map((f) => f.lemma)).not.toContain("м'яти");
  });
});
