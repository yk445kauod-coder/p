import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Lang } from "../i18n/translations";

export type ThemeModePref = "system" | "light" | "dark";

interface SettingsValue {
  themeMode: ThemeModePref;
  reduceMotion: boolean;
  dailyGoalMinutes: number;
  reminderHour: number | null;
  lang: Lang;
  ready: boolean;
  setThemeMode: (m: ThemeModePref) => void;
  setReduceMotion: (v: boolean) => void;
  setDailyGoalMinutes: (v: number) => void;
  setReminderHour: (h: number | null) => void;
  setLang: (l: Lang) => void;
}

const KEY = "tracebook.settings.v1";

const SettingsContext = createContext<SettingsValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [themeMode, setThemeModeState] = useState<ThemeModePref>("system");
  const [reduceMotion, setReduceMotionState] = useState(false);
  const [dailyGoalMinutes, setDailyGoalState] = useState(30);
  const [reminderHour, setReminderHourState] = useState<number | null>(null);
  const [lang, setLangState] = useState<Lang>("en");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (!raw) return;
        const v = JSON.parse(raw);
        if (v.themeMode) setThemeModeState(v.themeMode);
        if (typeof v.reduceMotion === "boolean") setReduceMotionState(v.reduceMotion);
        if (typeof v.dailyGoalMinutes === "number") setDailyGoalState(v.dailyGoalMinutes);
        if (v.reminderHour === null || typeof v.reminderHour === "number")
          setReminderHourState(v.reminderHour);
        if (v.lang === "en" || v.lang === "ar") setLangState(v.lang);
      })
      .catch(() => undefined)
      .finally(() => setReady(true));
  }, []);

  const persist = (patch: Record<string, unknown>) => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        const next = { ...(raw ? JSON.parse(raw) : {}), ...patch };
        return AsyncStorage.setItem(KEY, JSON.stringify(next));
      })
      .catch(() => undefined);
  };

  const value = useMemo<SettingsValue>(
    () => ({
      themeMode,
      reduceMotion,
      dailyGoalMinutes,
      reminderHour,
      lang,
      ready,
      setThemeMode: (m) => {
        setThemeModeState(m);
        persist({ themeMode: m });
      },
      setReduceMotion: (v) => {
        setReduceMotionState(v);
        persist({ reduceMotion: v });
      },
      setDailyGoalMinutes: (v) => {
        setDailyGoalState(v);
        persist({ dailyGoalMinutes: v });
      },
      setReminderHour: (h) => {
        setReminderHourState(h);
        persist({ reminderHour: h });
      },
      setLang: (l) => {
        setLangState(l);
        persist({ lang: l });
      },
    }),
    [themeMode, reduceMotion, dailyGoalMinutes, reminderHour, lang, ready],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used inside SettingsProvider");
  return ctx;
}
