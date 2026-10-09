import { useEffect, useState } from 'react';
import { api } from '../api.js';
import WordDetails from '../components/WordDetails.jsx';
import { wordsUrl } from '../lib/wordsUrl.js';

export default function WordPage({ id }) {
  const [word, setWord] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api(`/words/${id}`).then(setWord).catch((e) => setError(e.message));
  }, [id]);

  async function setStatus(status) {
    try {
      const { progress } = await api(`/words/${id}/status`, { method: 'PUT', body: { status } });
      setWord((w) => ({ ...w, progress }));
    } catch (e) {
      setError(e.message);
    }
  }

  if (error && !word) return <p className="error">{error}</p>;
  if (!word) return <p className="muted">Loading...</p>;

  return (
    <section>
      <p>
        <a href={wordsUrl()}>← Words</a>
      </p>
      <WordDetails word={word} onStatus={setStatus} />
      {word.progress?.micTotal > 0 && (
        <p className="muted small">Mic checks passed: {word.progress.micPass}/{word.progress.micTotal}</p>
      )}
      {error && <p className="error small">{error}</p>}
    </section>
  );
}
