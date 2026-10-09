import { useEffect, useState } from 'react';
import { api } from '../api.js';
import WordDetails from '../components/WordDetails.jsx';

export default function WordPage({ id }) {
  const [word, setWord] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api(`/words/${id}`).then(setWord).catch((e) => setError(e.message));
  }, [id]);

  async function setStatus(status) {
    const { progress } = await api(`/words/${id}/status`, { method: 'PUT', body: { status } });
    setWord((w) => ({ ...w, progress }));
  }

  if (error) return <p className="error">{error}</p>;
  if (!word) return <p className="muted">Loading...</p>;
  const status = word.progress?.status;

  return (
    <section>
      <p><a href="#/words">← Words</a></p>
      <WordDetails word={word} />
      <div className="row" style={{ marginTop: 12 }}>
        <span className={`status ${status ?? ''}`}>{status ?? 'new'}</span>
        {status !== 'known' && <button onClick={() => setStatus('known')}>Mark known</button>}
        {status !== 'learning' && <button onClick={() => setStatus('learning')}>Learn</button>}
        {status && <button onClick={() => setStatus('reset')}>Reset</button>}
        {word.progress?.micTotal > 0 && (
          <span className="muted small">mic {word.progress.micPass}/{word.progress.micTotal}</span>
        )}
      </div>
    </section>
  );
}
