import { describe, it, expect } from 'vitest';
import { matchesFilter } from '../src/lib/filters.js';

describe('matchesFilter', () => {
  it.each([
    ['tolearn', null, true], ['tolearn', 'learning', true], ['tolearn', 'known', false],
    ['new', null, true], ['new', 'learning', false], ['new', 'known', false],
    ['learning', 'learning', true], ['learning', 'known', false],
    ['known', 'known', true], ['known', 'learning', false],
    ['', 'known', true], ['', null, true],
  ])('filter %j, status %j -> %s', (filter, status, expected) => {
    expect(matchesFilter(status, filter)).toBe(expected);
  });
});
