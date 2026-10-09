import { respell } from './respell.js';
import { extractTable } from './tables.js';

// A vowel letter's recording is the vowel itself; a consonant's is its name (в = "ve").
const VOWEL_LETTERS = new Set([...'аеиіоуєюяї']);

function audioFor(index, lemma, lem) {
  if (lem.audio.length) return lem.audio;
  const letter = index.letterAudio?.get(lemma);
  return letter && VOWEL_LETTERS.has(lemma) ? [{ url: letter, source: 'commons-letter' }] : [];
}

// Glosses Wiktionary merges into a lemma that are wrong for learners (noun "ego" on я).
export const EXCLUDED_GLOSSES = { я: ['ego'] };

export function buildWords(index, folded, { limit = 5000, excludedGlosses = EXCLUDED_GLOSSES, commonTokens = new Set() } = {}) {
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
      glosses: lem.glosses.filter((g) => !excludedGlosses[f.lemma]?.includes(g)).slice(0, 5),
      forms: f.forms,
      audio: audioFor(index, f.lemma, lem),
      freq: f.freq,
      tables: (lem.inflections ?? []).map((i) => extractTable(i, { common: commonTokens, audio: index.formAudio })).filter(Boolean),
    });
  }
  return out;
}
