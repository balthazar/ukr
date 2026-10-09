import { useEffect, useState } from 'react';
import { api } from '../api.js';
import WordDetails from '../components/WordDetails.jsx';
import { canSpeak, speak } from '../lib/speech.js';

const GRADES = [['Again', 0], ['Hard', 1], ['Good', 2], ['Easy', 3]];

export default function Review() {
  const [queue, setQueue] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/review').then((r) => setQueue(r.cards)).catch((e) => setError(e.message));
  }, []);

  const card = queue?.[0];

  useEffect(() => {
    setRevealed(false);
  }, [card?.word._id, done]);

  function playFront() {
    const url = card.word.audio?.[0]?.url;
    if (url) new Audio(url).play().catch(() => canSpeak && speak(card.word.lemma));
    else if (canSpeak) speak(card.word.lemma);
  }

  async function grade(g) {
    setBusy(true);
    setError('');
    try {
      await api(`/review/${card.word._id}`, { method: 'POST', body: { grade: g } });
      setQueue(([head, ...rest]) => (g === 0 ? [...rest, { ...head, isNew: false }] : rest));
      setDone((n) => n + 1);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (error && !queue) return <p className="error">{error}</p>;
  if (!queue) return <p className="muted">Loading...</p>;
  if (!card) {
    return (
      <section>
        <h1>Review</h1>
        <p>{done ? `Done for now. ${done} reviews this session.` : 'Nothing due. Come back later or browse Words.'}</p>
        <a className="button" href="#/today">Back to Today</a>
      </section>
    );
  }

  return (
    <section>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1>Review</h1>
        <span className="muted small">{queue.length} left{card.isNew ? ' · new word' : ''}</span>
      </div>
      {!revealed ? (
        <div className="card" style={{ textAlign: 'center' }}>
          <div className="big-word">{card.word.stressed || card.word.lemma}</div>
          <div className="row" style={{ justifyContent: 'center', marginTop: 12 }}>
            <button onClick={playFront}>Listen</button>
            <button className="primary" onClick={() => setRevealed(true)}>Show answer</button>
          </div>
        </div>
      ) : (
        <>
          <WordDetails word={card.word} />
          <div className="grades">
            {GRADES.map(([label, g]) => (
              <button key={g} className={g === 2 ? 'primary' : ''} disabled={busy} onClick={() => grade(g)}>
                {label}
              </button>
            ))}
          </div>
        </>
      )}
      {error && <p className="error">{error}</p>}
    </section>
  );
}
