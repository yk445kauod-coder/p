/**
 * Reading maths — the pure, testable core of TraceBook.
 *
 * Streaks honour planned rest and review days, so a scheduled day off never
 * breaks a run; the plan maths projects a finish date while skipping those same
 * days. Nothing here touches React or storage, which keeps it cheap to test.
 */
import type { Book, DayStat, ReadingSession, Stats } from "@/data/types";

const DAY_MS = 86_400_000;

/** ISO day key (`YYYY-MM-DD`) in UTC, matching how sessions are bucketed. */
export function toDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export interface StreakInput {
  /** Distinct ISO day keys that have at least one session. */
  activeDays: Set<string>;
  /** Weekday numbers (0=Sunday … 6=Saturday) the reader plans to rest. */
  restDays: number[];
  /** Weekday numbers reserved for reviewing — also break-proof. */
  reviewDays?: number[];
  today?: Date;
}

export interface StreakResult {
  current: number;
  longest: number;
  missed: number;
}

/**
 * Computes the current/longest streak and missed days.
 *
 * A rest or review day is skipped without breaking the run; a missed day is one
 * with no reading that was not planned. Today never counts as missed.
 */
export function computeStreak({
  activeDays,
  restDays,
  reviewDays = [],
  today = new Date(),
}: StreakInput): StreakResult {
  const rest = new Set([...restDays, ...reviewDays]);
  const todayKey = toDayKey(today);

  const sorted = Array.from(activeDays).sort();
  if (!sorted.length) return { current: 0, longest: 0, missed: 0 };

  const first = new Date(`${sorted[0]}T00:00:00Z`);

  // Longest run: walk every calendar day from the first entry to today.
  let longest = 0;
  let run = 0;
  const cursor = new Date(first);
  const end = new Date(`${todayKey}T00:00:00Z`);
  while (cursor <= end) {
    const key = toDayKey(cursor);
    if (activeDays.has(key) || rest.has(cursor.getUTCDay())) {
      run++;
      longest = Math.max(longest, run);
    } else {
      run = 0;
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  // Missed days: unplanned gaps strictly between the first entry and today.
  let missed = 0;
  const scan = new Date(first);
  while (scan < end) {
    const key = toDayKey(scan);
    if (!activeDays.has(key) && !rest.has(scan.getUTCDay())) missed++;
    scan.setUTCDate(scan.getUTCDate() + 1);
  }

  // Current run: walk backwards from today through rest days.
  let current = 0;
  const back = new Date(`${todayKey}T00:00:00Z`);
  if (!activeDays.has(todayKey) && !rest.has(back.getUTCDay())) back.setUTCDate(back.getUTCDate() - 1);
  for (;;) {
    const key = toDayKey(back);
    if (activeDays.has(key)) current++;
    else if (rest.has(back.getUTCDay())) {
      back.setUTCDate(back.getUTCDate() - 1);
      continue;
    } else break;
    if (back < first) break;
    back.setUTCDate(back.getUTCDate() - 1);
  }

  return { current, longest: Math.max(longest, current), missed };
}

/** Aggregates sessions and books into everything the dashboard renders. */
export function computeStats(
  sessions: ReadingSession[],
  books: Book[],
  restDays: number[],
  reviewDays: number[] = [],
  today = new Date(),
): Stats {
  const byDay = new Map<string, { minutes: number; pages: number }>();
  let totalMinutes = 0;
  let totalPages = 0;

  for (const s of sessions) {
    const cur = byDay.get(s.day) ?? { minutes: 0, pages: 0 };
    cur.minutes += s.minutes;
    cur.pages += s.pagesRead;
    byDay.set(s.day, cur);
    totalMinutes += s.minutes;
    totalPages += s.pagesRead;
  }

  const streak = computeStreak({ activeDays: new Set(byDay.keys()), restDays, reviewDays, today });

  const todayKey = toDayKey(today);
  const last30: DayStat[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    const k = toDayKey(d);
    const v = byDay.get(k) ?? { minutes: 0, pages: 0 };
    last30.push({ date: k, minutes: v.minutes, pages: v.pages });
  }

  const activeDaysCount = [...byDay.values()].filter((v) => v.minutes > 0).length;
  const todayStat = byDay.get(todayKey) ?? { minutes: 0, pages: 0 };

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
  };
}

export interface PlanInput {
  totalPages: number;
  currentPage: number;
  dailyPagesGoal: number;
  offDays: number[];
  today?: Date;
}

export interface Plan {
  pagesLeft: number;
  percentLeft: number;
  percentDone: number;
  readingDaysNeeded: number;
  calendarDaysLeft: number;
  finishDate: string | null;
  readingDaysPerWeek: number;
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

/** Whole days between the journey start and today, inclusive of the first day. */
export function daysSince(startKey: string, today = new Date()): number {
  const start = new Date(`${startKey}T00:00:00Z`).getTime();
  const end = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  // A future start date means the journey has not begun: report 0, not -n.
  if (end < start) return 0;
  return Math.floor((end - start) / DAY_MS) + 1;
}

export interface BadgeDef {
  days: number;
  id: string;
  icon: string;
  en: { title: string; desc: string };
  ar: { title: string; desc: string };
}

export const BADGES: BadgeDef[] = [
  { days: 3, id: "start", icon: "🔥", en: { title: "The Start", desc: "You broke the inertia" }, ar: { title: "البداية", desc: "كسرت حاجز الكسل" } },
  { days: 7, id: "committed", icon: "💪", en: { title: "Committed", desc: "A full week of reading" }, ar: { title: "الملتزم", desc: "أسبوع كامل بتقرأ" } },
  { days: 15, id: "reader", icon: "📚", en: { title: "Reader", desc: "Half the month, done" }, ar: { title: "القارئ", desc: "نص الشهر عديته" } },
  { days: 30, id: "champion", icon: "👑", en: { title: "Champion Mindset", desc: "A full month — legendary" }, ar: { title: "عقلية البطل", desc: "شهر كامل، أنت أسطورة" } },
  { days: 60, id: "warrior", icon: "🏹", en: { title: "Warrior", desc: "Two months of iron discipline" }, ar: { title: "المحارب", desc: "شهرين من الالتزام الحديدي" } },
  { days: 90, id: "sage", icon: "🧠", en: { title: "Sage", desc: "Three months — you think differently now" }, ar: { title: "الحكيم", desc: "3 شهور، بقيت بتفكر بشكل تاني" } },
  { days: 180, id: "legend", icon: "🌟", en: { title: "Legend", desc: "Half a year. Few get here" }, ar: { title: "الأسطورة", desc: "نص سنة! ناس قليلة توصل هنا" } },
  { days: 365, id: "eternal", icon: "♾️", en: { title: "Eternal", desc: "A whole year — you are someone else now" }, ar: { title: "الخالد", desc: "سنة كاملة! انت بقيت شخص تاني خالص" } },
];

export function unlockedBadges(streak: number): BadgeDef[] {
  return BADGES.filter((b) => streak >= b.days);
}

export function nextBadge(streak: number): BadgeDef | null {
  return BADGES.find((b) => streak < b.days) ?? null;
}

/** Progress toward the next badge, anchored to the previous milestone. */
export function badgeProgress(streak: number, nextDays: number, prevDays: number): number {
  if (nextDays <= prevDays) return 0;
  return Math.max(0, Math.min(1, (streak - prevDays) / (nextDays - prevDays)));
}

export interface CategoryDef {
  id: string;
  icon: string;
  en: string;
  ar: string;
  tone: "accent" | "primary" | "success" | "danger" | "warning" | "neutral";
}

export const CATEGORIES: CategoryDef[] = [
  { id: "history", icon: "📜", en: "History", ar: "تاريخ", tone: "warning" },
  { id: "politics", icon: "🏛️", en: "Politics", ar: "سياسة", tone: "danger" },
  { id: "sports", icon: "⚽", en: "Sports", ar: "رياضة", tone: "success" },
  { id: "english", icon: "🔤", en: "English", ar: "إنجليزي", tone: "primary" },
  { id: "self", icon: "🌱", en: "Self-growth", ar: "تطوير ذات", tone: "accent" },
  { id: "fiction", icon: "📖", en: "Fiction", ar: "رواية", tone: "neutral" },
  { id: "science", icon: "🔬", en: "Science", ar: "علوم", tone: "primary" },
  { id: "religion", icon: "🕌", en: "Religion", ar: "دين", tone: "success" },
];

export function categoryLabel(id: string | null | undefined, lang: "en" | "ar"): CategoryDef | null {
  if (!id) return null;
  return CATEGORIES.find((c) => c.id === id) ?? null;
}
