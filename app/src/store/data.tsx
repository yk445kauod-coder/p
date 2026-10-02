import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "./auth";
import { supabase } from "../lib/supabase";
import * as db from "../api/db";
import { computeStreak, toDayKey, type StreakResult } from "../domain/achievements";
import { useSettings } from "./settings";
import { useNotifications } from "./notifications";

export type BookStatus = db.BookStatus;
export type Book = db.Book;
export type ReadingSession = db.ReadingSession;
export type Goal = db.Goal;
export type Quote = db.Quote;
export type WeeklyReview = db.WeeklyReview;
export type DailyEntry = db.DailyEntry;

export interface DayStat {
  date: string;
  minutes: number;
  pages: number;
}

export interface Stats {
  totalMinutes: number;
  totalPages: number;
  totalSessions: number;
  streak: number;
  bestStreak: number;
  missed: number;
  booksFinished: number;
  last30: DayStat[];
  todayMinutes: number;
  todayPages: number;
  weekMinutes: number;
  /** Average minutes on days the reader actually read. */
  avgMinutes: number;
  /** First day with any activity — the start of the journey. */
  startDate: string | null;
  /** Consecutive reading days including planned rest and review days. */
  primeDays: number;
}

interface DataValue {
  ready: boolean;
  syncing: boolean;
  lastSync: number | null;
  error: string | null;
  books: Book[];
  futureBooks: Book[];
  sessions: ReadingSession[];
  goals: Goal[];
  quotes: Quote[];
  weeklyReviews: WeeklyReview[];
  dailyEntries: DailyEntry[];
  stats: Stats;
  addBook: (b: {
    title: string;
    author?: string | null;
    total_pages?: number;
    current_page?: number;
    status?: BookStatus;
    cover_color?: string | null;
    category?: string | null;
    is_future?: boolean;
  }) => Promise<void>;
  updateBook: (id: string, patch: Partial<Book>) => Promise<void>;
  deleteBook: (id: string) => Promise<void>;
  logSession: (s: {
    book_id?: string | null;
    minutes: number;
    pages_read: number;
    mood?: string | null;
    note?: string | null;
    applied_yesterday?: boolean | null;
    summary?: string | null;
    started_at?: string;
  }) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  addGoal: (g: { kind: db.GoalKind; target: number; period: db.GoalPeriod }) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  addQuote: (q: { book_id?: string | null; text: string; page?: number | null }) => Promise<void>;
  deleteQuote: (id: string) => Promise<void>;
  saveWeeklyReview: (r: { week_start: string; week_end: string; good: string; to_improve: string }) => Promise<void>;
  saveDailyEntry: (e: {
    entry_date: string;
    book_id?: string | null;
    pages_from?: number | null;
    pages_to?: number | null;
    summary: string;
    essence?: string | null;
  }) => Promise<void>;
  deleteDailyEntry: (id: string) => Promise<void>;
  sync: () => Promise<void>;
  clearAll: () => Promise<void>;
}

const KEY = "tracebook.data.v2";
const DataContext = createContext<DataValue | null>(null);

const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;

interface Cache {
  books: Book[];
  futureBooks: Book[];
  sessions: ReadingSession[];
  goals: Goal[];
  quotes: Quote[];
  weeklyReviews: WeeklyReview[];
  dailyEntries: DailyEntry[];
  lastSync: number | null;
}

const EMPTY: Cache = {
  books: [],
  futureBooks: [],
  sessions: [],
  goals: [],
  quotes: [],
  weeklyReviews: [],
  dailyEntries: [],
  lastSync: null,
};

function computeStats(
  sessions: ReadingSession[],
  books: Book[],
  restDays: number[],
  reviewDays: number[] = [],
): Stats {
  const byDay = new Map<string, { minutes: number; pages: number }>();
  let totalMinutes = 0;
  let totalPages = 0;
  for (const s of sessions) {
    const k = toDayKey(new Date(s.started_at));
    const cur = byDay.get(k) ?? { minutes: 0, pages: 0 };
    cur.minutes += s.minutes;
    cur.pages += s.pages_read;
    byDay.set(k, cur);
    totalMinutes += s.minutes;
    totalPages += s.pages_read;
  }

  const streak: StreakResult = computeStreak({ activeDays: new Set(byDay.keys()), restDays, reviewDays });

  const today = toDayKey(new Date());
  const last30: DayStat[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    const k = toDayKey(d);
    const v = byDay.get(k) ?? { minutes: 0, pages: 0 };
    last30.push({ date: k, minutes: v.minutes, pages: v.pages });
  }

  const activeDaysCount = [...byDay.values()].filter((v) => v.minutes > 0).length;
  const todayStat = byDay.get(today) ?? { minutes: 0, pages: 0 };

  // Planned days off are excluded from "missed", but they still extend a prime
  // run — showing up around them is the point of scheduling them.
  const primeDays = streak.current;

  return {
    totalMinutes,
    totalPages,
    totalSessions: sessions.length,
    streak: streak.current,
    bestStreak: streak.longest,
    missed: streak.missed,
    booksFinished: books.filter((b) => b.status === "finished").length,
    last30,
    todayMinutes: todayStat.minutes,
    todayPages: todayStat.pages,
    weekMinutes: last30.slice(-7).reduce((a, d) => a + d.minutes, 0),
    avgMinutes: activeDaysCount ? Math.round(totalMinutes / activeDaysCount) : 0,
    startDate: [...byDay.keys()].sort()[0] ?? null,
    primeDays,
  };
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user, offline } = useAuth();
  const { restDays, reviewDays } = useSettings();
  const { push: notify } = useNotifications();
  const [cache, setCache] = useState<Cache>(EMPTY);
  const [ready, setReady] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cloud = Boolean(user && !offline && supabase);

  const persist = useCallback((next: Partial<Cache>) => {
    setCache((prev) => {
      const merged = { ...prev, ...next };
      AsyncStorage.setItem(KEY, JSON.stringify(merged)).catch(() => undefined);
      return merged;
    });
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (!raw) return;
        const v = JSON.parse(raw) as Partial<Cache>;
        setCache({ ...EMPTY, ...v });
      })
      .catch(() => undefined)
      .finally(() => setReady(true));
  }, []);

  const sync = useCallback(async () => {
    if (!cloud) return;
    setSyncing(true);
    setError(null);
    try {
      const [books, futureBooks, sessions, goals, quotes, weeklyReviews, dailyEntries] = await Promise.all([
        db.fetchBooks(),
        db.fetchFutureBooks(),
        db.fetchSessions(),
        db.fetchGoals(),
        db.fetchQuotes(),
        db.fetchWeeklyReviews(),
        db.fetchDailyEntries(),
      ]);
      // The active shelf excludes anything parked on the "read next" list.
      const shelf = books.filter((b) => !b.is_future);
      const ts = Date.now();
      persist({ books: shelf, futureBooks, sessions, goals, quotes, weeklyReviews, dailyEntries, lastSync: ts });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSyncing(false);
    }
  }, [cloud, persist]);

  useEffect(() => {
    // Pull the cloud copy once the cache is hydrated; `sync` owns its own state.
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    if (ready && cloud) sync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, cloud]);

  const value = useMemo<DataValue>(() => {
    const local = (patch: Partial<Cache>) => persist(patch);

    return {
      ready,
      syncing,
      lastSync: cache.lastSync,
      error,
      books: cache.books,
      futureBooks: cache.futureBooks,
      sessions: cache.sessions,
      goals: cache.goals,
      quotes: cache.quotes,
      weeklyReviews: cache.weeklyReviews,
      dailyEntries: cache.dailyEntries,
      stats: computeStats(cache.sessions, cache.books, restDays, reviewDays),

      addBook: async (input) => {
        const now = new Date().toISOString();
        const optimistic: Book = {
          id: `local-${uid()}`,
          title: input.title,
          author: input.author ?? null,
          total_pages: input.total_pages ?? 0,
          current_page: input.current_page ?? 0,
          status: input.status ?? "reading",
          cover_color: input.cover_color ?? null,
          category: input.category ?? null,
          is_future: input.is_future ?? false,
          created_at: now,
          updated_at: now,
        };
        const target = input.is_future ? "futureBooks" : "books";
        local({ [target]: [optimistic, ...cache[target]] } as Partial<Cache>);
        if (cloud) {
          try {
            const saved = await db.insertBook(input);
            setCache((prev) => {
              const list = prev[target].map((b) => (b.id === optimistic.id ? saved : b));
              const merged = { ...prev, [target]: list };
              AsyncStorage.setItem(KEY, JSON.stringify(merged)).catch(() => undefined);
              return merged;
            });
          } catch (e) {
            setError((e as Error).message);
          }
        }
      },

      updateBook: async (id, patch) => {
        local({ books: cache.books.map((b) => (b.id === id ? { ...b, ...patch } : b)) });
        if (cloud && !id.startsWith("local-")) {
          try {
            await db.patchBook(id, patch);
          } catch (e) {
            setError((e as Error).message);
          }
        }
      },

      deleteBook: async (id) => {
        local({
          books: cache.books.filter((b) => b.id !== id),
          futureBooks: cache.futureBooks.filter((b) => b.id !== id),
        });
        if (cloud && !id.startsWith("local-")) {
          try {
            await db.removeBook(id);
          } catch (e) {
            setError((e as Error).message);
          }
        }
      },

      logSession: async (input) => {
        const optimistic: ReadingSession = {
          id: `local-${uid()}`,
          book_id: input.book_id ?? null,
          started_at: input.started_at ?? new Date().toISOString(),
          ended_at: null,
          minutes: input.minutes,
          pages_read: input.pages_read,
          mood: input.mood ?? null,
          note: input.note ?? null,
          applied_yesterday: input.applied_yesterday ?? null,
          summary: input.summary ?? null,
          created_at: new Date().toISOString(),
        };
        const nextBooks = input.book_id
          ? cache.books.map((b) => {
              if (b.id !== input.book_id) return b;
              const page = b.current_page + input.pages_read;
              const done = b.total_pages > 0 && page >= b.total_pages;
              return { ...b, current_page: page, status: (done ? "finished" : b.status) as BookStatus };
            })
          : cache.books;
        local({ sessions: [optimistic, ...cache.sessions], books: nextBooks });

        // Celebrate only the moments worth interrupting for: a fresh streak
        // milestone, or a book that just crossed into "finished".
        const before = computeStats(cache.sessions, cache.books, restDays, reviewDays).streak;
        const after = computeStats([optimistic, ...cache.sessions], nextBooks, restDays, reviewDays).streak;
        if (after > before && after > 0 && after % 7 === 0) {
          void notify({
            kind: "streak",
            titleKey: "notif.streakTitle",
            titleVars: { count: after },
            bodyKey: "notif.streakBody",
            emoji: "🔥",
          });
        }
        const justFinished = nextBooks.find(
          (b) => b.status === "finished" && cache.books.find((x) => x.id === b.id)?.status !== "finished",
        );
        if (justFinished) {
          void notify({
            kind: "achievement",
            titleKey: "notif.milestoneTitle",
            bodyKey: "notif.milestoneBody",
            bodyVars: { title: justFinished.title },
            emoji: "🏅",
          });
        }
        if (cloud) {
          try {
            const saved = await db.insertSession(input);
            setCache((prev) => {
              const merged = {
                ...prev,
                sessions: prev.sessions.map((s) => (s.id === optimistic.id ? saved : s)),
              };
              AsyncStorage.setItem(KEY, JSON.stringify(merged)).catch(() => undefined);
              return merged;
            });
            if (input.book_id && input.pages_read > 0) {
              const book = nextBooks.find((b) => b.id === input.book_id);
              if (book && !book.id.startsWith("local-")) {
                await db.patchBook(book.id, {
                  current_page: book.current_page,
                  status: book.status,
                });
              }
            }
          } catch (e) {
            setError((e as Error).message);
          }
        }
      },

      deleteSession: async (id) => {
        local({ sessions: cache.sessions.filter((s) => s.id !== id) });
        if (cloud && !id.startsWith("local-")) {
          try {
            await db.removeSession(id);
          } catch (e) {
            setError((e as Error).message);
          }
        }
      },

      addGoal: async (g) => {
        const optimistic: Goal = { id: `local-${uid()}`, ...g, created_at: new Date().toISOString() };
        local({ goals: [optimistic, ...cache.goals] });
        if (cloud) {
          try {
            const saved = await db.insertGoal(g);
            setCache((prev) => {
              const merged = { ...prev, goals: prev.goals.map((x) => (x.id === optimistic.id ? saved : x)) };
              AsyncStorage.setItem(KEY, JSON.stringify(merged)).catch(() => undefined);
              return merged;
            });
          } catch (e) {
            setError((e as Error).message);
          }
        }
      },

      deleteGoal: async (id) => {
        local({ goals: cache.goals.filter((g) => g.id !== id) });
        if (cloud && !id.startsWith("local-")) {
          try {
            await db.removeGoal(id);
          } catch (e) {
            setError((e as Error).message);
          }
        }
      },

      addQuote: async (q) => {
        const optimistic: Quote = {
          id: `local-${uid()}`,
          book_id: q.book_id ?? null,
          text: q.text,
          page: q.page ?? null,
          created_at: new Date().toISOString(),
        };
        local({ quotes: [optimistic, ...cache.quotes] });
        if (cloud) {
          try {
            const saved = await db.insertQuote(q);
            setCache((prev) => {
              const merged = { ...prev, quotes: prev.quotes.map((x) => (x.id === optimistic.id ? saved : x)) };
              AsyncStorage.setItem(KEY, JSON.stringify(merged)).catch(() => undefined);
              return merged;
            });
          } catch (e) {
            setError((e as Error).message);
          }
        }
      },

      deleteQuote: async (id) => {
        local({ quotes: cache.quotes.filter((q) => q.id !== id) });
        if (cloud && !id.startsWith("local-")) {
          try {
            await db.removeQuote(id);
          } catch (e) {
            setError((e as Error).message);
          }
        }
      },

      saveWeeklyReview: async (r) => {
        const optimistic: WeeklyReview = { id: `local-${uid()}`, ...r, created_at: new Date().toISOString() };
        const others = cache.weeklyReviews.filter((w) => w.week_start !== r.week_start);
        local({ weeklyReviews: [optimistic, ...others] });
        if (cloud) {
          try {
            const saved = await db.upsertWeeklyReview(r);
            setCache((prev) => {
              const merged = {
                ...prev,
                weeklyReviews: [saved, ...prev.weeklyReviews.filter((w) => w.week_start !== r.week_start)],
              };
              AsyncStorage.setItem(KEY, JSON.stringify(merged)).catch(() => undefined);
              return merged;
            });
          } catch (e) {
            setError((e as Error).message);
          }
        }
      },

      saveDailyEntry: async (input) => {
        const now = new Date().toISOString();
        const optimistic: DailyEntry = {
          id: `local-${uid()}`,
          book_id: input.book_id ?? null,
          entry_date: input.entry_date,
          pages_from: input.pages_from ?? null,
          pages_to: input.pages_to ?? null,
          summary: input.summary,
          essence: input.essence ?? null,
          created_at: now,
          updated_at: now,
        };
        // One entry per day: replace any existing row for that date.
        const others = cache.dailyEntries.filter((e) => e.entry_date !== input.entry_date);
        local({ dailyEntries: [optimistic, ...others] });
        if (cloud) {
          try {
            const saved = await db.upsertDailyEntry(input);
            setCache((prev) => {
              const merged = {
                ...prev,
                dailyEntries: [
                  saved,
                  ...prev.dailyEntries.filter((e) => e.entry_date !== input.entry_date),
                ],
              };
              AsyncStorage.setItem(KEY, JSON.stringify(merged)).catch(() => undefined);
              return merged;
            });
          } catch (e) {
            setError((e as Error).message);
          }
        }
      },

      deleteDailyEntry: async (id) => {
        local({ dailyEntries: cache.dailyEntries.filter((e) => e.id !== id) });
        if (cloud && !id.startsWith("local-")) {
          try {
            await db.removeDailyEntry(id);
          } catch (e) {
            setError((e as Error).message);
          }
        }
      },

      sync,
      clearAll: async () => {
        setCache(EMPTY);
        await AsyncStorage.removeItem(KEY);
      },
    };
  }, [cache, cloud, error, notify, persist, ready, restDays, reviewDays, sync, syncing]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used inside DataProvider");
  return ctx;
}
