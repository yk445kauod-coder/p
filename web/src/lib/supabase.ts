/**
 * Supabase client.
 *
 * Only publishable values reach the browser: the project URL and the anon key.
 * Row-level security on every table is what actually protects a reader's rows,
 * so the anon key is safe here. The AI coach runs in an edge function that
 * holds the provider key, so no model credential is ever shipped to the client.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Null when the build has no Supabase project configured (offline-only mode). */
export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey, { auth: { persistSession: true } }) : null;

export const supabaseConfigured = Boolean(supabase);
