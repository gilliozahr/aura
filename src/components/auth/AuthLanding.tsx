'use client';

import { useState } from 'react';
import { useAuth } from '@/store/auth';

const BENEFITS = [
  'AI outfit recommendations, scored and explained',
  'Wardrobe intelligence and gap analysis',
  'Buy / Wait / Skip decisions on new pieces',
];

export default function AuthLanding() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

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
    }
    setLoading(false);
  }

  return (
    <div className="auth-landing">
      {/* ── Left: editorial hero ───────────────────────────────────── */}
      <div className="auth-hero">
        <div className="brand">
          <div className="brand-mark">A</div>
          <div>
            <strong>AURA</strong>
            <span>Style Intelligence OS</span>
          </div>
        </div>

        <div className="auth-tagline">
          <h2>Your wardrobe,<br />intelligently<br />styled.</h2>
          <p>
            Sign in to sync your wardrobe and unlock personalized
            outfit intelligence powered by AI.
          </p>
          <div className="auth-benefits">
            {BENEFITS.map(b => (
              <div key={b} className="auth-benefit">
                <div className="auth-benefit-dot" />
                {b}
              </div>
            ))}
          </div>
        </div>

        <p style={{ color: 'rgba(255,255,255,.28)', fontSize: 12, margin: 0 }}>
          © {new Date().getFullYear()} AURA. All rights reserved.
        </p>
      </div>

      {/* ── Right: form panel ─────────────────────────────────────── */}
      <div className="auth-form-panel">
        <div className="auth-form-inner">
          <p className="eyebrow">Welcome</p>
          <h2 style={{ fontSize: 28, marginBottom: 28 }}>
            {mode === 'signin' ? 'Sign in to AURA' : 'Create your account'}
          </h2>

          {success ? (
            <>
              <p style={{
                color: 'var(--accent-dark)',
                background: '#f5efe6',
                padding: '14px 16px',
                borderRadius: 14,
                fontSize: 14,
                lineHeight: 1.5,
                marginBottom: 20,
              }}>
                {success}
              </p>
              <button
                className="primary full"
                onClick={() => { setSuccess(''); setMode('signin'); }}
              >
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
                  autoComplete="email"
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
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                />
              </label>

              {error && (
                <p style={{
                  color: 'var(--bad)',
                  fontSize: 13,
                  background: '#fdf2f2',
                  padding: '10px 14px',
                  borderRadius: 12,
                  margin: 0,
                  lineHeight: 1.5,
                }}>
                  {error}
                </p>
              )}

              <button
                className="primary full"
                type="submit"
                disabled={loading}
                style={{ marginTop: 4, padding: '14px', fontSize: 15 }}
              >
                {loading
                  ? 'Please wait…'
                  : mode === 'signin'
                  ? 'Sign In'
                  : 'Create Account'}
              </button>
            </form>
          )}

          {!success && (
            <p style={{ marginTop: 22, fontSize: 13, color: 'var(--muted)', textAlign: 'center' }}>
              {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
              <button
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent-dark)',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: 0,
                }}
                onClick={() => {
                  setMode(mode === 'signin' ? 'signup' : 'signin');
                  setError('');
                }}
              >
                {mode === 'signin' ? 'Create one' : 'Sign in'}
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
