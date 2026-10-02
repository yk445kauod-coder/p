import { computeStats } from "../src/store/data";
import type { Book, ReadingSession } from "../src/store/data";

function session(partial: Partial<ReadingSession> & { started_at: string; minutes: number; pages_read: number }): ReadingSession {
  return {
    id: partial.id ?? `s-${partial.started_at}`,
    book_id: partial.book_id ?? null,
    started_at: partial.started_at,
    ended_at: partial.ended_at ?? null,
    minutes: partial.minutes,
    pages_read: partial.pages_read,
    mood: partial.mood ?? null,
    note: partial.note ?? null,
    applied_yesterday: partial.applied_yesterday ?? null,
    summary: partial.summary ?? null,
    created_at: partial.created_at ?? partial.started_at,
  };
}

function book(partial: Partial<Book> & { id: string }): Book {
  return {
    id: partial.id,
    title: partial.title ?? "Book",
    author: partial.author ?? null,
    total_pages: partial.total_pages ?? 200,
    current_page: partial.current_page ?? 0,
    status: partial.status ?? "reading",
    cover_color: partial.cover_color ?? null,
    category: partial.category ?? null,
    is_future: partial.is_future ?? false,
    created_at: partial.created_at ?? "2026-01-01T00:00:00Z",
    updated_at: partial.updated_at ?? "2026-01-01T00:00:00Z",
  };
}

/** Today at UTC midnight, as an ISO timestamp. */
function daysAgoIso(n: number, hour = 9): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  d.setUTCHours(hour, 0, 0, 0);
  return d.toISOString();
}

describe("computeStats", () => {
  it("returns an all-zero shape with no sessions", () => {
    const s = computeStats([], [], []);
    expect(s.totalMinutes).toBe(0);
    expect(s.totalSessions).toBe(0);
    expect(s.streak).toBe(0);
    expect(s.last30).toHaveLength(30);
    expect(s.startDate).toBeNull();
  });

  it("sums minutes, pages and sessions", () => {
    const s = computeStats(
      [
        session({ started_at: daysAgoIso(0), minutes: 20, pages_read: 12 }),
        session({ started_at: daysAgoIso(0), minutes: 10, pages_read: 5 }),
      ],
      [],
      [],
    );
    expect(s.totalMinutes).toBe(30);
    expect(s.totalPages).toBe(17);
    expect(s.totalSessions).toBe(2);
    expect(s.todayMinutes).toBe(30);
    expect(s.todayPages).toBe(17);
  });

  it("counts finished books", () => {
    const s = computeStats([], [book({ id: "a", status: "finished" }), book({ id: "b", status: "reading" })], []);
    expect(s.booksFinished).toBe(1);
  });

  it("averages only across days that had reading", () => {
    const s = computeStats(
      [
        session({ started_at: daysAgoIso(0), minutes: 40, pages_read: 10 }),
        session({ started_at: daysAgoIso(2), minutes: 20, pages_read: 10 }),
      ],
      [],
      [],
    );
    expect(s.avgMinutes).toBe(30);
  });

  it("reports the earliest active day as the journey start", () => {
    const s = computeStats(
      [
        session({ started_at: daysAgoIso(5), minutes: 10, pages_read: 1 }),
        session({ started_at: daysAgoIso(1), minutes: 10, pages_read: 1 }),
      ],
      [],
      [],
    );
    expect(s.startDate).toBe(daysAgoIso(5).slice(0, 10));
  });

  it("buckets the last 30 days into day stats", () => {
    const s = computeStats([session({ started_at: daysAgoIso(0), minutes: 15, pages_read: 4 })], [], []);
    const today = s.last30[s.last30.length - 1];
    expect(today.minutes).toBe(15);
    expect(today.pages).toBe(4);
    expect(s.last30[0].minutes).toBe(0);
  });

  it("does not count today as missed before anything is logged", () => {
    const s = computeStats([session({ started_at: daysAgoIso(1), minutes: 20, pages_read: 5 })], [], []);
    expect(s.missed).toBe(0);
    expect(s.streak).toBe(1);
  });
});
