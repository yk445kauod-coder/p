import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api, setToken } from "../api/client";

interface User {
  id: string;
  email: string;
  displayName?: string | null;
}

interface AuthValue {
  user: User | null;
  ready: boolean;
  offline: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
  signInLocal: () => void;
}

const KEY = "tracebook.auth.v1";
const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (!raw) return;
        const v = JSON.parse(raw);
        if (v.token) setToken(v.token);
        if (v.user) setUser(v.user);
      })
      .catch(() => undefined)
      .finally(() => setReady(true));
  }, []);

  const persist = async (token: string | null, u: User | null) => {
    setToken(token);
    if (token && u) await AsyncStorage.setItem(KEY, JSON.stringify({ token, user: u }));
    else await AsyncStorage.removeItem(KEY);
  };

  const value = useMemo<AuthValue>(
    () => ({
      user,
      ready,
      offline,
      login: async (email, password) => {
        const { token, user: u } = await api.login(email, password);
        setOffline(false);
        setUser(u);
        await persist(token, u);
      },
      register: async (email, password, displayName) => {
        const { token, user: u } = await api.register(email, password, displayName);
        setOffline(false);
        setUser(u);
        await persist(token, u);
      },
      logout: async () => {
        try {
          await api.logout();
        } catch {
          /* ignore network errors on logout */
        }
        setUser(null);
        await persist(null, null);
      },
      // Local-only mode: everything still works via the local store, sync is just off.
      signInLocal: () => {
        setOffline(true);
        setUser({ id: "local", email: "local@device", displayName: "Local reader" });
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
