const LABELS = {
  commons: 'native recording',
  'commons-letter': 'native recording (the letter sound)',
  tts: 'synthetic voice (pre-rendered)',
};

export function audioLabel(audio, deviceVoice) {
  const source = audio?.[0]?.source;
  if (source) return LABELS[source] ?? 'recording';
  return deviceVoice ? "synthetic voice (this device's)" : 'no audio available on this device';
}
