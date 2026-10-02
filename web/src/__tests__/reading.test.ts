import { describe, expect, it } from "vitest";
import {
  badgeProgress,
  computePlan,
  computeStats,
  computeStreak,
  countReadingDays,
  daysSince,
  toDayKey,
} from "@/lib/reading";
import type { Book, ReadingSession } from "@/data/types";

function session(partial: Partial<ReadingSession> & { day: string; minutes: number; pagesRead: number }): ReadingSession {
  return {
    id: partial.id ?? `s-${partial.day}-${partial.minutes}`,
    created: new Date(),
    bookId: partial.bookId ?? null,
    day: partial.day,
    minutes: partial.minutes,
    pagesRead: partial.pagesRead,
    mood: null,
    note: null,
    appliedYesterday: partial.appliedYesterday ?? null,
  };
}

function book(partial: Partial<Book> & { id: string }): Book {
  return {
    id: partial.id,
    created: new Date(),
    updated: new Date(),
    title: partial.title ?? "Book",
    author: null,
    totalPages: partial.totalPages ?? 200,
    currentPage: partial.currentPage ?? 0,
    status: partial.status ?? "reading",
    coverColor: null,
    category: null,
    isFuture: false,
  };
}

/** Today at UTC midnight, shifted back `n` days, as an ISO day key. */
function daysAgo(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return toDayKey(d);
}

describe("computeStreak", () => {
  it("is zero with no activity", () => {
    expect(computeStreak({ activeDays: new Set(), restDays: [] })).toEqual({
      current: 0,
      longest: 0,
      missed: 0,
    });
  });

  it("counts consecutive days ending today", () => {
    const active = new Set([daysAgo(2), daysAgo(1), daysAgo(0)]);
    const r = computeStreak({ activeDays: active, restDays: [] });
    expect(r.current).toBe(3);
    expect(r.longest).toBe(3);
    expect(r.missed).toBe(0);
  });

  it("does not break the run across a planned rest day", () => {
    // Two days apart with the gap marked as a rest day keeps the run alive.
    const gap = new Date();
    gap.setUTCDate(gap.getUTCDate() - 1);
    const active = new Set([daysAgo(2), daysAgo(0)]);
    const r = computeStreak({ activeDays: active, restDays: [gap.getUTCDay()] });
    expect(r.current).toBe(2);
  });

  it("counts unplanned gaps as missed days", () => {
    const active = new Set([daysAgo(5), daysAgo(0)]);
    const r = computeStreak({ activeDays: active, restDays: [] });
    expect(r.missed).toBe(4);
    expect(r.current).toBe(1);
  });
});

describe("countReadingDays", () => {
  it("counts every day when none are off", () => {
    expect(countReadingDays([], 7)).toBe(7);
  });

  it("excludes a planned weekday", () => {
    const monday = new Date("2026-01-05T00:00:00Z").getUTCDay();
    expect(countReadingDays([monday], 7, new Date("2026-01-05T00:00:00Z"))).toBe(6);
  });
});

describe("computePlan", () => {
  it("splits remaining pages across the daily target", () => {
    const plan = computePlan({ totalPages: 300, currentPage: 100, dailyPagesGoal: 20, offDays: [] });
    expect(plan.pagesLeft).toBe(200);
    expect(plan.readingDaysNeeded).toBe(10);
    expect(plan.percentDone).toBeCloseTo(1 / 3);
  });

  it("dates a finished book to today", () => {
    const plan = computePlan({
      totalPages: 200,
      currentPage: 200,
      dailyPagesGoal: 10,
      offDays: [],
      today: new Date("2026-03-01T00:00:00Z"),
    });
    expect(plan.pagesLeft).toBe(0);
    expect(plan.finishDate).toBe("2026-03-01");
  });

  it("never reports a negative remaining count", () => {
    const plan = computePlan({ totalPages: 100, currentPage: 140, dailyPagesGoal: 10, offDays: [] });
    expect(plan.pagesLeft).toBe(0);
    expect(plan.percentLeft).toBe(0);
  });

  it("floors the daily target at one page", () => {
    expect(computePlan({ totalPages: 10, currentPage: 0, dailyPagesGoal: 0, offDays: [] }).readingDaysNeeded).toBe(10);
  });
});

describe("daysSince", () => {
  it("is inclusive of the first day", () => {
    expect(daysSince("2026-01-01", new Date("2026-01-01T12:00:00Z"))).toBe(1);
    expect(daysSince("2026-01-01", new Date("2026-01-10T00:00:00Z"))).toBe(10);
  });

  it("clamps a future start date to zero", () => {
    expect(daysSince("2026-06-01", new Date("2026-01-01T00:00:00Z"))).toBe(0);
  });
});

describe("badgeProgress", () => {
  it("fills across the gap between milestones", () => {
    expect(badgeProgress(3, 7, 3)).toBe(0);
    expect(badgeProgress(5, 7, 3)).toBeCloseTo(0.5);
    expect(badgeProgress(7, 7, 3)).toBe(1);
  });

  it("never divides by zero", () => {
    expect(badgeProgress(5, 3, 3)).toBe(0);
  });
});

describe("computeStats", () => {
  it("returns a zeroed shape with no sessions", () => {
    const s = computeStats([], [], []);
    expect(s.totalMinutes).toBe(0);
    expect(s.streak).toBe(0);
    expect(s.last30).toHaveLength(30);
    expect(s.startDate).toBeNull();
  });

  it("sums minutes, pages and sessions", () => {
    const s = computeStats(
      [
        session({ day: daysAgo(0), minutes: 20, pagesRead: 12 }),
        session({ day: daysAgo(0), minutes: 10, pagesRead: 5 }),
      ],
      [],
      [],
    );
    expect(s.totalMinutes).toBe(30);
    expect(s.totalPages).toBe(17);
    expect(s.todayMinutes).toBe(30);
  });

  it("counts finished books", () => {
    const s = computeStats([], [book({ id: "a", status: "finished" }), book({ id: "b" })], []);
    expect(s.booksFinished).toBe(1);
  });

  it("averages only across days that had reading", () => {
    const s = computeStats(
      [session({ day: daysAgo(0), minutes: 40, pagesRead: 1 }), session({ day: daysAgo(2), minutes: 20, pagesRead: 1 })],
      [],
      [],
    );
    expect(s.avgMinutes).toBe(30);
  });

  it("buckets the last 30 days", () => {
    const s = computeStats([session({ day: daysAgo(0), minutes: 15, pagesRead: 4 })], [], []);
    expect(s.last30[s.last30.length - 1].minutes).toBe(15);
    expect(s.last30[0].minutes).toBe(0);
  });

  it("does not count today as missed before anything is logged", () => {
    const s = computeStats([session({ day: daysAgo(1), minutes: 20, pagesRead: 5 })], [], []);
    expect(s.missed).toBe(0);
    expect(s.streak).toBe(1);
  });
});
