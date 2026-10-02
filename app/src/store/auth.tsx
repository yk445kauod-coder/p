import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Session, User as SbUser } from "@supabase/supabase-js";
import { supabase, supabaseConfigured, startAutoRefresh } from "../lib/supabase";

export interface User {
  id: string;
  email: string;
  displayName?: string | null;
}

interface AuthValue {
  user: User | null;
  ready: boolean;
  /** True when the reader chose to use the app without an account. */
  offline: boolean;
  /** False when the build has no Supabase project configured. */
  cloudAvailable: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
  signInLocal: () => void;
}

const KEY = "tracebook.auth.v1";
const AuthContext = createContext<AuthValue | null>(null);

/** Maps a Supabase error to a stable code the UI can translate. */
function errorCode(err: unknown): string {
  const raw = (err as { message?: string })?.message?.toLowerCase() ?? "unknown";
  if (raw.includes("already registered") || raw.includes("already exists")) return "email_taken";
  if (raw.includes("invalid login")) return "invalid_credentials";
  if (raw.includes("email not confirmed")) return "email_unconfirmed";
  if (raw.includes("rate limit") || raw.includes("too many") || raw.includes("over_email_send")) {
    return "rate_limited";
  }
  if (raw.includes("password")) return "weak_password";
  if (raw.includes("email")) return "invalid_email";
  if (raw.includes("network") || raw.includes("fetch") || raw.includes("failed to fetch")) return "network";
  return "unknown";
}

export class AuthError extends Error {
  code: string;
  constructor(code: string) {
    super(code);
    this.code = code;
    this.name = "AuthError";
  }
}

function toUser(u: SbUser | null | undefined): User | null {
  if (!u) return null;
  return {
    id: u.id,
    email: u.email ?? "",
    displayName: (u.user_metadata?.display_name as string | undefined) ?? null,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [offline, setOffline] = useState(false);
  // The auth listener's first callback reports "no session" before the stored
  // guest session has been read back, so it must not be allowed to sign the
  // reader out. Track guest mode in a ref that the listener can see.
  const offlineRef = useRef(false);
  const setOfflineMode = (on: boolean) => {
    offlineRef.current = on;
    setOffline(on);
  };

  // Local-only session (guest mode) is kept separately so it never clashes with
  // a real Supabase session.
  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (raw) {
          const v = JSON.parse(raw);
          if (v.local && v.user && !cancelled) {
            setOfflineMode(true);
            setUser(v.user);
          }
        }
        if (supabase) {
          const { data } = await supabase.auth.getSession();
          if (!cancelled && data.session?.user) {
            setOfflineMode(false);
            setUser(toUser(data.session.user));
          }
        }
      } catch {
        /* start signed out */
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    boot();

    const unsub = supabase
      ? supabase.auth.onAuthStateChange((_event: string, session: Session | null) => {
          if (session?.user) {
            setOfflineMode(false);
            setUser(toUser(session.user));
          } else if (!offlineRef.current) {
            setUser(null);
          }
        }).data.subscription.unsubscribe
      : () => {};

    const stopRefresh = startAutoRefresh();
    return () => {
      cancelled = true;
      unsub();
      stopRefresh();
    };
  }, []);

  const persistLocal = async (u: User | null) => {
    if (u) await AsyncStorage.setItem(KEY, JSON.stringify({ local: true, user: u }));
    else await AsyncStorage.removeItem(KEY);
  };

  const value = useMemo<AuthValue>(
    () => ({
      user,
      ready,
      offline,
      cloudAvailable: supabaseConfigured,
      login: async (email, password) => {
        if (!supabase) throw new AuthError("cloud_unavailable");
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw new AuthError(errorCode(error));
        setOfflineMode(false);
        await AsyncStorage.removeItem(KEY);
      },
      register: async (email, password, displayName) => {
        if (!supabase) throw new AuthError("cloud_unavailable");
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: displayName ?? null } },
        });
        if (error) throw new AuthError(errorCode(error));
        // Some projects require email confirmation; in that case there is no
        // session yet and we surface it so the UI can explain what happens next.
        if (!data.session) throw new AuthError("email_unconfirmed");
        setOfflineMode(false);
        await AsyncStorage.removeItem(KEY);
      },
      logout: async () => {
        if (supabase && !offline) {
          try {
            await supabase.auth.signOut();
          } catch {
            /* sign out locally regardless */
          }
        }
        setUser(null);
        setOfflineMode(false);
        await AsyncStorage.removeItem(KEY);
      },
      signInLocal: async () => {
        const local: User = { id: "local", email: "local@device", displayName: "Local reader" };
        setOfflineMode(true);
        setUser(local);
        await persistLocal(local);
      },
    }),
    [user, ready, offline],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
