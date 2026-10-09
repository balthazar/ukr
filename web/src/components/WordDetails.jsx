import PronouncePanel from './PronouncePanel.jsx';
import StatusControl from './StatusControl.jsx';
import InflectionTable from './InflectionTable.jsx';

export default function WordDetails({ word, onStatus }) {
  return (
    <div className="card">
      <div className="card-head">
        <span className="muted small">
          #{word.rank}
          {word.pos && <> · {word.pos}</>}
        </span>
        {onStatus && <StatusControl status={word.progress?.status} onChange={onStatus} />}
      </div>
      <div className="big-word">{word.stressed || word.lemma}</div>
      <div className="respelling">{word.respelling}</div>
      {word.ipa && <div className="muted small">{word.ipa}</div>}
      <ul className="glosses">
        {word.glosses?.map((g) => <li key={g}>{g}</li>)}
      </ul>
      {word.forms?.length > 1 && !word.tables?.length && <p className="muted small">Common forms: {word.forms.join(', ')}</p>}
      <PronouncePanel word={word} />
      {word.tables?.map((t, i) => <InflectionTable key={i} table={t} />)}
      <p className="legend">
        CAPS = stressed syllable. y as in "sit", ee as in "see", oo as in "food", kh as in "loch", ' = soft sign (soften the
        consonant), h is a voiced breathy h.
      </p>
    </div>
  );
}
