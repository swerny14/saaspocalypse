import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Public, anon-key Supabase client. Safe to use in server components and
 * client components. Respects RLS, so only public data (reports via the
 * public-read policy) is accessible.
 *
 * If env vars are missing we return null rather than throwing — callers
 * should handle this (render an empty state, etc.) so `pnpm build` works
 * before Supabase is provisioned.
 */
let _anon: SupabaseClient | null | undefined;
export function getSupabaseAnon(): SupabaseClient | null {
  if (_anon !== undefined) return _anon;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    _anon = null;
    return null;
  }
  _anon = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _anon;
}

/**
 * Service-role client. Bypasses RLS. **Server-only.** Never import into a
 * client component or the browser bundle.
 */
let _admin: SupabaseClient | null | undefined;
export function getSupabaseAdmin(): SupabaseClient {
  if (_admin) return _admin;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase service-role client requires NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY",
    );
  }
  _admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _admin;
}
