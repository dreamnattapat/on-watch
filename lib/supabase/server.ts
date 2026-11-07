import { createServerClient } from '@supabase/ssr';
import { createClient as createPlainClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { authEnabled, env } from '../config';

/** Supabase client for Server Components, Server Actions and Route Handlers. */
export async function createClient() {
  if (!authEnabled) return null;
  const cookieStore = await cookies();
  return createServerClient(env.supabaseUrl, env.supabasePublishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component: the proxy refreshes cookies instead.
        }
      },
    },
  });
}

/** Admin client with the secret key. Server only; bypasses row-level security. */
export function createAdminClient() {
  if (!env.supabaseUrl || !env.supabaseSecretKey) return null;
  return createPlainClient(env.supabaseUrl, env.supabaseSecretKey, { auth: { persistSession: false } });
}

export async function getUser() {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}
