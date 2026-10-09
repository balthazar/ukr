import crypto from 'node:crypto';
import { plain } from './kaikki.js';

// Pre-rendered speech for words and table forms with no recording, served by the app at /tts/<file>.
export const ttsFile = (text) => `${crypto.createHash('sha1').update(text).digest('hex').slice(0, 12)}.mp3`;
const ttsAudio = (text) => ({ url: `/tts/${ttsFile(text)}`, source: 'tts' });

// Every table cell of a word, for rendering and attaching.
export const tableCells = (w) => (w.tables ?? []).flatMap((t) => t.sections.flatMap((s) => s.rows.flatMap((r) => r.cells))).filter(Boolean);

export function attachTts(words, exists) {
  return words.map((w) => {
    const audio = !w.audio.length && exists(ttsFile(w.lemma)) ? [ttsAudio(w.lemma)] : w.audio;
    const tables = (w.tables ?? []).map((t) => ({
      ...t,
      sections: t.sections.map((s) => ({
        ...s,
        rows: s.rows.map((r) => ({
          ...r,
          cells: r.cells.map((c) => (c && !c.audio && exists(ttsFile(plain(c.form))) ? { ...c, audio: ttsAudio(plain(c.form)) } : c)),
        })),
      })),
    }));
    return { ...w, audio, ...(w.tables ? { tables } : {}) };
  });
}

// RMS dB per 50 ms window. A clean rendering ends quieter than it speaks; a burst or
// cut-off at the end leaves the last window loud.
export function hasLoudTail(rmsDb) {
  if (!rmsDb.length) return true;
  const tail = rmsDb.at(-1);
  return tail > Math.max(...rmsDb) - 10;
}
