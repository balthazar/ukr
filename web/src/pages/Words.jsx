import { useEffect, useState } from 'react';
import { api } from '../api.js';

const FILTERS = [['', 'All'], ['new', 'New'], ['learning', 'Learning'], ['known', 'Known']];
const LIMIT = 50;

export default function Words() {
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(q.trim());
      setPage(1);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const params = new URLSearchParams({ page, limit: LIMIT });
    if (status) params.set('status', status);
    if (query) params.set('q', query);
    api(`/words?${params}`).then(setData).catch((e) => setError(e.message));
  }, [status, query, page]);

  const pages = data ? Math.max(1, Math.ceil(data.total / LIMIT)) : 1;

  return (
    <section>
      <h1>Words</h1>
      <input type="search" placeholder="Search Ukrainian or English" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="chips" style={{ margin: '12px 0' }}>
        {FILTERS.map(([key, label]) => (
          <button key={key} className={`chip ${status === key ? 'active' : ''}`} onClick={() => { setStatus(key); setPage(1); }}>
            {label}
          </button>
        ))}
      </div>
      {error && <p className="error">{error}</p>}
      {data && (
        <>
          <p className="muted small">{data.total} words</p>
          <ul className="word-list">
            {data.items.map((w) => (
              <li key={w._id}>
                <a href={`#/words/${w._id}`}>
                  <span className="rank">{w.rank}</span>
                  <span>
                    <b>{w.stressed || w.lemma}</b> <span className="muted">{w.respelling}</span>
                    <br />
                    <span className="small">{w.glosses?.[0]}</span>
                  </span>
                  <span className={`status ${w.progress?.status ?? ''}`}>{w.progress?.status ?? 'new'}</span>
                </a>
              </li>
            ))}
          </ul>
          <div className="row" style={{ justifyContent: 'space-between', marginTop: 12 }}>
            <button disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</button>
            <span className="muted small">{page} / {pages}</span>
            <button disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button>
          </div>
        </>
      )}
    </section>
  );
}
