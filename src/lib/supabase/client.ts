import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

let _client: SupabaseClient | null = null;

/**
 * Returns a singleton Supabase browser client that stores the session
 * in cookies (not localStorage), making it readable by API routes.
 * Returns null when Supabase env vars are not configured (local mode).
 */
export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (!url || !key) return null;
  if (!_client) _client = createBrowserClient(url, key);
  return _client;
}
