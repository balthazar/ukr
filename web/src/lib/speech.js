const SR = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : undefined;

export const canRecognize = Boolean(SR);
export const canRecord =
  typeof window !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia) && typeof MediaRecorder !== 'undefined';
export const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;

export function recognizeOnce({ lang = 'uk-UA', maxAlternatives = 5 } = {}) {
  return new Promise((resolve, reject) => {
    const rec = new SR();
    rec.lang = lang;
    rec.maxAlternatives = maxAlternatives;
    rec.interimResults = false;
    rec.continuous = false;
    let settled = false;
    rec.onresult = (e) => {
      settled = true;
      resolve(Array.from(e.results[0], (alt) => alt.transcript));
    };
    rec.onerror = (e) => {
      settled = true;
      if (e.error === 'no-speech') resolve([]);
      else reject(Object.assign(new Error(e.error), { code: e.error }));
    };
    rec.onend = () => {
      if (!settled) resolve([]);
    };
    rec.start();
  });
}

export function ukrainianVoice() {
  if (!canSpeak) return null;
  return speechSynthesis.getVoices().find((v) => v.lang?.toLowerCase().startsWith('uk')) ?? null;
}

export function speak(text) {
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'uk-UA';
  const voice = ukrainianVoice();
  if (voice) u.voice = voice;
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
}

export async function startRecording() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const rec = new MediaRecorder(stream);
  const chunks = [];
  rec.ondataavailable = (e) => chunks.push(e.data);
  const stopped = new Promise((resolve) => {
    rec.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      resolve(URL.createObjectURL(new Blob(chunks, { type: rec.mimeType })));
    };
  });
  rec.start();
  return { stop: () => (rec.stop(), stopped) };
}

export function micHint(err) {
  const code = err?.code || err?.name;
  if (code === 'not-allowed' || code === 'NotAllowedError' || code === 'service-not-allowed') {
    return 'Microphone access was blocked. Allow it for this site in your browser settings, then try again.';
  }
  if (code === 'NotFoundError' || code === 'audio-capture') return 'No microphone found.';
  if (code === 'network') return 'Speech recognition needs a network connection.';
  return `Microphone error: ${err?.message || code}`;
}
