import { useEffect, useState } from 'react';
import { api } from './api.js';
import { useRoute } from './route.js';
import Login from './pages/Login.jsx';
import Today from './pages/Today.jsx';
import Review from './pages/Review.jsx';
import Words from './pages/Words.jsx';
import WordPage from './pages/WordPage.jsx';
import Watch from './pages/Watch.jsx';
import Player from './pages/Player.jsx';

const TABS = [
  ['today', 'Today'],
  ['review', 'Review'],
  ['words', 'Words'],
  ['watch', 'Watch'],
];

export default function App() {
  const [authed, setAuthed] = useState(null);
  const [section, param] = useRoute();

  useEffect(() => {
    api('/me').then(() => setAuthed(true)).catch(() => setAuthed(false));
    const onUnauthorized = () => setAuthed(false);
    window.addEventListener('ukr:unauthorized', onUnauthorized);
    return () => window.removeEventListener('ukr:unauthorized', onUnauthorized);
  }, []);

  if (authed === null) return null;
  if (!authed) return <Login onDone={() => setAuthed(true)} />;

  let page;
  if (section === 'review') page = <Review />;
  else if (section === 'words') page = param ? <WordPage key={param} id={param} /> : <Words />;
  else if (section === 'watch') page = param ? <Player key={param} videoId={param} /> : <Watch />;
  else page = <Today />;

  return (
    <div className="app">
      <main>{page}</main>
      <nav className="tabs">
        {TABS.map(([key, label]) => (
          <a key={key} href={`#/${key}`} className={section === key ? 'active' : ''}>
            {label}
          </a>
        ))}
      </nav>
    </div>
  );
}
