'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { createAuraClient } from '@/lib/supabase/client';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isSupabaseConfigured: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const isConfigured =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(isConfigured); // only wait if Supabase is configured

  useEffect(() => {
    if (!isConfigured) return;
    const client = createAuraClient();

    client.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    });

    const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string, password: string): Promise<string | null> => {
    const client = createAuraClient();
    const { error } = await client.auth.signInWithPassword({ email, password });
    return error?.message ?? null;
  }, []);

  const signUp = useCallback(async (email: string, password: string): Promise<string | null> => {
    const client = createAuraClient();
    const { error } = await client.auth.signUp({ email, password });
    return error?.message ?? null;
  }, []);

  const signOut = useCallback(async () => {
    const client = createAuraClient();
    await client.auth.signOut();
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, isSupabaseConfigured: isConfigured, signIn, signUp, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
