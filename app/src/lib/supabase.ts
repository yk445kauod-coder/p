import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState, Platform } from "react-native";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL as string | undefined;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string | undefined;

/** True when the build was given a Supabase project; the app falls back to local-only mode otherwise. */
export const supabaseConfigured = Boolean(url && anonKey);

/**
 * Single Supabase client for the whole app.
 *
 * On web the session lives in localStorage (the default); on native it is kept in
 * AsyncStorage. `detectSessionInUrl` is off because the app owns its own routing
 * and never lands on a Supabase-hosted redirect URL.
 */
export const supabase: SupabaseClient | null = supabaseConfigured
  ? createClient(url as string, anonKey as string, {
      auth: {
        storage: Platform.OS === "web" ? undefined : AsyncStorage,
        storageKey: "tracebook.session",
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    })
  : null;

/** Keeps the access token fresh while the app is foregrounded on native. */
export function startAutoRefresh(): () => void {
  if (!supabase || Platform.OS === "web") return () => {};
  const sub = AppState.addEventListener("change", (state) => {
    if (state === "active") supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
  supabase.auth.startAutoRefresh();
  return () => {
    sub.remove();
    supabase.auth.stopAutoRefresh();
  };
}
