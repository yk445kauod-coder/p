/**
 * Reading achievements, categories, and the streak maths that powers them.
 *
 * Ported from the original "10 Warqat" tracker: streaks honour rest days, so a
 * planned day off never breaks a run, and long stretches of high follow-through
 * are recognised as "prime" periods.
 */
import type { Lang } from "../i18n/translations";

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
  { days: 120, id: "leader", icon: "⚔️", en: { title: "Leader", desc: "Four months — you lead yourself" }, ar: { title: "القائد", desc: "4 شهور، انت اللي بتقود نفسك" } },
  { days: 180, id: "legend", icon: "🌟", en: { title: "Legend", desc: "Half a year. Few get here" }, ar: { title: "الأسطورة", desc: "نص سنة! ناس قليلة توصل هنا" } },
  { days: 270, id: "philosopher", icon: "🏛️", en: { title: "Philosopher", desc: "Nine months of accumulated wisdom" }, ar: { title: "الفيلسوف", desc: "9 شهور من الحكمة المتراكمة" } },
  { days: 365, id: "eternal", icon: "♾️", en: { title: "Eternal", desc: "A whole year — you are someone else now" }, ar: { title: "الخالد", desc: "سنة كاملة! انت بقيت شخص تاني خالص" } },
];

export function badgeText(b: BadgeDef, lang: Lang) {
  return lang === "ar" ? b.ar : b.en;
}

export function unlockedBadges(streak: number): BadgeDef[] {
  return BADGES.filter((b) => streak >= b.days);
}

export function nextBadge(streak: number): BadgeDef | null {
  return BADGES.find((b) => streak < b.days) ?? null;
}

export interface CategoryDef {
  id: string;
  icon: string;
  en: string;
  ar: string;
  /** Token name used for the tinted chip. */
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

export function categoryLabel(id: string | null | undefined, lang: Lang): CategoryDef | null {
  if (!id) return null;
  return CATEGORIES.find((c) => c.id === id) ?? null;
}

const DAY_MS = 86_400_000;

export function toDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export interface StreakInput {
  /** Distinct ISO day keys (`YYYY-MM-DD`) that have at least one session. */
  activeDays: Set<string>;
  /** Weekday numbers (0=Sunday … 6=Saturday) the reader plans to rest. */
  restDays: number[];
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
 * A rest day is skipped without breaking the run; a missed day is one that had no
 * reading and was not a planned rest. Today never counts as missed.
 */
export function computeStreak({ activeDays, restDays, today = new Date() }: StreakInput): StreakResult {
  const rest = new Set(restDays);
  const todayKey = toDayKey(today);

  const sorted = [...activeDays].sort();
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

  // Current run: walk backwards from today (or yesterday) through rest days.
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

export interface PrimePeriod {
  start: string;
  end: string;
  days: number;
  appliedRate: number;
}

/**
 * Finds stretches of at least a week where the reader both showed up and applied
 * what they read the next day (>=80% follow-through).
 */
export function findPrimePeriods(
  entries: { date: string; applied: boolean | null }[],
  restDays: number[],
): PrimePeriod[] {
  const rest = new Set(restDays);
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  if (sorted.length < 7) return [];

  const consecutive = (a: string, b: string) => {
    const d1 = new Date(`${a}T00:00:00Z`);
    const d2 = new Date(`${b}T00:00:00Z`);
    const diff = Math.round((d2.getTime() - d1.getTime()) / DAY_MS);
    if (diff === 1) return true;
    if (diff === 2) {
      const mid = new Date(d1);
      mid.setUTCDate(mid.getUTCDate() + 1);
      return rest.has(mid.getUTCDay());
    }
    return false;
  };

  const out: PrimePeriod[] = [];
  for (let i = 0; i < sorted.length; i++) {
    let j = i;
    while (j + 1 < sorted.length && consecutive(sorted[j].date, sorted[j + 1].date)) j++;
    const slice = sorted.slice(i, j + 1);
    if (slice.length >= 7) {
      const rate = slice.filter((s) => s.applied === true).length / slice.length;
      if (rate >= 0.8) {
        out.push({
          start: slice[0].date,
          end: slice[slice.length - 1].date,
          days: slice.length,
          appliedRate: rate,
        });
        i = j;
      }
    }
  }
  return out;
}
