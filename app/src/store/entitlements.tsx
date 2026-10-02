/**
 * Entitlements — the single source of truth for what a reader may use.
 *
 * A reader is `free` by default; `pro` unlocks the AI coach cap, unlimited
 * books and the full analytics history. The plan lives on `profiles.plan`
 * (see the `add_profiles_plan` migration) and is mirrored here so screens can
 * gate without another round-trip. Everything here is the client half of the
 * check — the edge function re-checks the plan before spending model tokens.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "./auth";
import { fetchProfile, updateProfile } from "../api/db";

export type Plan = "free" | "pro";

/** How many AI coach messages a free reader gets per calendar day. */
export const FREE_AI_MESSAGES_PER_DAY = 10;
/** How many books a free reader may keep on the active shelf. */
export const FREE_ACTIVE_BOOKS = 3;
/** Days of history a free reader can see in analytics. */
export const FREE_HISTORY_DAYS = 30;

interface Usage {
  day: string;
  aiMessages: number;
}

interface EntitlementsValue {
  plan: Plan;
  isPro: boolean;
  /** AI messages sent today (free readers only). */
  aiMessagesToday: number;
  aiMessagesLeft: number;
  canSendAI: boolean;
  /** `Infinity` for pro. */
  maxActiveBooks: number;
  /** Days of analytics history available. */
  historyDays: number;
  /** Persisted plan could not be read yet. */
  ready: boolean;
  /** Called after a successful AI turn so the daily cap advances. */
  recordAIMessage: () => void;
  /** Local/self-serve unlock; a real billing webhook would do this server-side. */
  setPlan: (plan: Plan) => Promise<void>;
}

const KEY = "tracebook.usage.v1";
const PLAN_KEY = "tracebook.plan.v1";
const EntitlementsContext = createContext<EntitlementsValue | null>(null);

const todayKey = () => new Date().toISOString().slice(0, 10);

export function EntitlementsProvider({ children }: { children: React.ReactNode }) {
  const { user, offline } = useAuth();
  const [plan, setPlanState] = useState<Plan>("free");
  const [usage, setUsage] = useState<Usage>({ day: todayKey(), aiMessages: 0 });
  const [ready, setReady] = useState(false);

  // Local usage counter, reset whenever the calendar day rolls over.
  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (!raw) return;
        const v = JSON.parse(raw) as Usage;
        if (v.day === todayKey()) setUsage(v);
        else setUsage({ day: todayKey(), aiMessages: 0 });
      })
      .catch(() => undefined)
      .finally(() => setReady(true));
  }, []);

  // Restore a locally unlocked plan (guests have no cloud profile to read).
  useEffect(() => {
    AsyncStorage.getItem(PLAN_KEY)
      .then((raw) => {
        if (raw === "pro" || raw === "free") setPlanState(raw);
      })
      .catch(() => undefined);
  }, []);

  // Seed the plan from the cloud profile for signed-in readers. A guest keeps
  // whatever local plan they unlocked, since there is no profile to read.
  useEffect(() => {
    if (!user || offline) return;
    let cancelled = false;
    fetchProfile()
      .then((p) => {
        if (!cancelled && p && (p.plan === "pro" || p.plan === "free")) setPlanState(p.plan);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [offline, user]);

  const recordAIMessage = useCallback(() => {
    setUsage((prev) => {
      const base = prev.day === todayKey() ? prev : { day: todayKey(), aiMessages: 0 };
      const next = { day: base.day, aiMessages: base.aiMessages + 1 };
      AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => undefined);
      return next;
    });
  }, []);

  const setPlan = useCallback(
    async (next: Plan) => {
      setPlanState(next);
      AsyncStorage.setItem(PLAN_KEY, next).catch(() => undefined);
      try {
        await updateProfile({ plan: next });
      } catch {
        /* offline/guest: the local value still unlocks the UI */
      }
    },
    [],
  );

  const value = useMemo<EntitlementsValue>(() => {
    const isPro = plan === "pro";
    const aiMessagesToday = usage.day === todayKey() ? usage.aiMessages : 0;
    return {
      plan,
      isPro,
      aiMessagesToday,
      aiMessagesLeft: isPro ? Infinity : Math.max(0, FREE_AI_MESSAGES_PER_DAY - aiMessagesToday),
      canSendAI: isPro || aiMessagesToday < FREE_AI_MESSAGES_PER_DAY,
      maxActiveBooks: isPro ? Infinity : FREE_ACTIVE_BOOKS,
      historyDays: isPro ? 365 : FREE_HISTORY_DAYS,
      ready,
      recordAIMessage,
      setPlan,
    };
  }, [plan, usage, ready, recordAIMessage, setPlan]);

  return <EntitlementsContext.Provider value={value}>{children}</EntitlementsContext.Provider>;
}

export function useEntitlements(): EntitlementsValue {
  const ctx = useContext(EntitlementsContext);
  if (!ctx) throw new Error("useEntitlements must be used inside EntitlementsProvider");
  return ctx;
}
