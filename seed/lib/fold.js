import { plain, isUkrainianWord } from './kaikki.js';

export function parseFrequency(text) {
  const out = [];
  for (const line of text.split('\n')) {
    const [token, count] = line.trim().split(/\s+/);
    const n = Number(count);
    if (token && Number.isFinite(n) && n > 0) out.push([token, n]);
  }
  return out;
}

export function fold(freqPairs, index, { maxForms = 12 } = {}) {
  const acc = new Map();
  for (const [raw, count] of freqPairs) {
    const token = plain(raw);
    if (!isUkrainianWord(token)) continue;
    // A token that is itself a lemma counts only for that lemma.
    const targets = index.lemmas.has(token)
      ? [token]
      : [...(index.formToLemmas.get(token) ?? [])].filter((l) => index.lemmas.has(l));
    for (const lemma of targets) {
      let a = acc.get(lemma);
      if (!a) acc.set(lemma, (a = { freq: 0, forms: new Map() }));
      a.freq += count;
      a.forms.set(token, (a.forms.get(token) ?? 0) + count);
    }
  }
  return [...acc]
    .map(([lemma, a]) => ({
      lemma,
      freq: a.freq,
      forms: [...a.forms].sort((x, y) => y[1] - x[1]).slice(0, maxForms).map(([f]) => f),
    }))
    .sort((a, b) => b.freq - a.freq);
}
