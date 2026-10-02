/**
 * i18n entry point.
 *
 * `translations` maps a locale to its deck; `format` substitutes `{name}`
 * placeholders. The React binding lives in `provider.tsx`.
 */
import { ar } from "./ar";
import { en, type TranslationKey } from "./en";

export type Lang = "en" | "ar";

export const LANGUAGES: { code: Lang; label: string; native: string; rtl: boolean }[] = [
  { code: "en", label: "English", native: "English", rtl: false },
  { code: "ar", label: "Arabic (Egypt)", native: "العربية (مصري)", rtl: true },
];

export const translations: Record<Lang, Record<TranslationKey, string>> = { en, ar };

/** Substitutes `{name}` placeholders; unknown placeholders are left untouched. */
export function format(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    vars[key] === undefined ? match : String(vars[key]),
  );
}

export function translate(
  lang: Lang,
  key: TranslationKey,
  vars?: Record<string, string | number>,
): string {
  const dict = translations[lang] ?? translations.en;
  return format(dict[key] ?? translations.en[key] ?? key, vars);
}

export { en, ar };
export type { TranslationKey };
