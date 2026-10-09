import { useEffect, useState } from 'react';
import { api } from '../api.js';
import VideoTile from '../components/VideoTile.jsx';

export default function Today() {
  const [stats, setStats] = useState(null);
  const [videos, setVideos] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/stats').then(setStats).catch((e) => setError(e.message));
    api('/videos?state=inprogress').then((v) => setVideos(v.slice(0, 6))).catch(() => {});
  }, []);

  if (error) return <p className="error">{error}</p>;
  if (!stats) return <p className="muted">Loading...</p>;

  return (
    <section>
      <h1>Today</h1>
      <div className="stats">
        <div><b>{stats.due}</b><span>due</span></div>
        <div><b>{stats.learning}</b><span>learning</span></div>
        <div><b>{stats.known}</b><span>known</span></div>
        <div><b>{stats.videosWatched}</b><span>videos watched</span></div>
      </div>
      <a className="button primary block" href="#/review">
        Start review ({stats.due} due, {stats.newToday} new so far today)
      </a>
      {videos.length > 0 && (
        <>
          <h2>Continue watching</h2>
          <div className="grid">{videos.map((v) => <VideoTile key={v.videoId} video={v} />)}</div>
        </>
      )}
    </section>
  );
}
