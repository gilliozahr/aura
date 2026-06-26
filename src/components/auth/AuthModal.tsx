'use client';

import { useState } from 'react';
import { useAuth } from '@/store/auth';

interface AuthModalProps {
  onClose: () => void;
}

export default function AuthModal({ onClose }: AuthModalProps) {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const fn = mode === 'signin' ? signIn : signUp;
    const errMsg = await fn(email, password);

    if (errMsg) {
      setError(errMsg);
    } else if (mode === 'signup') {
      setSuccess('Account created. Check your email to confirm, then sign in.');
    } else {
      onClose();
    }
    setLoading(false);
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="card" style={{ width: 360, margin: 0 }}>
        <p className="eyebrow">Authentication</p>
        <h2>{mode === 'signin' ? 'Sign In' : 'Create Account'}</h2>

        {success ? (
          <>
            <p style={{ color: 'var(--accent)', marginBottom: 16 }}>{success}</p>
            <button className="primary" onClick={() => { setSuccess(''); setMode('signin'); }}>
              Go to Sign In
            </button>
          </>
        ) : (
          <form className="form" onSubmit={handleSubmit}>
            <label>
              Email
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </label>
            <label>
              Password
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </label>
            {error && <p style={{ color: '#e05', fontSize: 13 }}>{error}</p>}
            <button className="primary" type="submit" disabled={loading}>
              {loading ? 'Please wait…' : mode === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
        )}

        {!success && (
          <p style={{ marginTop: 12, fontSize: 13, color: 'var(--muted)' }}>
            {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
            <button
              style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: 0 }}
              onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); }}
            >
              {mode === 'signin' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
