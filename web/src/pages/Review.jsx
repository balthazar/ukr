import { useEffect, useState } from 'react';
import { api } from '../api.js';
import WordDetails from '../components/WordDetails.jsx';
import { playWord } from '../lib/play.js';

const GRADES = [['Again', 0], ['Hard', 1], ['Good', 2], ['Easy', 3]];
const MORE = 10;

export default function Review() {
  const [queue, setQueue] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(0);
  const [error, setError] = useState('');

  async function load(more = 0) {
    setError('');
    try {
      const r = await api(`/review${more ? `?more=${more}` : ''}`);
      setQueue(r.cards);
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const card = queue?.[0];

  useEffect(() => {
    setRevealed(false);
  }, [card?.word._id, done]);

  async function act(request, requeue) {
    setBusy(true);
    setError('');
    try {
      await request();
      setQueue(([head, ...rest]) => (requeue ? [...rest, { ...head, isNew: false }] : rest));
      setDone((n) => n + 1);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const grade = (g) => act(() => api(`/review/${card.word._id}`, { method: 'POST', body: { grade: g } }), g === 0);
  // Already know it: take it out of reviews for good.
  const markKnown = () => act(() => api(`/words/${card.word._id}/status`, { method: 'PUT', body: { status: 'known' } }), false);

  if (error && !queue) return <p className="error">{error}</p>;
  if (!queue) return <p className="muted">Loading...</p>;

  const total = done + queue.length;

  if (!card) {
    return (
      <section>
        <h1>Review</h1>
        <p>{done ? `Done for now: ${done} reviews this session.` : 'Nothing due right now.'}</p>
        <div className="row">
          <button className="btn primary" onClick={() => load(MORE)}>Learn {MORE} more</button>
          <a className="btn" href="#/today">Back to Today</a>
        </div>
        {error && <p className="error">{error}</p>}
      </section>
    );
  }

  return (
    <section>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1>Review</h1>
        <span className="muted small">{queue.length} left{card.isNew ? ' · new word' : ''}</span>
      </div>
      <div className="progress thin" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done}>
        <span className="known" style={{ width: `${total ? (100 * done) / total : 0}%` }} />
      </div>
      {!revealed ? (
        <div className="card center">
          <div className="big-word">{card.word.stressed || card.word.lemma}</div>
          <div className="row center">
            <button className="btn" onClick={() => playWord(card.word)}>▶ Listen</button>
            <button className="btn primary" onClick={() => setRevealed(true)}>Show answer</button>
          </div>
        </div>
      ) : (
        <>
          <WordDetails word={card.word} />
          <div className="grades">
            {GRADES.map(([label, g]) => (
              <button key={g} className={`btn ${g === 2 ? 'primary' : ''}`} disabled={busy} onClick={() => grade(g)}>
                {label}
              </button>
            ))}
            <button className="btn known" disabled={busy} onClick={markKnown} title="I already know this word">
              Known
            </button>
          </div>
        </>
      )}
      {error && <p className="error">{error}</p>}
    </section>
  );
}
