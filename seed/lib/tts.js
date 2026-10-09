import crypto from 'node:crypto';

// Pre-rendered speech for words with no recording, served by the app at /tts/<file>.
export const ttsFile = (lemma) => `${crypto.createHash('sha1').update(lemma).digest('hex').slice(0, 12)}.mp3`;

export function attachTts(words, exists) {
  return words.map((w) =>
    !w.audio.length && exists(ttsFile(w.lemma)) ? { ...w, audio: [{ url: `/tts/${ttsFile(w.lemma)}`, source: 'tts' }] } : w,
  );
}

// RMS dB per 50 ms window. A clean rendering ends quieter than it speaks; a burst or
// cut-off at the end leaves the last window loud.
export function hasLoudTail(rmsDb) {
  if (!rmsDb.length) return true;
  const tail = rmsDb.at(-1);
  return tail > Math.max(...rmsDb) - 10;
}
