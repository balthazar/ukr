import { useEffect, useState } from 'react';
import { api } from '../api.js';
import VideoTile from '../components/VideoTile.jsx';

function errorText(e) {
  if (e.body?.error === 'youtube_not_configured') return 'YouTube is not configured on the server.';
  if (e.body?.error === 'youtube_unavailable') return `YouTube is unavailable right now (${e.message}). Showing what we already have.`;
  return e.message;
}

export default function Watch() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState(null);
  const [channels, setChannels] = useState([]);
  const [activeChannel, setActiveChannel] = useState(null);
  const [channelVideos, setChannelVideos] = useState(null);
  const [newChannel, setNewChannel] = useState('');
  const [inProgress, setInProgress] = useState([]);
  const [watched, setWatched] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/channels').then(setChannels).catch((e) => setError(errorText(e)));
    api('/videos?state=inprogress').then(setInProgress).catch(() => {});
    api('/videos?state=watched').then(setWatched).catch(() => {});
  }, []);

  useEffect(() => {
    if (!activeChannel) return setChannelVideos(null);
    api(`/channels/${activeChannel}/videos`).then(setChannelVideos).catch((e) => setError(errorText(e)));
  }, [activeChannel]);

  async function search(e) {
    e.preventDefault();
    if (!q.trim()) return;
    setError('');
    try {
      setResults(await api(`/yt/search?${new URLSearchParams({ q })}`));
    } catch (err) {
      setError(errorText(err));
    }
  }

  async function addChannel(e) {
    e.preventDefault();
    setError('');
    try {
      const ch = await api('/channels', { method: 'POST', body: { input: newChannel } });
      setChannels((list) => [...list.filter((c) => c.channelId !== ch.channelId), ch]);
      setNewChannel('');
      setActiveChannel(ch.channelId);
    } catch (err) {
      setError(err.body?.error === 'channel_not_found' ? 'Channel not found. Paste a channel URL, @handle or UC... id.' : errorText(err));
    }
  }

  async function removeChannel(id) {
    await api(`/channels/${id}`, { method: 'DELETE' });
    setChannels((list) => list.filter((c) => c.channelId !== id));
    if (activeChannel === id) setActiveChannel(null);
  }

  return (
    <section>
      <h1>Watch</h1>
      <form onSubmit={search} className="row">
        <input type="search" placeholder="Search YouTube (Ukrainian results first)" value={q} onChange={(e) => setQ(e.target.value)} style={{ flex: 1 }} />
        <button className="btn primary">Search</button>
      </form>
      {error && <p className="banner">{error}</p>}
      {results && (
        <>
          <h2>Results</h2>
          {results.items.length ? <div className="grid">{results.items.map((v) => <VideoTile key={v.videoId} video={v} />)}</div> : <p className="muted">No results.</p>}
        </>
      )}

      <h2>Channels</h2>
      <div className="chips">
        {channels.map((c) => (
          <span key={c.channelId} className={`chip ${activeChannel === c.channelId ? 'active' : ''}`} onClick={() => setActiveChannel(activeChannel === c.channelId ? null : c.channelId)}>
            {c.title}{' '}
            <a href="#/watch" onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeChannel(c.channelId); }} aria-label={`Remove ${c.title}`}>×</a>
          </span>
        ))}
      </div>
      <form onSubmit={addChannel} className="row" style={{ marginTop: 8 }}>
        <input type="text" placeholder="Add channel: URL, @handle or UC id" value={newChannel} onChange={(e) => setNewChannel(e.target.value)} style={{ flex: 1 }} />
        <button className="btn" disabled={!newChannel.trim()}>Add</button>
      </form>
      {channelVideos && <div className="grid" style={{ marginTop: 12 }}>{channelVideos.items.map((v) => <VideoTile key={v.videoId} video={v} />)}</div>}

      {inProgress.length > 0 && (
        <>
          <h2>In progress</h2>
          <div className="grid">{inProgress.map((v) => <VideoTile key={v.videoId} video={v} />)}</div>
        </>
      )}
      {watched.length > 0 && (
        <>
          <h2>Watched</h2>
          <div className="grid">{watched.map((v) => <VideoTile key={v.videoId} video={v} />)}</div>
        </>
      )}
    </section>
  );
}
