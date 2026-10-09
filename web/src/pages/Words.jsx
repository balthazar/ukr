import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { displayGloss } from '../lib/gloss.js';
import { playWord } from '../lib/play.js';
import ProgressBar from '../components/ProgressBar.jsx';
import { rememberWordsUrl } from '../lib/wordsUrl.js';
import { matchesFilter } from '../lib/filters.js';

const FILTERS = [['tolearn', 'To learn'], ['new', 'New'], ['learning', 'Learning'], ['known', 'Known'], ['', 'All']];
const LIMIT = 50;

// Search, filter and page live in the URL so going back to the list restores them.
function writeUrl({ q, f, p }) {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (f !== 'tolearn') params.set('f', f);
  if (p > 1) params.set('p', String(p));
  const qs = params.toString();
  const url = `#/words${qs ? `?${qs}` : ''}`;
  history.replaceState(null, '', url);
  rememberWordsUrl(url);
}

export default function Words({ query }) {
  const [q, setQ] = useState(query.get('q') ?? '');
  const [search, setSearch] = useState(query.get('q') ?? '');
  const [filter, setFilter] = useState(query.get('f') ?? 'tolearn');
  const [page, setPage] = useState(Math.max(1, Number(query.get('p')) || 1));
  const [data, setData] = useState(null);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (q.trim() === search) return;
    const t = setTimeout(() => {
      setSearch(q.trim());
      setPage(1);
    }, 250);
    return () => clearTimeout(t);
  }, [q, search]);

  function loadPage() {
    const params = new URLSearchParams({ page, limit: LIMIT });
    if (filter) params.set('status', filter);
    if (search) params.set('q', search);
    return api(`/words?${params}`).then(setData).catch((e) => setError(e.message));
  }

  useEffect(() => {
    writeUrl({ q: search, f: filter, p: page });
    setError('');
    loadPage();
  }, [search, filter, page]);

  useEffect(() => {
    api('/stats').then(setStats).catch(() => {});
  }, []);

  async function toggleKnown(w) {
    const status = w.progress?.status === 'known' ? 'learning' : 'known';
    try {
      const { progress } = await api(`/words/${w._id}/status`, { method: 'PUT', body: { status } });
      if (matchesFilter(progress?.status, filter)) {
        setData((d) => ({ ...d, items: d.items.map((x) => (x._id === w._id ? { ...x, progress } : x)) }));
      } else {
        // It no longer belongs in this view: drop it now, then refill the page.
        setData((d) => ({ ...d, total: d.total - 1, items: d.items.filter((x) => x._id !== w._id) }));
        loadPage();
      }
      setStats((s) => s && {
        ...s,
        known: s.known + (status === 'known' ? 1 : -1),
        learning: s.learning + (status === 'known' ? (w.progress ? -1 : 0) : 1),
      });
    } catch (e) {
      setError(e.message);
    }
  }

  const pages = data ? Math.max(1, Math.ceil(data.total / LIMIT)) : 1;

  return (
    <section>
      <h1>Words</h1>
      {stats && <ProgressBar known={stats.known} learning={stats.learning} total={stats.words} />}
      <input type="search" placeholder="Search Ukrainian or English" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="chips" style={{ margin: '12px 0' }}>
        {FILTERS.map(([key, label]) => (
          <button key={key} className={`chip ${filter === key ? 'active' : ''}`} onClick={() => { setFilter(key); setPage(1); }}>
            {label}
          </button>
        ))}
      </div>
      {error && <p className="error">{error}</p>}
      {data && (
        <>
          <p className="muted small">{data.total} words</p>
          <ul className="word-list">
            {data.items.map((w) => {
              const known = w.progress?.status === 'known';
              return (
                <li key={w._id}>
                  <button className="icon-btn" onClick={() => playWord(w)} aria-label={`Play ${w.lemma}`}>▶</button>
                  <a href={`#/words/${w._id}`}>
                    <span>
                      <b>{w.stressed || w.lemma}</b> <span className="muted">{w.respelling}</span>
                      {w.progress?.status === 'learning' && <span className="dot" title="learning" />}
                    </span>
                    <span className="small">{displayGloss(w.glosses, search)}</span>
                  </a>
                  <button
                    className={`icon-btn ${known ? 'known' : ''}`}
                    onClick={() => toggleKnown(w)}
                    aria-pressed={known}
                    aria-label={known ? `Mark ${w.lemma} not known` : `Mark ${w.lemma} known`}
                    title={known ? 'Known (tap to unmark)' : 'Mark known'}
                  >
                    ✓
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="row" style={{ justifyContent: 'space-between', marginTop: 12 }}>
            <button className="btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</button>
            <span className="muted small">{page} / {pages}</span>
            <button className="btn" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button>
          </div>
        </>
      )}
    </section>
  );
}
