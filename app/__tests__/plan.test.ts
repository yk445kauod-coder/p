import { computePlan, countReadingDays, daysSince, badgeProgress } from "../src/domain/plan";

describe("countReadingDays", () => {
  it("counts every day when there are no days off", () => {
    expect(countReadingDays([], 7)).toBe(7);
  });

  it("excludes planned days off", () => {
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

  it("treats a finished book as zero days left and dates it today", () => {
    const plan = computePlan({
      totalPages: 200,
      currentPage: 200,
      dailyPagesGoal: 10,
      offDays: [],
      today: new Date("2026-03-01T00:00:00Z"),
    });
    expect(plan.pagesLeft).toBe(0);
    expect(plan.readingDaysNeeded).toBe(0);
    expect(plan.finishDate).toBe("2026-03-01");
  });

  it("skips days off when projecting the finish date", () => {
    const plan = computePlan({
      totalPages: 100,
      currentPage: 0,
      dailyPagesGoal: 50,
      offDays: [0, 1, 2, 3, 4, 5],
      today: new Date("2026-01-05T00:00:00Z"),
    });
    expect(plan.readingDaysNeeded).toBe(2);
    expect(plan.finishDate).not.toBeNull();
    expect(plan.calendarDaysLeft).toBeGreaterThanOrEqual(2);
  });

  it("never reports a negative remaining count", () => {
    const plan = computePlan({ totalPages: 100, currentPage: 140, dailyPagesGoal: 10, offDays: [] });
    expect(plan.pagesLeft).toBe(0);
    expect(plan.percentLeft).toBe(0);
  });

  it("floors the daily target at one page", () => {
    const plan = computePlan({ totalPages: 10, currentPage: 0, dailyPagesGoal: 0, offDays: [] });
    expect(plan.readingDaysNeeded).toBe(10);
  });
});

describe("daysSince", () => {
  it("is inclusive of the first day", () => {
    expect(daysSince("2026-01-01", new Date("2026-01-01T12:00:00Z"))).toBe(1);
    expect(daysSince("2026-01-01", new Date("2026-01-10T00:00:00Z"))).toBe(10);
  });

  it("clamps future start dates to zero", () => {
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
