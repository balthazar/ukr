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

export function fold(freqPairs, index, { maxForms = 12, russian = new Set() } = {}) {
  const counts = new Map();
  for (const [raw, count] of freqPairs) {
    const token = plain(raw);
    // `russian` holds tokens explained by Russian lines in the subtitles (see russian.js).
    if (isUkrainianWord(token) && !russian.has(token)) counts.set(token, (counts.get(token) ?? 0) + count);
  }

  const acc = new Map();
  for (const [token, count] of counts) {
    // A token that is itself a lemma counts only for that lemma. A form shared by
    // several lemmas goes to the one seen most often on its own (тебе -> ти, not він).
    let lemma = index.lemmas.has(token) ? token : null;
    if (!lemma) {
      const candidates = [...(index.formToLemmas.get(token) ?? [])].filter((l) => index.lemmas.has(l));
      lemma = candidates.reduce((best, l) => ((counts.get(l) ?? 0) > (counts.get(best) ?? 0) ? l : best), candidates[0]);
    }
    if (!lemma) continue;
    let forms = acc.get(lemma);
    if (!forms) acc.set(lemma, (forms = new Map()));
    forms.set(token, count);
  }

  return [...acc]
    .map(([lemma, forms]) => ({
      lemma,
      freq: [...forms.values()].reduce((a, b) => a + b, 0),
      forms: [...forms].sort((x, y) => y[1] - x[1]).slice(0, maxForms).map(([f]) => f),
    }))
    .filter((f) => f.freq > 0)
    .sort((a, b) => b.freq - a.freq);
}
