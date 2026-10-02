import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "./auth";
import { useSettings } from "./settings";
import { supabase } from "../lib/supabase";
import * as db from "../api/db";
import { useI18n, type TranslationKey } from "../i18n";
import { appInBackground, sendDevicePush } from "../pwa/push";

export type Notification = db.AppNotification;
export type NotificationKind = db.NotificationKind;

interface NotificationsValue {
  items: Notification[];
  unread: number;
  ready: boolean;
  /**
   * Adds a notification locally and mirrors it to the cloud when signed in.
   * Callers pass translation keys so the stored text matches the reader's
   * language at the moment the event happened.
   */
  push: (n: {
    kind: NotificationKind;
    titleKey: TranslationKey;
    titleVars?: Record<string, string | number>;
    bodyKey?: TranslationKey;
    bodyVars?: Record<string, string | number>;
    emoji?: string | null;
    data?: Record<string, unknown>;
  }) => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  remove: (id: string) => Promise<void>;
  clear: () => Promise<void>;
  refresh: () => Promise<void>;
}

const KEY = "tracebook.notifications.v1";
const NotificationsContext = createContext<NotificationsValue | null>(null);

const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user, offline } = useAuth();
  const { notifyEnabled } = useSettings();
  const { t } = useI18n();
  const [items, setItems] = useState<Notification[]>([]);
  const [ready, setReady] = useState(false);

  const cloud = Boolean(user && !offline && supabase);

  const persist = useCallback((next: Notification[]) => {
    setItems(next);
    AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => undefined);
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (raw) setItems(JSON.parse(raw) as Notification[]);
      })
      .catch(() => undefined)
      .finally(() => setReady(true));
  }, []);

  const refresh = useCallback(async () => {
    if (!cloud) return;
    try {
      const remote = await db.fetchNotifications();
      persist(remote);
    } catch {
      /* keep the cached feed when the network is unavailable */
    }
  }, [cloud, persist]);

  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    if (ready && cloud) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, cloud]);

  const push = useCallback<NotificationsValue["push"]>(
    async (input) => {
      // The master switch silences everything except the user's own chat replies.
      if (!notifyEnabled && input.kind !== "ai") return;

      const resolved = {
        kind: input.kind,
        title: t(input.titleKey, input.titleVars),
        body: input.bodyKey ? t(input.bodyKey, input.bodyVars) : "",
        emoji: input.emoji ?? null,
        data: input.data ?? {},
      };
      const local: Notification = {
        id: `local-${uid()}`,
        ...resolved,
        read_at: null,
        created_at: new Date().toISOString(),
      };
      persist([local, ...items]);

      // A device notification only helps when the app is not already on screen.
      if (cloud && appInBackground()) {
        void sendDevicePush({
          title: resolved.title,
          body: resolved.body,
          tag: `tracebook-${input.kind}`,
          url: "./?tab=Home",
        });
      }

      if (cloud) {
        try {
          const saved = await db.insertNotification(resolved);
          if (saved) {
            setItems((prev) => {
              const next = prev.map((n) => (n.id === local.id ? saved : n));
              AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => undefined);
              return next;
            });
          }
        } catch {
          /* the local copy already shows the notification */
        }
      }
    },
    [cloud, items, notifyEnabled, persist, t],
  );

  const markRead = useCallback(
    async (id: string) => {
      const stamp = new Date().toISOString();
      persist(items.map((n) => (n.id === id ? { ...n, read_at: stamp } : n)));
      if (cloud && !id.startsWith("local-")) await db.markNotificationRead(id).catch(() => undefined);
    },
    [cloud, items, persist],
  );

  const markAllRead = useCallback(async () => {
    const stamp = new Date().toISOString();
    persist(items.map((n) => (n.read_at ? n : { ...n, read_at: stamp })));
    if (cloud) await db.markAllNotificationsRead().catch(() => undefined);
  }, [cloud, items, persist]);

  const remove = useCallback(
    async (id: string) => {
      persist(items.filter((n) => n.id !== id));
      if (cloud && !id.startsWith("local-")) await db.removeNotification(id).catch(() => undefined);
    },
    [cloud, items, persist],
  );

  const clear = useCallback(async () => {
    persist([]);
    if (cloud) await db.clearNotifications().catch(() => undefined);
  }, [cloud, persist]);

  const value = useMemo<NotificationsValue>(
    () => ({
      items,
      unread: items.filter((n) => !n.read_at).length,
      ready,
      push,
      markRead,
      markAllRead,
      remove,
      clear,
      refresh,
    }),
    [items, ready, push, markRead, markAllRead, remove, clear, refresh],
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications(): NotificationsValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used inside NotificationsProvider");
  return ctx;
}
