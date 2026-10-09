// Known (solid) and learning (light) as shares of the whole word list.
export default function ProgressBar({ known, learning, total, label = true }) {
  const pct = (n) => (total ? `${(100 * n) / total}%` : '0%');
  return (
    <div className="progress-wrap">
      <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={known}>
        <span className="known" style={{ width: pct(known) }} />
        <span className="learning" style={{ width: pct(learning) }} />
      </div>
      {label && (
        <div className="muted small">
          {known} known · {learning} learning · {total} words
        </div>
      )}
    </div>
  );
}
