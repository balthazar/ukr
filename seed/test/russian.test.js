import { describe, it, expect } from 'vitest';
import { russianOnlyTokens } from '../lib/russian.js';

describe('russianOnlyTokens', () => {
  // ты/это contain Russian-only letters, so they calibrate the contamination rate.
  const uk = [['тут', 68], ['его', 10], ['что', 10], ['это', 10], ['ты', 10], ['шо', 5]];
  const ru = [['тут', 10], ['его', 10], ['что', 10], ['это', 10], ['ты', 10]];

  it('flags tokens whose Ukrainian frequency is explained by Russian contamination alone', () => {
    expect([...russianOnlyTokens(uk, ru)].sort()).toEqual(['его', 'что', 'это', 'ты'].sort());
  });

  it('keeps words used natively in Ukrainian and words absent from the Russian list', () => {
    const flagged = russianOnlyTokens(uk, ru);
    expect(flagged.has('тут')).toBe(false);
    expect(flagged.has('шо')).toBe(false);
  });

  it('flags nothing when there is no Russian-only calibration sample', () => {
    expect(russianOnlyTokens([['тут', 5]], [['тут', 5]]).size).toBe(0);
  });
});
