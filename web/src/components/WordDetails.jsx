import PronouncePanel from './PronouncePanel.jsx';

export default function WordDetails({ word }) {
  return (
    <div className="card">
      <div className="big-word">{word.stressed || word.lemma}</div>
      <div className="respelling">{word.respelling}</div>
      <div className="muted small">
        {word.ipa} {word.pos && <>· {word.pos}</>} · #{word.rank}
      </div>
      <ul>
        {word.glosses?.map((g) => <li key={g}>{g}</li>)}
      </ul>
      {word.forms?.length > 1 && <p className="muted small">Common forms: {word.forms.join(', ')}</p>}
      <PronouncePanel word={word} />
      <p className="legend">
        CAPS = stressed syllable. y as in "sit", ee as in "see", oo as in "food", kh as in "loch", ' = soft sign (soften the
        consonant), h is a voiced breathy h.
      </p>
    </div>
  );
}
