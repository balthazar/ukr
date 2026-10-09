import { useEffect, useRef, useState } from 'react';
import { api, fmtDuration } from '../api.js';
import { loadYouTubeApi } from '../lib/youtubeApi.js';

const SAVE_EVERY_MS = 5000;

export default function Player({ videoId }) {
  const holder = useRef(null);
  const player = useRef(null);
  const [saved, setSaved] = useState(undefined); // undefined = loading, null = never played
  const [watched, setWatched] = useState(false);
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api(`/videos/${videoId}`)
      .then((v) => {
        setSaved(v);
        setWatched(v.watched);
        setTitle(v.title ?? '');
      })
      .catch((e) => (e.status === 404 ? setSaved(null) : setError(e.message)));
  }, [videoId]);

  const ready = saved !== undefined;

  useEffect(() => {
    if (!ready) return;
    let timer;
    let destroyed = false;
    const pos = saved?.position ?? 0;
    const startAt = saved?.watched && saved.duration && pos / saved.duration >= 0.9 ? 0 : Math.floor(pos);

    function save(keepalive = false) {
      const p = player.current;
      if (!p?.getCurrentTime) return;
      const duration = p.getDuration();
      if (!duration) return;
      const data = p.getVideoData?.() ?? {};
      if (data.title) setTitle(data.title);
      api(`/videos/${videoId}/progress`, {
        method: 'PUT',
        keepalive,
        body: {
          position: p.getCurrentTime(),
          duration,
          meta: { title: data.title, channelTitle: data.author, thumbnail: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg` },
        },
      })
        .then((v) => v && setWatched(v.watched))
        .catch(() => {});
    }

    loadYouTubeApi().then((YT) => {
      if (destroyed) return;
      player.current = new YT.Player(holder.current, {
        videoId,
        playerVars: { start: startAt, playsinline: 1, rel: 0 },
        events: {
          onStateChange: (e) => {
            clearInterval(timer);
            if (e.data === YT.PlayerState.PLAYING) timer = setInterval(save, SAVE_EVERY_MS);
            if (e.data === YT.PlayerState.PAUSED || e.data === YT.PlayerState.ENDED) save();
          },
          onError: () => setError('This video cannot be played here.'),
        },
      });
    });

    const onHide = () => document.visibilityState === 'hidden' && save(true);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      destroyed = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onHide);
      save(true);
      player.current?.destroy?.();
      player.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, videoId]);

  async function toggleWatched() {
    const v = await api(`/videos/${videoId}/watched`, { method: 'PUT', body: { watched: !watched } });
    setWatched(v.watched);
  }

  return (
    <section>
      <p><a href="#/watch">← Watch</a></p>
      <div className="player-wrap">
        <div ref={holder} />
      </div>
      <h2>{title || videoId}</h2>
      <div className="row">
        <button className="btn" onClick={toggleWatched}>{watched ? 'Mark unwatched' : 'Mark watched'}</button>
        {saved?.position > 0 && <span className="muted small">resumed at {fmtDuration(saved.position)}</span>}
      </div>
      {error && <p className="error">{error}</p>}
    </section>
  );
}
