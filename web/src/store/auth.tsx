"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User as SbUser } from "@supabase/supabase-js";
import { supabase, supabaseConfigured } from "@/lib/supabase";

export interface Reader {
  id: string;
  email: string;
  displayName: string | null;
}

export class AuthError extends Error {
  code: string;
  constructor(code: string) {
    super(code);
    this.code = code;
    this.name = "AuthError";
  }
}

interface AuthValue {
  reader: Reader | null;
  ready: boolean;
  /** False when the build has no Supabase project configured. */
  cloudAvailable: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

/** Maps a Supabase error to a stable code the UI can translate. */
function errorCode(err: unknown): string {
  const raw = (err as { message?: string })?.message?.toLowerCase() ?? "unknown";
  if (raw.includes("already registered") || raw.includes("already exists")) return "email_taken";
  if (raw.includes("invalid login")) return "invalid_credentials";
  if (raw.includes("email not confirmed")) return "email_unconfirmed";
  if (raw.includes("rate limit") || raw.includes("too many")) return "rate_limited";
  if (raw.includes("password")) return "weak_password";
  if (raw.includes("email")) return "invalid_email";
  if (raw.includes("network") || raw.includes("fetch")) return "network";
  return "unknown";
}

function toReader(u: SbUser | null | undefined): Reader | null {
  if (!u) return null;
  return {
    id: u.id,
    email: u.email ?? "",
    displayName: (u.user_metadata?.display_name as string | undefined) ?? null,
  };
}

/**
 * Auth for the sync layer.
 *
 * Signing in is optional: the app is fully usable without an account, and this
 * only exists to mirror the local store to Supabase. The session is kept in
 * `localStorage` by the Supabase client.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [reader, setReader] = useState<Reader | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setReady(true);
      return;
    }
    let cancelled = false;

    supabase.auth
      .getSession()
      .then(({ data }: { data: { session: Session | null } }) => {
        if (!cancelled) setReader(toReader(data.session?.user));
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setReady(true);
      });

    const unsub = supabase.auth.onAuthStateChange((_event: string, session: Session | null) => {
      setReader(toReader(session?.user));
    }).data.subscription.unsubscribe;

    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      reader,
      ready,
      cloudAvailable: supabaseConfigured,
      login: async (email, password) => {
        if (!supabase) throw new AuthError("cloud_unavailable");
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw new AuthError(errorCode(error));
      },
      register: async (email, password, displayName) => {
        if (!supabase) throw new AuthError("cloud_unavailable");
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: displayName ?? null } },
        });
        if (error) throw new AuthError(errorCode(error));
        // Some projects require email confirmation; then there is no session yet.
        if (!data.session) throw new AuthError("email_unconfirmed");
      },
      logout: async () => {
        if (supabase) {
          try {
            await supabase.auth.signOut();
          } catch {
            /* sign out locally regardless */
          }
        }
        setReader(null);
      },
    }),
    [reader, ready],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
