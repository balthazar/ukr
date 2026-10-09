import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { checkPronunciation } from '../lib/match.js';
import { audioLabel } from '../lib/audioLabel.js';
import { canRecognize, canRecord, canSpeak, micHint, recognizeOnce, speak, startRecording, ukrainianVoice } from '../lib/speech.js';

const RESULT_TEXT = { pass: 'Match', close: 'Close', miss: 'Not quite' };

export default function PronouncePanel({ word }) {
  const [voice, setVoice] = useState(() => ukrainianVoice());
  const [recording, setRecording] = useState(false);
  const [mine, setMine] = useState(null);
  const [check, setCheck] = useState(null);
  const [error, setError] = useState('');
  const recRef = useRef(null);
  const starting = useRef(false);
  const native = word.audio?.[0]?.url;

  useEffect(() => {
    if (!canSpeak) return;
    const on = () => setVoice(ukrainianVoice());
    speechSynthesis.addEventListener('voiceschanged', on);
    return () => speechSynthesis.removeEventListener('voiceschanged', on);
  }, []);

  useEffect(() => () => mine && URL.revokeObjectURL(mine), [mine]);

  // Leaving the card mid-recording must release the microphone.
  const mounted = useRef(true);
  useEffect(
    () => () => {
      mounted.current = false;
      recRef.current?.stop();
    },
    [],
  );

  function listen() {
    if (native) {
      new Audio(native).play().catch(() => {
        if (canSpeak) speak(word.lemma);
      });
    } else {
      speak(word.lemma);
    }
  }

  async function toggleRecord() {
    setError('');
    if (recording) {
      const rec = recRef.current;
      recRef.current = null;
      setRecording(false);
      setMine(await rec.stop());
      return;
    }
    if (starting.current) return;
    starting.current = true;
    try {
      const rec = await startRecording();
      if (!mounted.current) return void rec.stop();
      recRef.current = rec;
      setRecording(true);
    } catch (err) {
      setError(micHint(err));
    } finally {
      starting.current = false;
    }
  }

  async function runCheck() {
    setError('');
    setCheck({ listening: true });
    try {
      const alternatives = await recognizeOnce();
      const r = checkPronunciation(alternatives, [word.lemma, ...(word.forms ?? [])]);
      setCheck(r);
      api(`/words/${word._id}/mic`, { method: 'POST', body: { pass: r.result === 'pass' } }).catch(() => {});
    } catch (err) {
      setCheck(null);
      setError(micHint(err));
    }
  }

  const canListen = Boolean(native) || (canSpeak && voice);

  return (
    <div className="pronounce">
      <div className="row">
        <button className="primary" onClick={listen} disabled={!canListen}>
          Listen
        </button>
        <span className="muted small">{audioLabel(word.audio, Boolean(canSpeak && voice))}</span>
      </div>
      <div className="row" style={{ marginTop: 8 }}>
        {canRecord && <button onClick={toggleRecord}>{recording ? 'Stop' : 'Record'}</button>}
        {mine && <button onClick={() => new Audio(mine).play()}>Play mine</button>}
        {canRecognize && (
          <button onClick={runCheck} disabled={check?.listening}>
            {check?.listening ? 'Listening...' : 'Check'}
          </button>
        )}
      </div>
      {check && !check.listening && (
        <p>
          <span className={`result-${check.result}`}>{RESULT_TEXT[check.result]}</span>{' '}
          <span className="muted">{check.heard ? `heard "${check.heard}"` : "didn't catch anything"}</span>
        </p>
      )}
      {error && <p className="error small">{error}</p>}
    </div>
  );
}
