'use client';

import { useState, type FormEvent } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useSupabaseSession } from '@/lib/hooks/useSupabaseSession';
import { useAura } from '@/store';
import { useToast } from '@/store/toast';

const IS_LOCAL_MODE = !process.env.NEXT_PUBLIC_SUPABASE_URL;

function AccountSection() {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [signingIn, setSigningIn] = useState(false);
  const [password, setPassword] = useState('');
  const { session, loading } = useSupabaseSession();
  const sessionEmail = session?.user?.email ?? null;

  async function handleSignIn(e: FormEvent) {
    e.preventDefault();
    const client = getSupabaseBrowserClient();
    if (!client) return;
    setSigningIn(true);
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) {
      toast(`Sign in failed: ${error.message}`);
    } else {
      setPassword('');
      toast('Signed in.');
    }
    setSigningIn(false);
  }

  async function handleSignOut() {
    const client = getSupabaseBrowserClient();
    if (!client) return;
    await client.auth.signOut();
    toast('Signed out.');
  }

  if (IS_LOCAL_MODE) {
    return (
      <div className="card" style={{ marginBottom: 20 }}>
        <p className="eyebrow">Account</p>
        <p style={{ fontSize: 13, color: 'var(--muted)' }}>
          Running in local mode — no Supabase project configured. Data is stored in your browser.
        </p>
      </div>
    );
  }

  return (
    <div className="card" id="account" style={{ marginBottom: 20 }}>
      <p className="eyebrow">Account</p>
      {loading ? (
        <p style={{ fontSize: 13, color: 'var(--muted)' }}>Loading…</p>
      ) : sessionEmail ? (
        <>
          <p style={{ fontSize: 14, marginBottom: 12 }}>Signed in as <strong>{sessionEmail}</strong></p>
          <button className="secondary" onClick={handleSignOut}>Sign Out</button>
        </>
      ) : (
        <>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>Not signed in. Sign in to sync your wardrobe and plans across devices.</p>
          <form className="form" onSubmit={handleSignIn} style={{ maxWidth: 340 }}>
            <label>Email
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
            </label>
            <label>Password
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
            </label>
            <button className="primary" type="submit" disabled={signingIn}>
              {signingIn ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </>
      )}
    </div>
  );
}

export default function SettingsView() {
  const { state, dispatch } = useAura();
  const { toast } = useToast();

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    dispatch({
      type: 'SET_USER',
      payload: {
        name: form.get('name') as string,
        city: form.get('city') as string,
        temperature: Number(form.get('temperature')),
        occasion: form.get('occasion') as string,
        styleGoal: form.get('styleGoal') as string,
        budget: Number(form.get('budget')),
      },
    });
    toast('Settings saved.');
  }

  return (
    <>
    <AccountSection />
    <div className="card">
      <p className="eyebrow">Settings</p>
      <h2>Style Context</h2>
      <form className="form" onSubmit={handleSubmit}>
        <label>Name <input name="name" defaultValue={state.user.name} /></label>
        <label>City <input name="city" defaultValue={state.user.city} /></label>
        <label>Temperature °C <input name="temperature" type="number" defaultValue={state.user.temperature} /></label>
        <label>Today&apos;s occasion <input name="occasion" defaultValue={state.user.occasion} /></label>
        <label>Style goal <input name="styleGoal" defaultValue={state.user.styleGoal} /></label>
        <label>Monthly style budget <input name="budget" type="number" defaultValue={state.user.budget} /></label>
        <button className="primary" type="submit">Save Settings</button>
      </form>
    </div>
    </>
  );
}
