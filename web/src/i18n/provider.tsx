"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getPreferences, db } from "@/db";
import { LANGUAGES, translate, type Lang, type TranslationKey } from "./index";

interface I18nValue {
  lang: Lang;
  dir: "ltr" | "rtl";
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

/**
 * Language lives in the local preferences row so the first paint already has the
 * right copy, and the document direction is kept in sync for RTL.
 */
export function I18nProvider({
  children,
  initialLang = "en",
}: {
  children: React.ReactNode;
  initialLang?: Lang;
}) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  // Adopt the persisted choice once the store is available.
  useEffect(() => {
    let cancelled = false;
    getPreferences()
      .then((p) => {
        if (!cancelled && (p.lang === "en" || p.lang === "ar")) setLangState(p.lang);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const dir: "ltr" | "rtl" = LANGUAGES.find((l) => l.code === lang)?.rtl ? "rtl" : "ltr";

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, dir]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    db.preferences.update("preferences", { lang: next }).catch(() => undefined);
  }, []);

  const t = useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>) => translate(lang, key, vars),
    [lang],
  );

  const value = useMemo<I18nValue>(() => ({ lang, dir, setLang, t }), [lang, dir, setLang, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
