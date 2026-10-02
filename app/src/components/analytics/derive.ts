/**
 * Derives chart data from the reader's own sessions and books.
 *
 * There is no mock data anywhere in this module: every series is computed from
 * what the signed-in (or guest) reader has actually logged, so two accounts
 * never see the same charts.
 */
import type { Book, ReadingSession } from "../../api/db";
import type { CalendarDatum, GenreDatum, MonthlyDatum } from "./types";

const DAY_MS = 86_400_000;

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

export interface CalendarRange {
  from: string;
  to: string;
}

/**
 * A rolling year ending today, aligned to whole months so Nivo's month legends
 * never start or end mid-month.
 */
export function calendarRange(today = new Date()): CalendarRange {
  const to = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const from = new Date(Date.UTC(to.getUTCFullYear() - 1, to.getUTCMonth(), 1));
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

/** Pages read per day over the last year — the contribution calendar. */
export function deriveCalendar(sessions: ReadingSession[], today = new Date()): CalendarDatum[] {
  const { from, to } = calendarRange(today);
  const byDay = new Map<string, number>();
  for (const s of sessions) {
    const k = dayKey(s.started_at);
    if (k < from || k > to) continue;
    byDay.set(k, (byDay.get(k) ?? 0) + s.pages_read);
  }
  return [...byDay.entries()]
    .map(([day, value]) => ({ day, value }))
    .sort((a, b) => a.day.localeCompare(b.day));
}

/**
 * Pages read per category. Sessions without a `book_id`, or whose book has no
 * category, are grouped under `uncategorised` so the total still matches the
 * reader's logged pages.
 */
export function deriveGenres(
  sessions: ReadingSession[],
  books: Book[],
  uncategorisedLabel: string,
): GenreDatum[] {
  const categoryOf = new Map<string, string | null>();
  for (const b of books) categoryOf.set(b.id, b.category);

  const byCategory = new Map<string, number>();
  for (const s of sessions) {
    const category = (s.book_id ? categoryOf.get(s.book_id) : null) ?? null;
    const key = category ?? "__none__";
    byCategory.set(key, (byCategory.get(key) ?? 0) + s.pages_read);
  }

  return [...byCategory.entries()]
    .filter(([, value]) => value > 0)
    .map(([key, value]) =>
      key === "__none__"
        ? { id: "__none__", value, label: uncategorisedLabel }
        : { id: key, value },
    )
    .sort((a, b) => b.value - a.value);
}

/** Pages read and books finished for each of the last `months` months. */
export function deriveMonthly(
  sessions: ReadingSession[],
  books: Book[],
  months = 12,
  today = new Date(),
): MonthlyDatum[] {
  const cutoff = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - (months - 1), 1),
  );

  const pages = new Map<string, number>();
  for (const s of sessions) {
    const k = monthKey(s.started_at);
    if (new Date(`${k}-01T00:00:00Z`) < cutoff) continue;
    pages.set(k, (pages.get(k) ?? 0) + s.pages_read);
  }

  // A finished book counts in the month it was last updated, which is when the
  // reader marked it done.
  const finished = new Map<string, number>();
  for (const b of books) {
    if (b.status !== "finished") continue;
    const k = monthKey(b.updated_at);
    if (new Date(`${k}-01T00:00:00Z`) < cutoff) continue;
    finished.set(k, (finished.get(k) ?? 0) + 1);
  }

  const out: MonthlyDatum[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - i, 1));
    const k = d.toISOString().slice(0, 7);
    out.push({ month: k, pages: pages.get(k) ?? 0, books: finished.get(k) ?? 0 });
  }
  return out;
}

/** Total logged pages in the current streak year — used for the calendar caption. */
export function totalPages(data: CalendarDatum[]): number {
  return data.reduce((sum, d) => sum + d.value, 0);
}

export function activeDays(data: CalendarDatum[]): number {
  return data.filter((d) => d.value > 0).length;
}

export { DAY_MS };
