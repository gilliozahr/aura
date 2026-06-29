import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function createAuraServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
  const cookieStore = await cookies();
  const authToken = cookieStore.get('sb-access-token')?.value ?? '';

  const client = createClient(url, key, {
    global: {
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  return client;
}
