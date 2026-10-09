import { fmtDuration } from '../api.js';

export default function VideoTile({ video }) {
  const pct = video.duration ? Math.min(100, Math.round(((video.position ?? 0) / video.duration) * 100)) : 0;
  return (
    <a className="tile" href={`#/watch/${video.videoId}`}>
      <div className="thumb">
        {video.thumbnail && <img src={video.thumbnail} alt="" loading="lazy" />}
        {video.duration > 0 && <span className="dur">{fmtDuration(video.duration)}</span>}
        {video.watched && <span className="badge">watched</span>}
        {pct > 0 && !video.watched && <span className="bar" style={{ width: `${pct}%` }} />}
      </div>
      <div className="title">{video.title || video.videoId}</div>
      {video.channelTitle && <div className="muted small">{video.channelTitle}</div>}
    </a>
  );
}
