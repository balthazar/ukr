import { describe, it, expect } from 'vitest';
import { audioLabel } from '../src/lib/audioLabel.js';

describe('audioLabel', () => {
  it.each([
    [[{ url: 'u', source: 'commons' }], true, 'native recording'],
    [[{ url: 'u', source: 'commons-letter' }], true, 'native recording (the letter sound)'],
    [[{ url: '/tts/x.mp3', source: 'tts' }], true, 'synthetic voice (pre-rendered)'],
    [[], true, "synthetic voice (this device's)"],
    [[], false, 'no audio available on this device'],
    [undefined, false, 'no audio available on this device'],
  ])('%j / device voice %s', (audio, deviceVoice, label) => {
    expect(audioLabel(audio, deviceVoice)).toBe(label);
  });
});
