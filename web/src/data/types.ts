/**
 * TraceBook reading domain.
 *
 * The app is local-first: everything below is stored in IndexedDB (Dexie) and
 * optionally mirrored to Supabase once a reader signs in. Types are kept plain
 * and serialisable so they can round-trip through both stores unchanged.
 */

export type BookStatus = "reading" | "finished" | "wishlist" | "paused";

export interface Book {
  id: string;
  created: Date;
  title: string;
  author: string | null;
  totalPages: number;
  currentPage: number;
  status: BookStatus;
  /** Hex tint used for the spine and charts. */
  coverColor: string | null;
  category: string | null;
  /** Sits on the "read next" list rather than the active shelf. */
  isFuture: boolean;
  updated: Date;
}

export interface ReadingSession {
  id: string;
  created: Date;
  bookId: string | null;
  /** ISO day key (`YYYY-MM-DD`) the session counts toward. */
  day: string;
  minutes: number;
  pagesRead: number;
  mood: string | null;
  note: string | null;
  /** Did the reader apply what they read the previous day? */
  appliedYesterday: boolean | null;
}

export interface Quote {
  id: string;
  created: Date;
  bookId: string | null;
  text: string;
  page: number | null;
}

export type GoalKind = "minutes" | "pages" | "books";
export type GoalPeriod = "daily" | "weekly" | "yearly";

export interface Goal {
  id: string;
  created: Date;
  kind: GoalKind;
  target: number;
  period: GoalPeriod;
}

export interface DailyEntry {
  id: string;
  created: Date;
  day: string;
  bookId: string | null;
  pagesFrom: number | null;
  pagesTo: number | null;
  summary: string;
  essence: string | null;
}

export interface WeeklyReview {
  id: string;
  created: Date;
  weekStart: string;
  weekEnd: string;
  good: string;
  toImprove: string;
}

/** Reading preferences, mirroring what the Expo app kept in settings. */
export interface Preferences {
  id: string;
  created: Date;
  /** Daily reading target, in minutes. */
  dailyGoalMinutes: number;
  /** Pages the reader wants to get through on each reading day. */
  dailyPagesGoal: number;
  /** Pages in the book currently being finished. */
  shelfGoalPages: number;
  /** Weekday numbers (0=Sunday … 6=Saturday) planned as rest days. */
  restDays: number[];
  /** Weekday numbers reserved for reviewing what was read. */
  reviewDays: number[];
  /** Preferred reading time, `HH:MM`. */
  readingTime: string;
  ritualDrink: string;
  reduceMotion: boolean;
  lang: "en" | "ar";
  /** Subscription tier. `free` unless upgraded. */
  plan: "free" | "pro";
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
}

export const RITUAL_DRINKS = [
  { id: "laban", emoji: "🥛", en: "Warm milk", ar: "لبن دافي" },
  { id: "yansoon", emoji: "🍵", en: "Anise tea", ar: "ينسون" },
  { id: "shay", emoji: "☕", en: "Light tea with milk", ar: "شاي بلبن خفيف" },
  { id: "water", emoji: "💧", en: "Water", ar: "مياه" },
  { id: "none", emoji: "🫖", en: "Nothing", ar: "من غير حاجة" },
] as const;

export const BOOK_STATUSES: BookStatus[] = ["reading", "finished", "wishlist", "paused"];
