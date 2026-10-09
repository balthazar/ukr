import { describe, it, expect } from 'vitest';
import { extractTable } from '../lib/tables.js';

const f = (form, ...tags) => ({ form, tags, source: tags.includes('nominative') || tags.includes('genitive') || tags.includes('vocative') ? 'declension' : 'conjugation' });
const ctx = { common: new Set(['роблю', 'робив', 'хата', 'хати']), audio: new Map([['роблю', 'https://x/роблю.mp3']]) };
const cells = (section) => section.rows.map((r) => [r.label, r.cells.map((c) => c?.form ?? null)]);

const robyty = {
  pos: 'verb',
  args: { 1: 'роби́ти', 2: 'impf', pf: 'зроби́ти' },
  forms: [
    f('роби́ти', 'imperfective', 'infinitive'),
    f('-', 'active', 'imperfective', 'present'),
    f('роблю́', 'first-person', 'imperfective', 'present', 'singular'),
    f('роби́тиму', 'first-person', 'future', 'imperfective', 'singular'),
    f('ро́биш', 'imperfective', 'present', 'second-person', 'singular'),
    f('ро́бить', 'imperfective', 'present', 'singular', 'third-person'),
    f('ро́бимо', 'first-person', 'imperfective', 'plural', 'present'),
    f('ро́бим', 'first-person', 'imperfective', 'plural', 'present'),
    f('ро́бите', 'imperfective', 'plural', 'present', 'second-person'),
    f('ро́блять', 'imperfective', 'plural', 'present', 'third-person'),
    f('-', 'first-person', 'imperative', 'singular'),
    f('робі́мо', 'first-person', 'imperative', 'plural'),
    f('роби́', 'imperative', 'second-person', 'singular'),
    f('робі́ть', 'imperative', 'plural', 'second-person'),
    f('роби́в', 'masculine', 'past', 'singular'),
    f('роби́ли', 'masculine', 'past', 'plural'),
    f('роби́ла', 'feminine', 'past', 'singular'),
    f('роби́ло', 'neuter', 'past', 'singular'),
    f('він бу́де роби́ти', 'error-unrecognized-form', 'future', 'past'),
  ],
};

describe('extractTable: verbs', () => {
  const t = extractTable(robyty, ctx);

  it('records aspect and the aspect partner', () => {
    expect(t).toMatchObject({ kind: 'verb', aspect: 'imperfective', partner: 'зробити' });
  });

  it('builds present, past and imperative sections with the first listed variant', () => {
    expect(t.sections.map((s) => s.title)).toEqual(['Present', 'Past', 'Imperative']);
    expect(cells(t.sections[0])).toEqual([
      ['я', ['роблю́']], ['ти', ['ро́биш']], ['він / вона', ['ро́бить']],
      ['ми', ['ро́бимо']], ['ви', ['ро́бите']], ['вони', ['ро́блять']],
    ]);
    expect(cells(t.sections[1])).toEqual([['він', ['роби́в']], ['вона', ['роби́ла']], ['воно', ['роби́ло']], ['вони', ['роби́ли']]]);
    expect(cells(t.sections[2])).toEqual([['ти', ['роби́']], ['ви', ['робі́ть']], ['ми (let’s)', ['робі́мо']]]);
  });

  it('gives each cell a respelling, a common flag and native audio when a recording exists', () => {
    const ya = t.sections[0].rows[0].cells[0];
    expect(ya).toEqual({ form: 'роблю́', respelling: 'ro-BLYOO', common: true, audio: { url: 'https://x/роблю.mp3', source: 'commons' } });
    expect(t.sections[0].rows[1].cells[0]).toMatchObject({ common: false, audio: null });
  });

  it('uses the future for perfective verbs, which have no present', () => {
    const pf = extractTable({
      pos: 'verb',
      args: { 1: 'зроби́ти', 2: 'pf', impf: 'роби́ти' },
      forms: [
        f('-', 'first-person', 'perfective', 'present', 'singular'),
        f('зроблю́', 'first-person', 'future', 'perfective', 'singular'),
        f('зроби́в', 'masculine', 'past', 'singular'),
      ],
    }, ctx);
    expect(pf).toMatchObject({ aspect: 'perfective', partner: 'робити' });
    expect(pf.sections[0].title).toBe('Future');
    expect(cells(pf.sections[0])[0]).toEqual(['я', ['зроблю́']]);
  });
});

describe('extractTable: nouns, adjectives, pronouns', () => {
  it('nouns: cases by singular and plural', () => {
    const t = extractTable({
      pos: 'noun',
      args: {},
      forms: [
        f('ха́та', 'nominative', 'singular'), f('хати́', 'nominative', 'plural'),
        f('ха́ти', 'genitive', 'singular'), f('хат', 'genitive', 'plural'),
        f('ха́то', 'singular', 'vocative'),
      ],
    }, ctx);
    expect(t.kind).toBe('noun');
    expect(t.sections[0].columns).toEqual(['singular', 'plural']);
    expect(cells(t.sections[0])).toEqual([
      ['nominative', ['ха́та', 'хати́']], ['genitive', ['ха́ти', 'хат']], ['vocative', ['ха́то', null]],
    ]);
  });

  it('adjectives: nominative by gender and plural', () => {
    const t = extractTable({
      pos: 'adj',
      args: {},
      forms: [
        f('до́брий', 'masculine', 'nominative', 'singular'), f('до́бре', 'neuter', 'nominative', 'singular'),
        f('до́бра', 'feminine', 'nominative', 'singular'), f('до́брі', 'nominative', 'plural'),
        f('до́брого', 'genitive', 'masculine', 'neuter', 'singular'),
      ],
    }, ctx);
    expect(t.kind).toBe('adjective');
    expect(t.sections[0].columns).toEqual(['masculine', 'feminine', 'neuter', 'plural']);
    expect(cells(t.sections[0])).toEqual([['nominative', ['до́брий', 'до́бра', 'до́бре', 'до́брі']]]);
  });

  it('personal pronouns: cases of their own paradigm only', () => {
    const P = ['personal', 'pronoun'];
    const t = extractTable({
      pos: 'pron',
      lemma: 'я',
      args: {},
      forms: [
        f('я', 'first-person', 'nominative', 'singular', ...P),
        f('мене́', 'first-person', 'genitive', 'singular', ...P),
        f('тебе́', 'genitive', 'informal', 'second-person', 'singular', ...P),
      ],
    }, ctx);
    expect(t.kind).toBe('pronoun');
    expect(cells(t.sections[0])).toEqual([['nominative', ['я']], ['genitive', ['мене́']]]);
  });

  it('returns null when there is no usable table', () => {
    expect(extractTable({ pos: 'adv', args: {}, forms: [] }, ctx)).toBeNull();
    expect(extractTable({ pos: 'verb', args: {}, forms: [f('-', 'first-person', 'present', 'singular')] }, ctx)).toBeNull();
  });
});

import { createIndex, addEntry } from '../lib/kaikki.js';
import { parseFrequency, fold } from '../lib/fold.js';
import { buildWords } from '../lib/build.js';

describe('buildWords attaches tables', () => {
  it('adds one table per part of speech, with common flags and native audio from form entries', () => {
    const ix = createIndex();
    addEntry(ix, {
      word: 'робити', pos: 'verb', lang_code: 'uk', senses: [{ glosses: ['to do'] }],
      head_templates: [{ args: { 1: 'роби́ти', 2: 'impf', pf: 'зроби́ти' } }],
      forms: [
        { form: 'роблю́', source: 'conjugation', tags: ['first-person', 'imperfective', 'present', 'singular'] },
        { form: 'ро́биш', source: 'conjugation', tags: ['imperfective', 'present', 'second-person', 'singular'] },
      ],
    });
    // A form-of entry with its own recording.
    addEntry(ix, { word: 'роблю', pos: 'verb', lang_code: 'uk', sounds: [{ mp3_url: 'https://x/роблю.mp3' }], senses: [{ tags: ['form-of'], form_of: [{ word: 'роби́ти' }], glosses: ['1sg of робити'] }] });
    const [w] = buildWords(ix, fold(parseFrequency('робити 10\nроблю 60\n'), ix), { commonTokens: new Set(['роблю']) });
    expect(w.tables).toHaveLength(1);
    expect(w.tables[0]).toMatchObject({ kind: 'verb', partner: 'зробити' });
    expect(w.tables[0].sections[0].rows[0].cells[0]).toMatchObject({ form: 'роблю́', common: true, audio: { url: 'https://x/роблю.mp3' } });
    expect(w.tables[0].sections[0].rows[1].cells[0]).toMatchObject({ form: 'ро́биш', common: false, audio: null });
  });
});
