import fs from 'node:fs';
import { loadKaikki, plain } from './lib/kaikki.js';
import { parseFrequency, fold } from './lib/fold.js';
import { buildWords } from './lib/build.js';
import { russianOnlyTokens } from './lib/russian.js';
import { attachTts } from './lib/tts.js';

const raw = new URL('./raw/', import.meta.url);
const outDir = new URL('./out/', import.meta.url);

const index = await loadKaikki(new URL('kaikki.jsonl', raw));
console.log(`kaikki: ${index.lemmas.size} lemmas, ${index.formToLemmas.size} forms`);
const freq = parseFrequency(fs.readFileSync(new URL('uk_full.txt', raw), 'utf8'));
const russian = russianOnlyTokens(freq, parseFrequency(fs.readFileSync(new URL('ru_50k.txt', raw), 'utf8')));
console.log(`russian-only tokens flagged: ${russian.size}`);
// Forms seen at least this often in the subtitles are flagged "common" in the tables.
const COMMON_MIN = 50;
const commonTokens = new Set(freq.filter(([t, n]) => n >= COMMON_MIN && !russian.has(t)).map(([t]) => plain(t)));
const ttsDir = new URL('../web/public/tts/', import.meta.url);
const words = attachTts(
  buildWords(index, fold(freq, index, { russian }), { limit: Number(process.env.LIMIT || 5000), commonTokens }),
  (file) => fs.existsSync(new URL(file, ttsDir)),
);

fs.mkdirSync(outDir, { recursive: true });
// One word per line keeps diffs reviewable.
fs.writeFileSync(new URL('words.json', outDir), `[\n${words.map((w) => JSON.stringify(w)).join(',\n')}\n]\n`);
console.log(`wrote ${words.length} words`);
console.log(words.slice(0, 30).map((w) => `${w.rank}. ${w.lemma} ${w.respelling} (${w.glosses[0]})`).join('\n'));
