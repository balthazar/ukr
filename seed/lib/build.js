import { respell } from './respell.js';

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
      audio: lem.audio,
      freq: f.freq,
    });
  }
  return out;
}
