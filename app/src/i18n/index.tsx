import React, { createContext, useContext, useMemo } from "react";
import { I18nManager } from "react-native";
import { translations, LANGUAGES, type Lang, type TranslationKey } from "./translations";

export { LANGUAGES, type Lang, type TranslationKey };

interface I18nValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  rtl: boolean;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({
  lang,
  setLang,
  children,
}: {
  lang: Lang;
  setLang: (l: Lang) => void;
  children: React.ReactNode;
}) {
  const value = useMemo<I18nValue>(() => {
    const dict = translations[lang] ?? translations.en;
    const t = (key: TranslationKey, vars?: Record<string, string | number>) => {
      let s = dict[key] ?? translations.en[key] ?? key;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
      }
      return s;
    };
    return {
      lang,
      setLang,
      rtl: LANGUAGES.find((l) => l.code === lang)?.rtl ?? false,
      t,
    };
  }, [lang, setLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}

/**
 * Arabic needs a full app reload for RTL layout to apply (React Native resolves
 * direction at startup), so callers persist the choice and then reload.
 */
export function applyRtl(lang: Lang) {
  const shouldRtl = lang === "ar";
  if (I18nManager.isRTL !== shouldRtl) {
    I18nManager.allowRTL(shouldRtl);
    I18nManager.forceRTL(shouldRtl);
    return true;
  }
  return false;
}
