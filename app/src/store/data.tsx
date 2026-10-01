import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../api/client";
import { useAuth } from "./auth";

export type BookStatus = "reading" | "finished" | "paused" | "wishlist";

export interface Book {
  id: string;
  title: string;
  author?: string | null;
  totalPages: number;
  currentPage: number;
  status: BookStatus;
  coverColor?: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface ReadingSession {
  id: string;
  bookId?: string | null;
  startedAt: number;
  endedAt?: number | null;
  minutes: number;
  pagesRead: number;
  note?: string | null;
}

export interface Goal {
  id: string;
  kind: "minutes" | "pages" | "books";
  target: number;
  period: "daily" | "weekly" | "yearly";
  createdAt: number;
}

export interface Quote {
  id: string;
  bookId?: string | null;
  text: string;
  page?: number | null;
  createdAt: number;
}

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
  booksFinished: number;
  last30: DayStat[];
  todayMinutes: number;
  todayPages: number;
  weekMinutes: number;
}

interface DataValue {
  ready: boolean;
  syncing: boolean;
  lastSync: number | null;
  books: Book[];
  sessions: ReadingSession[];
  goals: Goal[];
  quotes: Quote[];
  stats: Stats;
  addBook: (b: Omit<Book, "id" | "createdAt" | "updatedAt">) => Promise<Book>;
  updateBook: (id: string, patch: Partial<Book>) => Promise<void>;
  deleteBook: (id: string) => Promise<void>;
  logSession: (s: Omit<ReadingSession, "id">) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  addGoal: (g: Omit<Goal, "id" | "createdAt">) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  addQuote: (q: Omit<Quote, "id" | "createdAt">) => Promise<void>;
  deleteQuote: (id: string) => Promise<void>;
  sync: () => Promise<void>;
  clearAll: () => Promise<void>;
}

const KEY = "tracebook.data.v1";
const DataContext = createContext<DataValue | null>(null);

const uid = () =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;

const dayKey = (ts: number) => new Date(ts).toISOString().slice(0, 10);

function computeStats(sessions: ReadingSession[], books: Book[]): Stats {
  const byDay = new Map<string, { minutes: number; pages: number }>();
  let totalMinutes = 0;
  let totalPages = 0;
  for (const s of sessions) {
    const k = dayKey(s.startedAt);
    const cur = byDay.get(k) ?? { minutes: 0, pages: 0 };
    cur.minutes += s.minutes;
    cur.pages += s.pagesRead;
    byDay.set(k, cur);
    totalMinutes += s.minutes;
    totalPages += s.pagesRead;
  }

  const today = dayKey(Date.now());
  const cursor = new Date(today + "T00:00:00Z");
  if (!byDay.has(today)) cursor.setUTCDate(cursor.getUTCDate() - 1);
  let streak = 0;
  for (;;) {
    if (byDay.has(dayKey(cursor.getTime()))) {
      streak++;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    } else break;
  }

  // Best streak across all recorded days.
  const days = [...byDay.keys()].sort();
  let best = 0;
  let run = 0;
  let prev: number | null = null;
  for (const d of days) {
    const t = new Date(d + "T00:00:00Z").getTime();
    if (prev !== null && t - prev === 86400000) run++;
    else run = 1;
    best = Math.max(best, run);
    prev = t;
  }

  const last30: DayStat[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    const k = dayKey(d.getTime());
    const v = byDay.get(k) ?? { minutes: 0, pages: 0 };
    last30.push({ date: k, minutes: v.minutes, pages: v.pages });
  }

  const weekMinutes = last30.slice(-7).reduce((a, d) => a + d.minutes, 0);
  const todayStat = byDay.get(today) ?? { minutes: 0, pages: 0 };

  return {
    totalMinutes,
    totalPages,
    totalSessions: sessions.length,
    streak,
    bestStreak: Math.max(best, streak),
    booksFinished: books.filter((b) => b.status === "finished").length,
    last30,
    todayMinutes: todayStat.minutes,
    todayPages: todayStat.pages,
    weekMinutes,
  };
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user, offline } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [sessions, setSessions] = useState<ReadingSession[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [ready, setReady] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<number | null>(null);

  const persist = useCallback((patch: Partial<Record<string, unknown>>) => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        const next = { ...(raw ? JSON.parse(raw) : {}), ...patch };
        return AsyncStorage.setItem(KEY, JSON.stringify(next));
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (!raw) return;
        const v = JSON.parse(raw);
        setBooks(v.books ?? []);
        setSessions(v.sessions ?? []);
        setGoals(v.goals ?? []);
        setQuotes(v.quotes ?? []);
        setLastSync(v.lastSync ?? null);
      })
      .catch(() => undefined)
      .finally(() => setReady(true));
  }, []);

  const sync = useCallback(async () => {
    if (!user || offline) return;
    setSyncing(true);
    try {
      const [b, s, g, q] = await Promise.all([
        api.listBooks(),
        api.listSessions(),
        api.listGoals(),
        api.listQuotes(),
      ]);
      const remoteBooks: Book[] = b.books;
      // First sync on a fresh account: push whatever we already have locally.
      if (remoteBooks.length === 0 && books.length > 0) {
        for (const book of books) {
          await api.createBook({
            title: book.title,
            author: book.author,
            totalPages: book.totalPages,
            currentPage: book.currentPage,
            status: book.status,
            coverColor: book.coverColor,
          });
        }
        for (const sess of sessions) {
          await api.createSession({
            bookId: sess.bookId,
            startedAt: sess.startedAt,
            endedAt: sess.endedAt,
            minutes: sess.minutes,
            pagesRead: sess.pagesRead,
            note: sess.note,
          });
        }
        for (const goal of goals) {
          await api.createGoal({ kind: goal.kind, target: goal.target, period: goal.period });
        }
        for (const quote of quotes) {
          await api.createQuote({ bookId: quote.bookId, text: quote.text, page: quote.page });
        }
      } else {
        setBooks(remoteBooks);
        setSessions(s.sessions);
        setGoals(g.goals);
        setQuotes(q.quotes);
        persist({ books: remoteBooks, sessions: s.sessions, goals: g.goals, quotes: q.quotes });
      }
      const ts = Date.now();
      setLastSync(ts);
      persist({ lastSync: ts });
    } catch {
      /* stay offline-first on failure */
    } finally {
      setSyncing(false);
    }
  }, [user, offline, books, sessions, goals, quotes, persist]);

  useEffect(() => {
    if (ready && user && !offline) sync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, user, offline]);

  const value = useMemo<DataValue>(() => {
    const mutateBooks = (next: Book[]) => {
      setBooks(next);
      persist({ books: next });
    };
    const mutateSessions = (next: ReadingSession[]) => {
      setSessions(next);
      persist({ sessions: next });
    };

    return {
      ready,
      syncing,
      lastSync,
      books,
      sessions,
      goals,
      quotes,
      stats: computeStats(sessions, books),
      addBook: async (b) => {
        const now = Date.now();
        const local: Book = { ...b, id: uid(), createdAt: now, updatedAt: now };
        mutateBooks([local, ...books]);
        if (user && !offline) {
          try {
            const { book } = await api.createBook(b);
            mutateBooks([book, ...books.filter((x) => x.id !== local.id)]);
            return book;
          } catch {
            /* keep local copy */
          }
        }
        return local;
      },
      updateBook: async (id, patch) => {
        const next = books.map((b) =>
          b.id === id ? { ...b, ...patch, updatedAt: Date.now() } : b,
        );
        mutateBooks(next);
        if (user && !offline && !id.startsWith("local-")) {
          try {
            await api.updateBook(id, patch);
          } catch {
            /* keep local */
          }
        }
      },
      deleteBook: async (id) => {
        mutateBooks(books.filter((b) => b.id !== id));
        if (user && !offline) {
          try {
            await api.deleteBook(id);
          } catch {
            /* keep local */
          }
        }
      },
      logSession: async (s) => {
        const local: ReadingSession = { ...s, id: uid() };
        mutateSessions([local, ...sessions]);
        if (s.bookId) {
          const book = books.find((b) => b.id === s.bookId);
          if (book) {
            const reachedEnd =
              book.totalPages > 0 && book.currentPage + s.pagesRead >= book.totalPages;
            const next = books.map((b) =>
              b.id === s.bookId
                ? {
                    ...b,
                    currentPage: b.currentPage + s.pagesRead,
                    status: (reachedEnd ? "finished" : b.status) as BookStatus,
                    updatedAt: Date.now(),
                  }
                : b,
            );
            mutateBooks(next);
          }
        }
        if (user && !offline) {
          try {
            await api.createSession(s);
          } catch {
            /* keep local */
          }
        }
      },
      deleteSession: async (id) => {
        mutateSessions(sessions.filter((x) => x.id !== id));
        if (user && !offline) {
          try {
            await api.deleteSession(id);
          } catch {
            /* keep local */
          }
        }
      },
      addGoal: async (g) => {
        const local: Goal = { ...g, id: uid(), createdAt: Date.now() };
        const next = [local, ...goals];
        setGoals(next);
        persist({ goals: next });
        if (user && !offline) {
          try {
            await api.createGoal(g);
          } catch {
            /* keep local */
          }
        }
      },
      deleteGoal: async (id) => {
        const next = goals.filter((g) => g.id !== id);
        setGoals(next);
        persist({ goals: next });
        if (user && !offline) {
          try {
            await api.deleteGoal(id);
          } catch {
            /* keep local */
          }
        }
      },
      addQuote: async (q) => {
        const local: Quote = { ...q, id: uid(), createdAt: Date.now() };
        const next = [local, ...quotes];
        setQuotes(next);
        persist({ quotes: next });
        if (user && !offline) {
          try {
            await api.createQuote(q);
          } catch {
            /* keep local */
          }
        }
      },
      deleteQuote: async (id) => {
        const next = quotes.filter((q) => q.id !== id);
        setQuotes(next);
        persist({ quotes: next });
        if (user && !offline) {
          try {
            await api.deleteQuote(id);
          } catch {
            /* keep local */
          }
        }
      },
      sync,
      clearAll: async () => {
        setBooks([]);
        setSessions([]);
        setGoals([]);
        setQuotes([]);
        await AsyncStorage.removeItem(KEY);
      },
    };
  }, [books, sessions, goals, quotes, ready, syncing, lastSync, user, offline, sync, persist]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used inside DataProvider");
  return ctx;
}
