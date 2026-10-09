import { describe, it, expect } from 'vitest';
import { grade } from '../src/lib/sm2.js';

const now = new Date('2026-01-01T00:00:00Z');
const DAY = 86400000;
const days = (p) => (p.due - now) / DAY;

describe('sm2.grade', () => {
  it('new card + Good: 1 day, ease unchanged', () => {
    const p = grade({}, 2, now);
    expect(p).toMatchObject({ reps: 1, interval: 1, ease: 2.5, lapses: 0 });
    expect(days(p)).toBe(1);
    expect(p.lastReviewed).toEqual(now);
  });

  it('second Good: 6 days; third Good: interval * previous ease', () => {
    const p2 = grade({ reps: 1, interval: 1, ease: 2.5 }, 2, now);
    expect(p2).toMatchObject({ reps: 2, interval: 6 });
    const p3 = grade({ reps: 2, interval: 6, ease: 2.5 }, 2, now);
    expect(p3).toMatchObject({ reps: 3, interval: 15 });
  });

  it('Again resets reps, counts a lapse, comes back in 10 minutes', () => {
    const p = grade({ reps: 4, interval: 30, ease: 2.5, lapses: 1 }, 0, now);
    expect(p).toMatchObject({ reps: 0, interval: 0, lapses: 2 });
    expect(p.ease).toBeCloseTo(1.96);
    expect(p.due - now).toBe(10 * 60 * 1000);
  });

  it('ease never drops below 1.3', () => {
    expect(grade({ ease: 1.3 }, 0, now).ease).toBe(1.3);
  });

  it('Hard shrinks the interval by 0.8 (min 1) and lowers ease', () => {
    const p = grade({ reps: 1, interval: 1, ease: 2.5 }, 1, now);
    expect(p.interval).toBe(5); // round(6 * 0.8)
    expect(p.ease).toBeCloseTo(2.36);
    expect(grade({}, 1, now).interval).toBe(1);
  });

  it('Easy stretches the interval by 1.3 and raises ease', () => {
    const p = grade({ reps: 2, interval: 6, ease: 2.5 }, 3, now);
    expect(p.interval).toBe(20); // round(round(6 * 2.5) * 1.3)
    expect(p.ease).toBeCloseTo(2.6);
  });

  it('rejects grades outside 0..3', () => {
    for (const g of [-1, 4, 1.5, '2', undefined]) expect(() => grade({}, g, now)).toThrow(RangeError);
  });
});
