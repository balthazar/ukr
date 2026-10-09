// Again, Hard, Good, Easy -> SM-2 quality.
const QUALITY = [1, 3, 4, 5];
const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;

export function grade(prev, g, now) {
  if (!Number.isInteger(g) || g < 0 || g > 3) throw new RangeError(`grade must be 0..3, got ${g}`);
  const q = QUALITY[g];
  const p = { ease: 2.5, interval: 0, reps: 0, lapses: 0, ...prev };
  const ease = Math.max(1.3, p.ease + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));

  if (q < 3) {
    return { ease, interval: 0, reps: 0, lapses: p.lapses + 1, due: new Date(now.getTime() + 10 * MINUTE), lastReviewed: now };
  }

  const reps = p.reps + 1;
  let interval = reps === 1 ? 1 : reps === 2 ? 6 : Math.round(p.interval * p.ease);
  if (g === 1) interval = Math.max(1, Math.round(interval * 0.8));
  if (g === 3) interval = Math.round(interval * 1.3);
  return { ease, interval, reps, lapses: p.lapses, due: new Date(now.getTime() + interval * DAY), lastReviewed: now };
}
