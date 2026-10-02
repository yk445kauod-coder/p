/**
 * Reading-plan maths.
 *
 * Turns a book's page count and the reader's daily page target into the numbers
 * shown on the plan bar: how many reading days are left, what percentage of the
 * book remains, and what the target works out to per reading day. Rest days and
 * review days are excluded from the pace, so the estimate matches the schedule
 * the reader actually keeps.
 */
import { toDayKey } from "./achievements";

export interface PlanInput {
  totalPages: number;
  currentPage: number;
  dailyPagesGoal: number;
  /** Weekdays (0=Sunday … 6=Saturday) that never count as reading days. */
  offDays: number[];
  today?: Date;
}

export interface Plan {
  pagesLeft: number;
  percentLeft: number;
  percentDone: number;
  /** Reading days needed at the current daily target. */
  readingDaysNeeded: number;
  /** Calendar days until the book is finished, planned days off included. */
  calendarDaysLeft: number;
  /** ISO day key the reader is projected to finish on. */
  finishDate: string | null;
  /** Reading days in the next seven days, used to sanity-check the pace. */
  readingDaysPerWeek: number;
  /** Pages a week at the current target. */
  pagesPerWeek: number;
}

/** Counts how many of the next `days` calendar days are reading days. */
export function countReadingDays(offDays: number[], days = 7, from = new Date()): number {
  const off = new Set(offDays);
  let count = 0;
  const cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  for (let i = 0; i < days; i++) {
    if (!off.has(cursor.getUTCDay())) count++;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return count;
}

export function computePlan({
  totalPages,
  currentPage,
  dailyPagesGoal,
  offDays,
  today = new Date(),
}: PlanInput): Plan {
  const pagesLeft = Math.max(0, totalPages - currentPage);
  const perDay = Math.max(1, dailyPagesGoal);
  const readingDaysPerWeek = countReadingDays(offDays, 7, today);

  const percentDone = totalPages > 0 ? Math.min(1, currentPage / totalPages) : 0;
  const percentLeft = totalPages > 0 ? Math.max(0, 1 - percentDone) : 0;

  const readingDaysNeeded = pagesLeft > 0 ? Math.ceil(pagesLeft / perDay) : 0;

  // Walk forward, counting only reading days, until the required days are used.
  const off = new Set(offDays);
  let calendarDaysLeft = 0;
  let finishDate: string | null = null;
  if (readingDaysNeeded > 0) {
    const cursor = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    let used = 0;
    // A safety bound keeps a pathological schedule (every day off) from looping.
    for (let guard = 0; used < readingDaysNeeded && guard < 3650; guard++) {
      cursor.setUTCDate(cursor.getUTCDate() + 1);
      calendarDaysLeft++;
      if (!off.has(cursor.getUTCDay())) used++;
    }
    finishDate = toDayKey(cursor);
  } else if (pagesLeft === 0 && totalPages > 0) {
    finishDate = toDayKey(today);
  }

  return {
    pagesLeft,
    percentLeft,
    percentDone,
    readingDaysNeeded,
    calendarDaysLeft,
    finishDate,
    readingDaysPerWeek,
    pagesPerWeek: readingDaysPerWeek * perDay,
  };
}

/** The first day the reader ever logged something, as an ISO day key. */
export function journeyStart(dates: string[]): string | null {
  if (!dates.length) return null;
  return [...dates].sort()[0];
}

/** Whole days between the journey start and today, inclusive of the first day. */
export function daysSince(startKey: string, today = new Date()): number {
  const start = new Date(`${startKey}T00:00:00Z`).getTime();
  const end = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return Math.max(0, Math.floor((end - start) / 86_400_000)) + 1;
}

/**
 * Progress toward the next badge, as a fraction.
 *
 * Anchored to the previous milestone so the bar fills across the whole gap
 * rather than jumping to nearly full as soon as a badge unlocks.
 */
export function badgeProgress(streak: number, nextDays: number, prevDays: number): number {
  if (nextDays <= prevDays) return 0;
  return Math.max(0, Math.min(1, (streak - prevDays) / (nextDays - prevDays)));
}
