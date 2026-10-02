/**
 * Supabase mirror for the local store.
 *
 * The app is local-first: Dexie is always authoritative for the UI, and this
 * module pushes rows up and pulls them down for signed-in readers.
 *
 * The Postgres schema is the one the Expo app already uses, so the mappers here
 * translate between its column names and the app's camelCase model:
 *
 * - `reading_sessions.started_at` is a timestamp; the app stores a `day` key.
 *   A session's day is derived from `started_at` at UTC midnight, which is what
 *   every streak calculation expects.
 * - `daily_entries.entry_date` is the day column.
 *
 * Nothing here runs for a guest; it is only called when a session exists.
 */
import { supabase } from "@/lib/supabase";
import { db } from "@/db";
import type { Book, DailyEntry, Goal, Quote, ReadingSession, WeeklyReview } from "@/data/types";

type Row = Record<string, unknown>;

const iso = (d: Date | string | null | undefined): string | null =>
  d == null ? null : d instanceof Date ? d.toISOString() : d;

/** `YYYY-MM-DD` for a day key or Date. */
const dayKey = (d: Date | string): string =>
  d instanceof Date ? d.toISOString().slice(0, 10) : d.slice(0, 10);

/** A UTC-midnight timestamp for a day key — the inverse of `dayKey`. */
const dayToStamp = (day: string): string => `${dayKey(day)}T00:00:00.000Z`;

// ── mappers: local row -> Postgres row ──────────────────────────────────────

const toBookRow = (b: Book): Row => ({
  id: b.id,
  title: b.title,
  author: b.author,
  total_pages: b.totalPages,
  current_page: b.currentPage,
  status: b.status,
  cover_color: b.coverColor,
  category: b.category,
  is_future: b.isFuture,
  created_at: iso(b.created),
  updated_at: iso(b.updated),
});

const toSessionRow = (s: ReadingSession): Row => ({
  id: s.id,
  book_id: s.bookId,
  started_at: dayToStamp(s.day),
  minutes: s.minutes,
  pages_read: s.pagesRead,
  mood: s.mood,
  note: s.note,
  applied_yesterday: s.appliedYesterday,
  created_at: iso(s.created),
});

const toQuoteRow = (q: Quote): Row => ({
  id: q.id,
  book_id: q.bookId,
  text: q.text,
  page: q.page,
  created_at: iso(q.created),
});

const toGoalRow = (g: Goal): Row => ({
  id: g.id,
  kind: g.kind,
  target: g.target,
  period: g.period,
  created_at: iso(g.created),
});

const toEntryRow = (e: DailyEntry): Row => ({
  id: e.id,
  book_id: e.bookId,
  entry_date: dayKey(e.day),
  pages_from: e.pagesFrom,
  pages_to: e.pagesTo,
  summary: e.summary,
  essence: e.essence,
  created_at: iso(e.created),
});

const toReviewRow = (r: WeeklyReview): Row => ({
  id: r.id,
  week_start: dayKey(r.weekStart),
  week_end: dayKey(r.weekEnd),
  good: r.good,
  to_improve: r.toImprove,
  created_at: iso(r.created),
});

// ── mappers: Postgres row -> local row ──────────────────────────────────────

const fromBookRow = (r: Row): Book => ({
  id: String(r.id),
  created: new Date(String(r.created_at)),
  updated: new Date(String(r.updated_at ?? r.created_at)),
  title: String(r.title),
  author: (r.author as string | null) ?? null,
  totalPages: Number(r.total_pages ?? 0),
  currentPage: Number(r.current_page ?? 0),
  status: (r.status as Book["status"]) ?? "reading",
  coverColor: (r.cover_color as string | null) ?? null,
  category: (r.category as string | null) ?? null,
  isFuture: Boolean(r.is_future),
});

const fromSessionRow = (r: Row): ReadingSession => ({
  id: String(r.id),
  created: new Date(String(r.created_at)),
  bookId: (r.book_id as string | null) ?? null,
  // A session counts toward the UTC day it started.
  day: String(r.started_at).slice(0, 10),
  minutes: Number(r.minutes ?? 0),
  pagesRead: Number(r.pages_read ?? 0),
  mood: (r.mood as string | null) ?? null,
  note: (r.note as string | null) ?? null,
  appliedYesterday: (r.applied_yesterday as boolean | null) ?? null,
});

const fromQuoteRow = (r: Row): Quote => ({
  id: String(r.id),
  created: new Date(String(r.created_at)),
  bookId: (r.book_id as string | null) ?? null,
  text: String(r.text),
  page: (r.page as number | null) ?? null,
});

const fromGoalRow = (r: Row): Goal => ({
  id: String(r.id),
  created: new Date(String(r.created_at)),
  kind: r.kind as Goal["kind"],
  target: Number(r.target),
  period: r.period as Goal["period"],
});

const fromEntryRow = (r: Row): DailyEntry => ({
  id: String(r.id),
  created: new Date(String(r.created_at)),
  day: String(r.entry_date).slice(0, 10),
  bookId: (r.book_id as string | null) ?? null,
  pagesFrom: (r.pages_from as number | null) ?? null,
  pagesTo: (r.pages_to as number | null) ?? null,
  summary: String(r.summary ?? ""),
  essence: (r.essence as string | null) ?? null,
});

const fromReviewRow = (r: Row): WeeklyReview => ({
  id: String(r.id),
  created: new Date(String(r.created_at)),
  weekStart: String(r.week_start).slice(0, 10),
  weekEnd: String(r.week_end).slice(0, 10),
  good: String(r.good ?? ""),
  toImprove: String(r.to_improve ?? ""),
});

/** The reader id, or null when signed out. */
async function currentUserId(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/**
 * Pushes every local row and pulls the server copy back.
 *
 * Upserts are keyed on `id`, so re-running is safe. Deletes are not synced yet
 * (a deleted local row simply disappears; the server copy is ignored on the
 * next pull) — acceptable while single-device use is the norm.
 */
export async function syncAll(): Promise<{ pushed: number; pulled: number }> {
  if (!supabase) return { pushed: 0, pulled: 0 };
  const userId = await currentUserId();
  if (!userId) return { pushed: 0, pulled: 0 };

  const [books, sessions, quotes, goals, entries, reviews] = await Promise.all([
    db.books.toArray(),
    db.sessions.toArray(),
    db.quotes.toArray(),
    db.goals.toArray(),
    db.dailyEntries.toArray(),
    db.weeklyReviews.toArray(),
  ]);

  const withUser = (rows: Row[]) => rows.map((r) => ({ ...r, user_id: userId }));
  let pushed = 0;

  // Push local -> server. Books go first so session/quote foreign keys resolve.
  if (books.length) {
    const { error } = await supabase.from("books").upsert(withUser(books.map(toBookRow)));
    if (error) throw error;
    pushed += books.length;
  }
  if (sessions.length) {
    const { error } = await supabase
      .from("reading_sessions")
      .upsert(withUser(sessions.map(toSessionRow)));
    if (error) throw error;
    pushed += sessions.length;
  }
  if (quotes.length) {
    const { error } = await supabase.from("quotes").upsert(withUser(quotes.map(toQuoteRow)));
    if (error) throw error;
    pushed += quotes.length;
  }
  if (goals.length) {
    const { error } = await supabase.from("goals").upsert(withUser(goals.map(toGoalRow)));
    if (error) throw error;
    pushed += goals.length;
  }
  if (entries.length) {
    const { error } = await supabase
      .from("daily_entries")
      .upsert(withUser(entries.map(toEntryRow)));
    if (error) throw error;
    pushed += entries.length;
  }
  if (reviews.length) {
    const { error } = await supabase
      .from("weekly_reviews")
      .upsert(withUser(reviews.map(toReviewRow)), { onConflict: "user_id,week_start" });
    if (error) throw error;
    pushed += reviews.length;
  }

  // Pull server -> local.
  const [rBooks, rSessions, rQuotes, rGoals, rEntries, rReviews] = await Promise.all([
    supabase.from("books").select("*"),
    supabase.from("reading_sessions").select("*"),
    supabase.from("quotes").select("*"),
    supabase.from("goals").select("*"),
    supabase.from("daily_entries").select("*"),
    supabase.from("weekly_reviews").select("*"),
  ]);

  const pulled =
    (rBooks.data?.length ?? 0) +
    (rSessions.data?.length ?? 0) +
    (rQuotes.data?.length ?? 0) +
    (rGoals.data?.length ?? 0) +
    (rEntries.data?.length ?? 0) +
    (rReviews.data?.length ?? 0);

  await db.transaction(
    "rw",
    [db.books, db.sessions, db.quotes, db.goals, db.dailyEntries, db.weeklyReviews],
    async () => {
      if (rBooks.data?.length) await db.books.bulkPut(rBooks.data.map(fromBookRow));
      if (rSessions.data?.length) await db.sessions.bulkPut(rSessions.data.map(fromSessionRow));
      if (rQuotes.data?.length) await db.quotes.bulkPut(rQuotes.data.map(fromQuoteRow));
      if (rGoals.data?.length) await db.goals.bulkPut(rGoals.data.map(fromGoalRow));
      if (rEntries.data?.length) await db.dailyEntries.bulkPut(rEntries.data.map(fromEntryRow));
      if (rReviews.data?.length) await db.weeklyReviews.bulkPut(rReviews.data.map(fromReviewRow));
    },
  );

  return { pushed, pulled };
}
