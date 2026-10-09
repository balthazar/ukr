import { describe, it, expect } from 'vitest';
import { parseHash } from '../src/route.js';
import { displayGloss } from '../src/lib/gloss.js';

describe('parseHash', () => {
  it.each([
    ['', ['today', undefined, {}]],
    ['#/words', ['words', undefined, {}]],
    ['#/words/abc', ['words', 'abc', {}]],
    ['#/words?q=easy&f=known&p=2', ['words', undefined, { q: 'easy', f: 'known', p: '2' }]],
    ['#/words?q=%D0%B4%D1%8F%D0%BA', ['words', undefined, { q: 'дяк' }]],
    ['#/words/%E0', ['words', undefined, {}]],
  ])('%s', (hash, [section, param, query]) => {
    const r = parseHash(hash);
    expect([r.section, r.param, Object.fromEntries(r.query)]).toEqual([section, param, query]);
  });
});

describe('displayGloss', () => {
  const glosses = ['lightly', 'easy, simple', 'uneasy'];
  it('shows the first gloss without a query', () => expect(displayGloss(glosses, '')).toBe('lightly'));
  it('shows the first gloss matching the query at a word start', () => expect(displayGloss(glosses, 'easy')).toBe('easy, simple'));
  it('falls back to the first gloss for Ukrainian queries', () => expect(displayGloss(glosses, 'лег')).toBe('lightly'));
  it('survives regex characters and empty glosses', () => {
    expect(displayGloss(glosses, '(')).toBe('lightly');
    expect(displayGloss([], 'x')).toBe('');
  });
});
