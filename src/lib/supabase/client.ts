import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

/** Used by main codebase (repository, auth). */
export function createAuraClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/**
 * Returns a singleton Supabase browser client, or null when Supabase env vars
 * are not configured (local/demo mode). Used by useSupabaseSession hook.
 */
let _client: SupabaseClient | null = null;
export function getSupabaseBrowserClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  if (!_client) _client = createBrowserClient(url, key);
  return _client;
}
