import { playWord } from '../lib/play.js';

const KIND = { verb: 'Conjugation', noun: 'Declension', adjective: 'Declension', pronoun: 'Declension' };
const plainForm = (form) => form.replace(/[̀́]/g, '');

function Cell({ cell }) {
  if (!cell) return <span className="cell empty">–</span>;
  return (
    <button
      className={`cell ${cell.common ? 'common' : ''}`}
      onClick={() => playWord({ lemma: plainForm(cell.form), audio: cell.audio ? [cell.audio] : [] })}
      title={cell.common ? 'Common form · tap to play' : 'Tap to play'}
    >
      <span className="form">{cell.form}</span>
      <span className="resp">{cell.respelling}</span>
    </button>
  );
}

export default function InflectionTable({ table }) {
  return (
    <details className="inflection" open>
      <summary>
        {KIND[table.kind] ?? 'Forms'}
        {table.aspect && <span className="muted"> · {table.aspect}</span>}
        {table.partner && (
          <span className="muted">
            {' '}· pair: <a href={`#/words/${encodeURIComponent(table.partner)}`} onClick={(e) => e.stopPropagation()}>{table.partner}</a>
          </span>
        )}
      </summary>
      {table.sections.map((s) => {
        const columns = s.columns?.some(Boolean) ? s.columns : null;
        if (s.rows[0].cells.length === 1) {
          // One form per row (conjugation): textbook layout, singular left and plural right.
          return (
            <div key={s.title} className="inf-section">
              {table.sections.length > 1 && <div className="inf-title">{s.title}</div>}
              <div className="inf-flow" style={{ gridTemplateRows: `repeat(${Math.ceil(s.rows.length / 2)}, auto)` }}>
                {s.rows.map((r) => (
                  <div key={r.label} className="inf-pair">
                    <span className="inf-label">{r.label}</span>
                    <Cell cell={r.cells[0]} />
                  </div>
                ))}
              </div>
            </div>
          );
        }
        return (
          <div key={s.title} className="inf-section">
            {table.sections.length > 1 && <div className="inf-title">{s.title}</div>}
            <div className="inf-grid" style={{ gridTemplateColumns: `auto repeat(${s.rows[0].cells.length}, minmax(0, 1fr))` }}>
              {columns && (
                <>
                  <span />
                  {columns.map((c) => <span key={c} className="inf-col">{c}</span>)}
                </>
              )}
              {s.rows.map((r) => (
                <div key={r.label} className="inf-row">
                  <span className="inf-label">{r.label}</span>
                  {r.cells.map((c, i) => <Cell key={i} cell={c} />)}
                </div>
              ))}
            </div>
          </div>
        );
      })}
      <p className="legend">Tap a form to hear it. Underlined forms are common in everyday speech.</p>
    </details>
  );
}
