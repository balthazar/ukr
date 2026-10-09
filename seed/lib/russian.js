// The Ukrainian subtitle corpus contains Russian lines. A word used only in Russian
// shows up in it at (contamination rate x its Russian frequency); a word Ukrainian
// actually uses shows up well above that. Calibrate the rate on tokens with
// Russian-only letters, then flag tokens that don't clear it by THRESHOLD.
const RUSSIAN_ONLY_LETTERS = /[ыэъё]/;
const THRESHOLD = 1.35;

const total = (pairs) => pairs.reduce((sum, [, n]) => sum + n, 0);

export function russianOnlyTokens(ukPairs, ruPairs, { threshold = THRESHOLD } = {}) {
  const uk = new Map(ukPairs);
  const ukTotal = total(ukPairs);
  const ruTotal = total(ruPairs);
  const ratio = (token, ruCount) => (uk.get(token) / ukTotal) / (ruCount / ruTotal);

  const calibration = ruPairs
    .filter(([t]) => RUSSIAN_ONLY_LETTERS.test(t) && uk.has(t))
    .map(([t, n]) => ratio(t, n))
    .sort((a, b) => a - b);
  if (!calibration.length) return new Set();
  const rate = calibration[Math.floor(calibration.length / 2)];

  return new Set(ruPairs.filter(([t, n]) => uk.has(t) && ratio(t, n) / rate < threshold).map(([t]) => t));
}
