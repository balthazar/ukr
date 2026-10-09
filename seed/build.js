import fs from 'node:fs';
import { loadKaikki } from './lib/kaikki.js';
import { parseFrequency, fold } from './lib/fold.js';
import { buildWords } from './lib/build.js';

const raw = new URL('./raw/', import.meta.url);
const outDir = new URL('./out/', import.meta.url);

const index = await loadKaikki(new URL('kaikki.jsonl', raw));
console.log(`kaikki: ${index.lemmas.size} lemmas, ${index.formToLemmas.size} forms`);
const freq = parseFrequency(fs.readFileSync(new URL('uk_full.txt', raw), 'utf8'));
const words = buildWords(index, fold(freq, index), { limit: Number(process.env.LIMIT || 5000) });

fs.mkdirSync(outDir, { recursive: true });
// One word per line keeps diffs reviewable.
fs.writeFileSync(new URL('words.json', outDir), `[\n${words.map((w) => JSON.stringify(w)).join(',\n')}\n]\n`);
console.log(`wrote ${words.length} words`);
console.log(words.slice(0, 30).map((w) => `${w.rank}. ${w.lemma} ${w.respelling} (${w.glosses[0]})`).join('\n'));
