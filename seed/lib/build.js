import { respell } from './respell.js';

// A vowel letter's recording is the vowel itself; a consonant's is its name (в = "ve").
const VOWEL_LETTERS = new Set([...'аеиіоуєюяї']);

function audioFor(index, lemma, lem) {
  if (lem.audio.length) return lem.audio;
  const letter = index.letterAudio?.get(lemma);
  return letter && VOWEL_LETTERS.has(lemma) ? [{ url: letter, source: 'commons-letter' }] : [];
}

export function buildWords(index, folded, { limit = 5000 } = {}) {
  const out = [];
  for (const f of folded) {
    if (out.length >= limit) break;
    const lem = index.lemmas.get(f.lemma);
    if (!lem?.glosses.length) continue;
    const stressed = lem.stressed ?? f.lemma;
    out.push({
      rank: out.length + 1,
      lemma: f.lemma,
      stressed,
      respelling: respell(stressed),
      ipa: lem.ipa ?? '',
      pos: lem.pos.join(', '),
      glosses: lem.glosses.slice(0, 5),
      forms: f.forms,
      audio: audioFor(index, f.lemma, lem),
      freq: f.freq,
    });
  }
  return out;
}
