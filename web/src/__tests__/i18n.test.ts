import { describe, expect, it } from "vitest";
import { ar } from "@/i18n/ar";
import { en, type TranslationKey } from "@/i18n/en";
import { format, translate } from "@/i18n";

/** Every `{placeholder}` token in a string, e.g. `{count}`. */
function placeholders(value: string): string[] {
  return [...value.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
}

describe("i18n parity", () => {
  it("has identical key sets in en and ar", () => {
    expect(Object.keys(ar).sort()).toEqual(Object.keys(en).sort());
  });

  it("has no empty strings in either locale", () => {
    for (const [key, value] of Object.entries(en)) {
      expect(`${key}=${value}`).not.toMatch(/=\s*$/);
    }
    for (const [key, value] of Object.entries(ar)) {
      expect(`${key}=${value}`).not.toMatch(/=\s*$/);
    }
  });

  it("uses the same placeholders in both locales for every key", () => {
    for (const key of Object.keys(en) as TranslationKey[]) {
      expect({ key, ph: placeholders(en[key]) }).toEqual({ key, ph: placeholders(ar[key]) });
    }
  });

  it("actually translates the Arabic copy", () => {
    for (const key of ["paywall.cta", "home.today", "nav.library", "ai.quotaOut"] as TranslationKey[]) {
      expect(ar[key]).not.toBe(en[key]);
      expect(/[\u0600-\u06FF]/.test(ar[key])).toBe(true);
    }
  });
});

describe("format", () => {
  it("substitutes named placeholders", () => {
    expect(format("{count} days", { count: 5 })).toBe("5 days");
  });

  it("leaves unknown placeholders untouched", () => {
    expect(format("{count} of {total}", { count: 1 })).toBe("1 of {total}");
  });

  it("returns the template when no vars are given", () => {
    expect(format("{count} days")).toBe("{count} days");
  });
});

describe("translate", () => {
  it("falls back to English for an unknown locale", () => {
    expect(translate("en", "nav.home")).toBe(en["nav.home"]);
    expect(translate("ar", "nav.home")).toBe(ar["nav.home"]);
  });
});
