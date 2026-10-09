import { describe, it, expect } from 'vitest';
import { normalize, levenshtein, checkPronunciation } from '../src/lib/match.js';

describe('normalize', () => {
  it('lowercases, strips stress and punctuation, unifies apostrophes', () => {
    expect(normalize('Дя́кую.')).toBe('дякую');
    expect(normalize('сім’я!')).toBe("сім'я");
    expect(normalize('  Ну,  дякую ')).toBe('ну дякую');
  });
});

describe('levenshtein', () => {
  it.each([['', '', 0], ['кіт', 'кіт', 0], ['кіт', 'кит', 1], ['дякую', 'дякуєм', 2], ['', 'abc', 3]])('%s/%s', (a, b, d) => {
    expect(levenshtein(a, b)).toBe(d);
  });
});

describe('checkPronunciation', () => {
  const targets = ['дякувати', 'дякую', "сім'я"];
  it('passes on any alternative matching the lemma or a form', () => {
    expect(checkPronunciation(['Дякую.'], targets)).toEqual({ result: 'pass', heard: 'дякую' });
    expect(checkPronunciation(['дякуй', 'дякую'], targets).result).toBe('pass');
  });
  it('passes when the word appears inside a multi-word result', () => {
    expect(checkPronunciation(['ну дякую'], targets).result).toBe('pass');
  });
  it('matches curly apostrophes', () => {
    expect(checkPronunciation(['Сім’я'], targets).result).toBe('pass');
  });
  it('is close at edit distance 1', () => {
    expect(checkPronunciation(['дякуя'], targets)).toEqual({ result: 'close', heard: 'дякуя' });
  });
  it('misses otherwise, and handles no speech', () => {
    expect(checkPronunciation(['привіт'], targets)).toEqual({ result: 'miss', heard: 'привіт' });
    expect(checkPronunciation([], targets)).toEqual({ result: 'miss', heard: '' });
  });
});
