// macOS only: pre-render speech (Apple's Lesya voice) for words with no recording.
// Usage: npm run build && npm run tts
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { ttsFile, attachTts, hasLoudTail, tableCells } from './lib/tts.js';
import { plain } from './lib/kaikki.js';

const run = promisify(execFile);
const VOICE = process.env.TTS_VOICE || 'Lesya';
const CONCURRENCY = 10;
// Table forms are voiced for the top lemmas, plus any form common in the subtitles.
const FORMS_TOP = Number(process.env.TTS_FORMS_TOP || 1000);
const wordsPath = new URL('./out/words.json', import.meta.url);
const outDir = new URL('../web/public/tts/', import.meta.url);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ukr-tts-'));

async function rmsWindows(file) {
  const { stderr } = await run('ffmpeg', ['-hide_banner', '-i', file, '-af',
    'asetnsamples=n=1102,astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level', '-f', 'null', '-']);
  const db = [...stderr.matchAll(/RMS_level=(-?[\d.]+|-inf)/g)].map((m) => (m[1] === '-inf' ? -120 : Number(m[1])));
  while (db.length && db.at(-1) < -60) db.pop(); // trailing silence is not part of the ending
  return db;
}

async function render(text) {
  const raw = path.join(tmp, `${ttsFile(text)}.aiff`);
  await run('say', ['-v', VOICE, '-o', raw, '--', text]);
  if (hasLoudTail(await rmsWindows(raw))) return { text, ok: false };
  // Trim silence at both ends, fade the last 30 ms, normalize loudness, pad 80 ms of silence.
  const af = [
    'silenceremove=start_periods=1:start_threshold=-50dB',
    'areverse', 'silenceremove=start_periods=1:start_threshold=-50dB', 'afade=t=in:d=0.03', 'areverse',
    'afade=t=in:d=0.01', 'loudnorm=I=-18:TP=-2:LRA=7', 'aresample=24000', 'apad=pad_dur=0.08', 'aformat=sample_fmts=s16p:channel_layouts=mono',
  ].join(',');
  await run('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', raw, '-af', af, '-ac', '1', '-b:a', '32k', fileURLToPathSafe(new URL(ttsFile(text), outDir))]);
  fs.rmSync(raw, { force: true });
  return { text, ok: true };
}

function fileURLToPathSafe(u) {
  return decodeURIComponent(u.pathname);
}

const words = JSON.parse(fs.readFileSync(wordsPath, 'utf8'));
fs.mkdirSync(outDir, { recursive: true });
const exists = (f) => fs.existsSync(new URL(f, outDir));
const texts = new Set();
words.forEach((w, i) => {
  if (!w.audio.length) texts.add(w.lemma);
  for (const c of tableCells(w)) if (!c.audio && (i < FORMS_TOP || c.common)) texts.add(plain(c.form));
});
const todo = [...texts].filter((t) => !exists(ttsFile(t)));
console.log(`rendering ${todo.length} words and forms with ${VOICE}`);

const results = [];
for (let i = 0; i < todo.length; i += CONCURRENCY) {
  results.push(...(await Promise.all(todo.slice(i, i + CONCURRENCY).map(render))));
}
const rejected = results.filter((r) => !r.ok).map((r) => r.text);
console.log(`rendered ${results.length - rejected.length}, rejected for a loud ending: ${rejected.length}${rejected.length ? ` (${rejected.slice(0, 40).join(', ')})` : ''}`);

const updated = attachTts(words, exists);
fs.writeFileSync(wordsPath, `[\n${updated.map((w) => JSON.stringify(w)).join(',\n')}\n]\n`);
console.log(`words with audio: ${updated.filter((w) => w.audio.length).length}/${updated.length}`);
const cells = updated.flatMap(tableCells);
console.log(`table cells with audio: ${cells.filter((c) => c.audio).length}/${cells.length}`);
fs.rmSync(tmp, { recursive: true, force: true });
