"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useMemo } from "react";
import { db, newId, DEFAULT_PREFERENCES, getPreferences } from "@/db";
import { computeStats, toDayKey } from "@/lib/reading";
import type { Stats } from "@/data/types";
import type {
  Book,
  BookStatus,
  DailyEntry,
  Goal,
  GoalKind,
  GoalPeriod,
  Preferences,
  Quote,
  ReadingSession,
  WeeklyReview,
} from "@/data/types";

/**
 * The reading store.
 *
 * Reads are live (Dexie `useLiveQuery`, so every screen re-renders the moment a
 * row changes) and writes go local-first. Supabase mirroring is layered on top
 * by `sync.ts` for signed-in readers; nothing here assumes a network.
 */
export interface DataValue {
  ready: boolean;
  books: Book[];
  futureBooks: Book[];
  sessions: ReadingSession[];
  quotes: Quote[];
  goals: Goal[];
  dailyEntries: DailyEntry[];
  weeklyReviews: WeeklyReview[];
  preferences: Preferences;
  stats: Stats;

  addBook: (input: {
    title: string;
    author?: string | null;
    totalPages?: number;
    currentPage?: number;
    status?: BookStatus;
    coverColor?: string | null;
    category?: string | null;
    isFuture?: boolean;
  }) => Promise<void>;
  updateBook: (id: string, patch: Partial<Book>) => Promise<void>;
  deleteBook: (id: string) => Promise<void>;

  logSession: (input: {
    bookId?: string | null;
    minutes: number;
    pagesRead: number;
    mood?: string | null;
    note?: string | null;
    appliedYesterday?: boolean | null;
    day?: string;
  }) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;

  addQuote: (input: { bookId?: string | null; text: string; page?: number | null }) => Promise<void>;
  deleteQuote: (id: string) => Promise<void>;

  addGoal: (input: { kind: GoalKind; target: number; period: GoalPeriod }) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;

  saveDailyEntry: (input: {
    day: string;
    bookId?: string | null;
    summary: string;
    essence?: string | null;
  }) => Promise<void>;

  saveWeeklyReview: (input: {
    weekStart: string;
    weekEnd: string;
    good: string;
    toImprove: string;
  }) => Promise<void>;

  setPreferences: (patch: Partial<Preferences>) => Promise<void>;
  clearAll: () => Promise<void>;
}

export function useData(): DataValue {
  const books = useLiveQuery(() => db.books.toArray(), [], undefined);
  const sessions = useLiveQuery(() => db.sessions.toArray(), [], undefined);
  const quotes = useLiveQuery(() => db.quotes.toArray(), [], undefined);
  const goals = useLiveQuery(() => db.goals.toArray(), [], undefined);
  const dailyEntries = useLiveQuery(() => db.dailyEntries.toArray(), [], undefined);
  const weeklyReviews = useLiveQuery(() => db.weeklyReviews.toArray(), [], undefined);
  const preferences = useLiveQuery(() => getPreferences(), [], undefined);

  const ready = books !== undefined && sessions !== undefined && preferences !== undefined;

  const shelf = useMemo(() => (books ?? []).filter((b) => !b.isFuture), [books]);
  const future = useMemo(() => (books ?? []).filter((b) => b.isFuture), [books]);

  const prefs = useMemo<Preferences>(
    () =>
      preferences ?? {
        id: "preferences",
        created: new Date(),
        ...DEFAULT_PREFERENCES,
      },
    [preferences],
  );

  const stats = useMemo(
    () => computeStats(sessions ?? [], shelf, prefs.restDays, prefs.reviewDays),
    [sessions, shelf, prefs.restDays, prefs.reviewDays],
  );

  return useMemo<DataValue>(
    () => ({
      ready,
      books: shelf,
      futureBooks: future,
      sessions: sessions ?? [],
      quotes: quotes ?? [],
      goals: goals ?? [],
      dailyEntries: dailyEntries ?? [],
      weeklyReviews: weeklyReviews ?? [],
      preferences: prefs,
      stats,

      addBook: async (input) => {
        const now = new Date();
        const book: Book = {
          id: newId(),
          created: now,
          updated: now,
          title: input.title,
          author: input.author ?? null,
          totalPages: input.totalPages ?? 0,
          currentPage: input.currentPage ?? 0,
          status: input.status ?? "reading",
          coverColor: input.coverColor ?? null,
          category: input.category ?? null,
          isFuture: input.isFuture ?? false,
        };
        await db.books.add(book);
      },

      updateBook: async (id, patch) => {
        await db.books.update(id, { ...patch, updated: new Date() });
      },

      deleteBook: async (id) => {
        await db.books.delete(id);
      },

      logSession: async (input) => {
        const session: ReadingSession = {
          id: newId(),
          created: new Date(),
          bookId: input.bookId ?? null,
          day: input.day ?? toDayKey(new Date()),
          minutes: input.minutes,
          pagesRead: input.pagesRead,
          mood: input.mood ?? null,
          note: input.note ?? null,
          appliedYesterday: input.appliedYesterday ?? null,
        };
        await db.sessions.add(session);

        // Advance the book's page counter, and finish it when it reaches the end.
        if (session.bookId && session.pagesRead > 0) {
          const book = await db.books.get(session.bookId);
          if (book) {
            const currentPage = book.currentPage + session.pagesRead;
            const done = book.totalPages > 0 && currentPage >= book.totalPages;
            await db.books.update(book.id, {
              currentPage,
              status: done ? "finished" : book.status,
              updated: new Date(),
            });
          }
        }
      },

      deleteSession: async (id) => {
        await db.sessions.delete(id);
      },

      addQuote: async (input) => {
        await db.quotes.add({
          id: newId(),
          created: new Date(),
          bookId: input.bookId ?? null,
          text: input.text,
          page: input.page ?? null,
        });
      },

      deleteQuote: async (id) => {
        await db.quotes.delete(id);
      },

      addGoal: async (input) => {
        await db.goals.add({ id: newId(), created: new Date(), ...input });
      },

      deleteGoal: async (id) => {
        await db.goals.delete(id);
      },

      saveDailyEntry: async (input) => {
        // One entry per day: replace any existing row for that date.
        const existing = await db.dailyEntries.where("day").equals(input.day).first();
        if (existing) await db.dailyEntries.delete(existing.id);
        await db.dailyEntries.add({
          id: newId(),
          created: new Date(),
          day: input.day,
          bookId: input.bookId ?? null,
          pagesFrom: null,
          pagesTo: null,
          summary: input.summary,
          essence: input.essence ?? null,
        });
      },

      saveWeeklyReview: async (input) => {
        const existing = await db.weeklyReviews.where("weekStart").equals(input.weekStart).first();
        if (existing) await db.weeklyReviews.delete(existing.id);
        await db.weeklyReviews.add({ id: newId(), created: new Date(), ...input });
      },

      setPreferences: async (patch) => {
        await getPreferences();
        await db.preferences.update("preferences", patch);
      },

      clearAll: async () => {
        await db.delete();
        await db.open();
      },
    }),
    [ready, shelf, future, sessions, quotes, goals, dailyEntries, weeklyReviews, prefs, stats],
  );
}
