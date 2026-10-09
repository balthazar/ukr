import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { checkPronunciation } from '../lib/match.js';
import { canRecognize, canRecord, canSpeak, micHint, recognizeOnce, speak, startRecording, ukrainianVoice } from '../lib/speech.js';

const RESULT_TEXT = { pass: 'Match', close: 'Close', miss: 'Not quite' };

export default function PronouncePanel({ word }) {
  const [voice, setVoice] = useState(() => ukrainianVoice());
  const [recording, setRecording] = useState(false);
  const [mine, setMine] = useState(null);
  const [check, setCheck] = useState(null);
  const [error, setError] = useState('');
  const recRef = useRef(null);
  const native = word.audio?.[0]?.url;

  useEffect(() => {
    if (!canSpeak) return;
    const on = () => setVoice(ukrainianVoice());
    speechSynthesis.addEventListener('voiceschanged', on);
    return () => speechSynthesis.removeEventListener('voiceschanged', on);
  }, []);

  useEffect(() => () => mine && URL.revokeObjectURL(mine), [mine]);

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
      setMine(await recRef.current.stop());
      setRecording(false);
      return;
    }
    try {
      recRef.current = await startRecording();
      setRecording(true);
    } catch (err) {
      setError(micHint(err));
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
        <span className="muted small">
          {native ? 'native recording' : canListen ? 'synthetic voice' : 'no audio available on this device'}
        </span>
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
