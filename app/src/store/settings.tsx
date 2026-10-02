import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Lang } from "../i18n/translations";
import { fetchProfile, updateProfile } from "../api/db";

export type ThemeModePref = "system" | "light" | "dark";

export interface RitualDrink {
  id: string;
  emoji: string;
  en: string;
  ar: string;
}

export const RITUAL_DRINKS: RitualDrink[] = [
  { id: "laban", emoji: "🥛", en: "Warm milk", ar: "لبن دافي" },
  { id: "yansoon", emoji: "🍵", en: "Anise tea", ar: "ينسون" },
  { id: "shay", emoji: "☕", en: "Light tea with milk", ar: "شاي بلبن خفيف" },
  { id: "water", emoji: "💧", en: "Water", ar: "مياه" },
  { id: "none", emoji: "🫖", en: "Nothing", ar: "من غير حاجة" },
];

interface SettingsValue {
  themeMode: ThemeModePref;
  reduceMotion: boolean;
  dailyGoalMinutes: number;
  /** Pages the reader is trying to get through in the current book. */
  shelfGoalPages: number;
  /** Preferred reading time, `HH:MM`. */
  readingTime: string;
  /** Weekday numbers (0=Sunday … 6=Saturday) planned as rest days. */
  restDays: number[];
  ritualDrink: string;
  /** Master switch for reminders and notifications. */
  notifyEnabled: boolean;
  /** Whether the daily reading reminder is scheduled. */
  notifyReminder: boolean;
  /** Local `HH:MM` the daily reminder fires. */
  notifyReminderTime: string;
  lang: Lang;
  ready: boolean;
  setThemeMode: (m: ThemeModePref) => void;
  setReduceMotion: (v: boolean) => void;
  setDailyGoalMinutes: (v: number) => void;
  setShelfGoalPages: (v: number) => void;
  setReadingTime: (v: string) => void;
  toggleRestDay: (weekday: number) => void;
  setRitualDrink: (id: string) => void;
  setLang: (l: Lang) => void;
  setNotifyEnabled: (v: boolean) => void;
  setNotifyReminder: (v: boolean) => void;
  setNotifyReminderTime: (v: string) => void;
}

const KEY = "tracebook.settings.v2";
const SettingsContext = createContext<SettingsValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [themeMode, setThemeModeState] = useState<ThemeModePref>("system");
  const [reduceMotion, setReduceMotionState] = useState(false);
  const [dailyGoalMinutes, setDailyGoalState] = useState(30);
  const [shelfGoalPages, setShelfGoalState] = useState(320);
  const [readingTime, setReadingTimeState] = useState("22:30");
  const [restDays, setRestDays] = useState<number[]>([]);
  const [ritualDrink, setRitualDrinkState] = useState("laban");
  const [notifyEnabled, setNotifyEnabledState] = useState(true);
  const [notifyReminder, setNotifyReminderState] = useState(true);
  const [notifyReminderTime, setNotifyReminderTimeState] = useState("21:30");
  const [lang, setLangState] = useState<Lang>("en");
  const [ready, setReady] = useState(false);

  // Avoids echoing remote profile values straight back on first load.
  const hydrated = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (!raw) return;
        const v = JSON.parse(raw);
        if (v.themeMode) setThemeModeState(v.themeMode);
        if (typeof v.reduceMotion === "boolean") setReduceMotionState(v.reduceMotion);
        if (typeof v.dailyGoalMinutes === "number") setDailyGoalState(v.dailyGoalMinutes);
        if (typeof v.shelfGoalPages === "number") setShelfGoalState(v.shelfGoalPages);
        if (typeof v.readingTime === "string") setReadingTimeState(v.readingTime);
        if (Array.isArray(v.restDays)) setRestDays(v.restDays.filter((n: unknown) => typeof n === "number"));
        if (typeof v.ritualDrink === "string") setRitualDrinkState(v.ritualDrink);
        if (typeof v.notifyEnabled === "boolean") setNotifyEnabledState(v.notifyEnabled);
        if (typeof v.notifyReminder === "boolean") setNotifyReminderState(v.notifyReminder);
        if (typeof v.notifyReminderTime === "string") setNotifyReminderTimeState(v.notifyReminderTime);
        if (v.lang === "en" || v.lang === "ar") setLangState(v.lang);
      })
      .catch(() => undefined)
      .finally(() => {
        hydrated.current = true;
        setReady(true);
      });
  }, []);

  // Pull the cloud profile once, then push local changes back up.
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    fetchProfile()
      .then((p) => {
        if (!p || cancelled) return;
        setDailyGoalState(p.daily_goal_minutes);
        setReduceMotionState(p.reduce_motion);
        setShelfGoalState(p.shelf_goal_pages);
        setReadingTimeState(p.reading_time);
        setRestDays(Array.isArray(p.rest_days) ? p.rest_days : []);
        setRitualDrinkState(p.ritual_drink);
        setNotifyEnabledState(p.notify_enabled);
        setNotifyReminderState(p.notify_reminder);
        setNotifyReminderTimeState(p.notify_reminder_time);
        if (p.lang === "en" || p.lang === "ar") setLangState(p.lang);
        if (p.theme_mode === "light" || p.theme_mode === "dark" || p.theme_mode === "system") {
          setThemeModeState(p.theme_mode);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [ready]);

  const persist = (patch: Record<string, unknown>) => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        const next = { ...(raw ? JSON.parse(raw) : {}), ...patch };
        return AsyncStorage.setItem(KEY, JSON.stringify(next));
      })
      .catch(() => undefined);
    // Best-effort cloud mirror; the local copy is always authoritative offline.
    updateProfile(patch as never).catch(() => undefined);
  };

  const value = useMemo<SettingsValue>(
    () => ({
      themeMode,
      reduceMotion,
      dailyGoalMinutes,
      shelfGoalPages,
      readingTime,
      restDays,
      ritualDrink,
      notifyEnabled,
      notifyReminder,
      notifyReminderTime,
      lang,
      ready,
      setThemeMode: (m) => {
        setThemeModeState(m);
        persist({ theme_mode: m });
      },
      setReduceMotion: (v) => {
        setReduceMotionState(v);
        persist({ reduce_motion: v });
      },
      setDailyGoalMinutes: (v) => {
        setDailyGoalState(v);
        persist({ daily_goal_minutes: v });
      },
      setShelfGoalPages: (v) => {
        setShelfGoalState(v);
        persist({ shelf_goal_pages: v });
      },
      setReadingTime: (v) => {
        setReadingTimeState(v);
        persist({ reading_time: v });
      },
      toggleRestDay: (weekday) => {
        setRestDays((prev) => {
          const next = prev.includes(weekday) ? prev.filter((d) => d !== weekday) : [...prev, weekday].sort();
          persist({ rest_days: next });
          return next;
        });
      },
      setRitualDrink: (id) => {
        setRitualDrinkState(id);
        persist({ ritual_drink: id });
      },
      setLang: (l) => {
        setLangState(l);
        persist({ lang: l });
      },
      setNotifyEnabled: (v) => {
        setNotifyEnabledState(v);
        persist({ notify_enabled: v });
      },
      setNotifyReminder: (v) => {
        setNotifyReminderState(v);
        persist({ notify_reminder: v });
      },
      setNotifyReminderTime: (v) => {
        setNotifyReminderTimeState(v);
        persist({ notify_reminder_time: v });
      },
    }),
    [themeMode, reduceMotion, dailyGoalMinutes, shelfGoalPages, readingTime, restDays, ritualDrink, notifyEnabled, notifyReminder, notifyReminderTime, lang, ready],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used inside SettingsProvider");
  return ctx;
}
