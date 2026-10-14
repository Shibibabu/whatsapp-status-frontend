import { FormEvent, useState } from 'react';
import { api } from '../api';
import type { User } from '../types';

interface Props {
  onLogin: (user: User) => void;
}

/** Placeholder auth: log in by phone number, or register a new user. */
export default function LoginScreen({ onLogin }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const user = mode === 'login' ? await api.login(phone) : await api.register(phone, name);
      onLogin(user);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login">
      <form className="card login-card" onSubmit={submit}>
        <h1>Status</h1>
        <div className="tabs">
          <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>
            Log in
          </button>
          <button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>
            Register
          </button>
        </div>

        <label>
          Phone
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+919876543210" required />
        </label>
        {mode === 'register' && (
          <label>
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" required />
          </label>
        )}

        {error && <p className="error">{error}</p>}
        <button className="primary" disabled={busy}>
          {mode === 'login' ? 'Log in' : 'Create account'}
        </button>
        <p className="hint">Demo auth only: no OTP or password.</p>
      </form>
    </div>
  );
}
