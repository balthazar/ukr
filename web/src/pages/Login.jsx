import { useState } from 'react';
import { api } from '../api.js';

export default function Login({ onDone }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/login', { method: 'POST', body: { password } });
      onDone();
    } catch (err) {
      setError(err.status === 429 ? 'Too many attempts. Wait a few minutes.' : 'Wrong password.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="login" onSubmit={submit}>
      <h1>ukr</h1>
      <input type="password" autoFocus autoComplete="current-password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <button className="btn primary" disabled={busy || !password}>Enter</button>
      {error && <p className="error">{error}</p>}
    </form>
  );
}
