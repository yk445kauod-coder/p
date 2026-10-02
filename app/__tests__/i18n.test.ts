import { translations } from "../src/i18n/translations";

const en = translations.en;
const ar = translations.ar;

/** Every `{placeholder}` token in a string, e.g. `{count}`. */
function placeholders(value: string): string[] {
  return [...value.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
}

describe("i18n parity", () => {
  it("ships exactly the two supported locales", () => {
    expect(Object.keys(translations).sort()).toEqual(["ar", "en"]);
  });

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
    for (const key of Object.keys(en)) {
      expect({ key, ph: placeholders(en[key]) }).toEqual({ key, ph: placeholders(ar[key]) });
    }
  });

  it("translates the Arabic copy (not left as English)", () => {
    // A handful of keys that must differ; a copy/paste miss would fail here.
    for (const key of ["paywall.cta", "home.heroTitle", "profile.plan", "ai.quotaOut"]) {
      expect(ar[key]).not.toBe(en[key]);
      expect(/[\u0600-\u06FF]/.test(ar[key])).toBe(true);
    }
  });
});
