import { computeStreak, findPrimePeriods, badgeText, categoryLabel, toDayKey, BADGES } from "../src/domain/achievements";

describe("toDayKey", () => {
  it("formats as a UTC ISO date", () => {
    expect(toDayKey(new Date("2026-02-03T23:30:00Z"))).toBe("2026-02-03");
  });
});

describe("computeStreak", () => {
  const day = (k: string) => k;

  it("is zero with no activity", () => {
    expect(computeStreak({ activeDays: new Set(), restDays: [] })).toEqual({ current: 0, longest: 0, missed: 0 });
  });

  it("counts consecutive days ending today", () => {
    const today = new Date("2026-01-10T00:00:00Z");
    const active = new Set([day("2026-01-08"), day("2026-01-09"), day("2026-01-10")]);
    const r = computeStreak({ activeDays: active, restDays: [], today });
    expect(r.current).toBe(3);
    expect(r.longest).toBe(3);
    expect(r.missed).toBe(0);
  });

  it("does not break the run across a planned rest day", () => {
    const today = new Date("2026-01-12T00:00:00Z");
    // Jan 11 is a Sunday (0) and is marked as a rest day, so the run survives.
    const active = new Set([day("2026-01-10"), day("2026-01-12")]);
    const r = computeStreak({ activeDays: active, restDays: [0], today });
    expect(r.current).toBe(2);
  });

  it("counts unplanned gaps as missed days", () => {
    const today = new Date("2026-01-10T00:00:00Z");
    const active = new Set([day("2026-01-05"), day("2026-01-10")]);
    const r = computeStreak({ activeDays: active, restDays: [], today });
    expect(r.missed).toBe(4);
    expect(r.current).toBe(1);
  });

  it("never marks today as missed when nothing is logged yet", () => {
    const today = new Date("2026-01-10T00:00:00Z");
    const active = new Set([day("2026-01-09")]);
    const r = computeStreak({ activeDays: active, restDays: [], today });
    expect(r.missed).toBe(0);
    expect(r.current).toBe(1);
  });
});

describe("findPrimePeriods", () => {
  it("ignores runs shorter than a week", () => {
    const entries = ["2026-01-01", "2026-01-02", "2026-01-03"].map((date) => ({ date, applied: true }));
    expect(findPrimePeriods(entries, [])).toHaveLength(0);
  });

  it("finds a week-long run with high follow-through", () => {
    const entries = Array.from({ length: 7 }, (_, i) => ({
      date: `2026-01-0${i + 1}`,
      applied: i < 6,
    }));
    const periods = findPrimePeriods(entries, []);
    expect(periods).toHaveLength(1);
    expect(periods[0].days).toBe(7);
    expect(periods[0].appliedRate).toBeCloseTo(6 / 7);
  });

  it("rejects a run with weak follow-through", () => {
    const entries = Array.from({ length: 7 }, (_, i) => ({ date: `2026-01-0${i + 1}`, applied: i < 3 }));
    expect(findPrimePeriods(entries, [])).toHaveLength(0);
  });
});

describe("badgeText", () => {
  it("returns the right locale copy", () => {
    const badge = BADGES[0];
    expect(badgeText(badge, "en").title).toBe(badge.en.title);
    expect(badgeText(badge, "ar").title).toBe(badge.ar.title);
  });
});

describe("categoryLabel", () => {
  it("resolves a known category and ignores unknown or empty ids", () => {
    expect(categoryLabel("history", "en")?.en).toBe("History");
    expect(categoryLabel("history", "ar")?.ar).toBe("تاريخ");
    expect(categoryLabel("nope", "en")).toBeNull();
    expect(categoryLabel(null, "en")).toBeNull();
  });
});
