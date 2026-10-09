const OPTIONS = [
  ['new', 'New'],
  ['learning', 'Learning'],
  ['known', 'Known'],
];

// Shows and changes a word's status in one place. onChange gets 'reset' | 'learning' | 'known'.
export default function StatusControl({ status, onChange, disabled }) {
  const current = status ?? 'new';
  return (
    <div className="seg" role="radiogroup" aria-label="Word status">
      {OPTIONS.map(([key, label]) => (
        <button
          key={key}
          role="radio"
          aria-checked={current === key}
          className={current === key ? `on ${key}` : ''}
          disabled={disabled}
          onClick={() => current !== key && onChange(key === 'new' ? 'reset' : key)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
