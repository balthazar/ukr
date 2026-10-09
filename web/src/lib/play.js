import { canSpeak, speak } from './speech.js';

// Plays a word's recording; the device voice is only a last resort.
export function playWord(word) {
  const url = word.audio?.[0]?.url;
  if (url) new Audio(url).play().catch(() => canSpeak && speak(word.lemma));
  else if (canSpeak) speak(word.lemma);
}
