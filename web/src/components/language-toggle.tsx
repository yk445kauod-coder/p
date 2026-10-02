"use client";

import { Globe } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { LANGUAGES } from "@/i18n";
import { Button } from "@/components/ui/button";

/** Cycles between the two shipped locales; the label shows the *other* one. */
export function LanguageToggle() {
  const { lang, setLang } = useI18n();

  const next = LANGUAGES.find((l) => l.code !== lang) ?? LANGUAGES[0];
  const current = LANGUAGES.find((l) => l.code === lang);

  return (
    <Button
      variant="ghost"
      size="sm"
      className="gap-1.5 rounded-full px-2.5"
      aria-label={`Switch language to ${next.native}`}
      onClick={() => setLang(next.code)}
    >
      <Globe className="h-4 w-4" aria-hidden />
      <span className="text-xs font-medium">{current?.native ?? "English"}</span>
    </Button>
  );
}
