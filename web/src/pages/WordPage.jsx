import { useEffect, useState } from 'react';
import { api } from '../api.js';
import WordDetails from '../components/WordDetails.jsx';
import { wordsUrl } from '../lib/wordsUrl.js';

export default function WordPage({ id }) {
  const [word, setWord] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    // Aspect-pair links use the lemma; everything else links by id.
    const path = /^[a-f0-9]{24}$/i.test(id) ? `/words/${id}` : `/words/lemma/${encodeURIComponent(id)}`;
    setWord(null);
    setError('');
    api(path).then(setWord).catch((e) => setError(e.status === 404 ? 'That word is not in the 5,000-word list.' : e.message));
  }, [id]);

  async function setStatus(status) {
    try {
      const { progress } = await api(`/words/${word._id}/status`, { method: 'PUT', body: { status } });
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
