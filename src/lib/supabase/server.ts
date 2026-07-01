import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Returns a Supabase server client that reads the auth session from cookies
 * set by the browser-side createBrowserClient (@supabase/ssr).
 * Must be called inside a Server Component or Route Handler.
 */
export async function createAuraServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Route Handlers can set cookies; Server Components cannot.
          // This is a no-op in read-only server contexts.
        }
      },
    },
  });
}
