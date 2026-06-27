'use client';

import { useState } from 'react';
import { useAuth } from '@/store/auth';
import AuthModal from './AuthModal';

export default function AuthSection() {
  const { user, isSupabaseConfigured, signOut } = useAuth();
  const [showModal, setShowModal] = useState(false);

  if (!isSupabaseConfigured) {
    return (
      <div className="sidebar-card">
        <span className="eyebrow">Local Mode</span>
        <p style={{ fontSize: 12 }}>Data saved locally. Add Supabase env vars to enable cloud sync.</p>
      </div>
    );
  }

  if (user) {
    return (
      <div className="sidebar-card">
        <span className="eyebrow">Signed In</span>
        <p style={{ fontSize: 12, marginBottom: 8, wordBreak: 'break-all' }}>{user.email}</p>
        <button
          style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer', color: 'var(--muted)' }}
          onClick={() => void signOut()}
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="sidebar-card">
        <span className="eyebrow">Cloud Sync</span>
        <p style={{ fontSize: 12, marginBottom: 8 }}>Sign in to sync your wardrobe across devices.</p>
        <button className="primary" style={{ fontSize: 12, padding: '6px 12px' }} onClick={() => setShowModal(true)}>
          Sign In
        </button>
      </div>
      {showModal && <AuthModal onClose={() => setShowModal(false)} />}
    </>
  );
}
