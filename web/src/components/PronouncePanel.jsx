import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { checkPronunciation } from '../lib/match.js';
import { audioLabel } from '../lib/audioLabel.js';
import { playWord } from '../lib/play.js';
import { canRecognize, canRecord, canSpeak, micHint, recognizeOnce, startRecording, ukrainianVoice } from '../lib/speech.js';

const RESULT_TEXT = { pass: 'Match', close: 'Close', miss: 'Not quite' };

export default function PronouncePanel({ word }) {
  const [voice, setVoice] = useState(() => ukrainianVoice());
  const [recording, setRecording] = useState(false);
  const [mine, setMine] = useState(null);
  const [check, setCheck] = useState(null);
  const [error, setError] = useState('');
  const recRef = useRef(null);
  const starting = useRef(false);

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

  const canListen = Boolean(word.audio?.length) || (canSpeak && voice);

  return (
    <div className="pronounce">
      <div className="row">
        <button className="btn primary" onClick={() => playWord(word)} disabled={!canListen}>
          ▶ Listen
        </button>
        {canRecord && <button className="btn" onClick={toggleRecord}>{recording ? '■ Stop' : '● Record'}</button>}
        {mine && <button className="btn" onClick={() => new Audio(mine).play()}>Play mine</button>}
        {canRecognize && (
          <button className="btn" onClick={runCheck} disabled={check?.listening}>
            {check?.listening ? 'Listening...' : 'Check'}
          </button>
        )}
      </div>
      <div className="muted small hint">{audioLabel(word.audio, Boolean(canSpeak && voice))}</div>
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
