"use client";
import Dexie, { type Table } from "dexie";
import { v4 as uuidv4 } from "uuid";
import type {
  Book,
  CatalogBook,
  Collection,
  DailyEntry,
  Goal,
  Highlight,
  Note,
  Preferences,
  Quote,
  ReadingSession,
  WeeklyReview,
} from "./data/types";

/**
 * TraceBook's local-first store.
 *
 * Everything a reader does is written here first, so the app is instant and
 * fully usable offline. Supabase is an optional mirror that only runs for
 * signed-in readers (see `sync.ts`). Deliberately *not* using Dexie Cloud: it
 * would be a second backend next to Supabase and conflicts with our RLS model.
 */
export class TraceBookDb extends Dexie {
  books!: Table<Book, string>;
  sessions!: Table<ReadingSession, string>;
  quotes!: Table<Quote, string>;
  goals!: Table<Goal, string>;
  dailyEntries!: Table<DailyEntry, string>;
  weeklyReviews!: Table<WeeklyReview, string>;
  preferences!: Table<Preferences, string>;
  notes!: Table<Note, string>;
  highlights!: Table<Highlight, string>;
  collections!: Table<Collection, string>;
  /** Catalogue entries the reader saved offline from the public library. */
  catalog!: Table<CatalogBook, string>;

  constructor() {
    super("tracebook", { cache: "immutable" });

    this.version(1).stores({
      books: "id, created, status, isFuture",
      sessions: "id, created, day, bookId",
      quotes: "id, created, bookId",
      goals: "id, created, period",
      dailyEntries: "id, created, day, bookId",
      weeklyReviews: "id, created, weekStart",
      preferences: "id",
    });

    // v2 adds the knowledge layer (notes + highlights) and shelves.
    // Dexie only needs the *indexed* columns declared; the rest of each row is
    // stored as-is, so existing tables keep their data untouched.
    this.version(2).stores({
      notes: "id, created, updated, bookId, *tags",
      highlights: "id, created, bookId",
      collections: "id, created, updated",
      catalog: "id, category, lang, *tags",
    });

    this.on("populate", () => {
      this.on("ready", () => populate(this));
    });
  }
}

export const db = new TraceBookDb();

export const DEFAULT_PREFERENCES: Omit<Preferences, "id" | "created"> = {
  dailyGoalMinutes: 30,
  dailyPagesGoal: 10,
  shelfGoalPages: 320,
  restDays: [],
  reviewDays: [],
  readingTime: "22:30",
  ritualDrink: "laban",
  reduceMotion: false,
  lang: "en",
  plan: "free",
  tourDone: false,
  hintsSeen: [],
  graphAnimated: true,
};

async function populate(database: TraceBookDb) {
  const count = await database.preferences.count();
  if (count === 0) {
    await database.preferences.add({
      id: "preferences",
      created: new Date(),
      ...DEFAULT_PREFERENCES,
    });
  }
}

/** The single preferences row, created on first run if it is missing. */
export async function getPreferences(): Promise<Preferences> {
  const existing = await db.preferences.get("preferences");
  if (existing) return existing;
  const fresh: Preferences = { id: "preferences", created: new Date(), ...DEFAULT_PREFERENCES };
  await db.preferences.put(fresh);
  return fresh;
}

export const newId = () => uuidv4();
