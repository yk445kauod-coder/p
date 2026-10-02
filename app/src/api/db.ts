/**
 * Typed data access for TraceBook.
 *
 * Every call goes through the Supabase client, so row-level security guarantees a
 * user can only ever touch their own rows. The app mirrors results into local
 * state (see `store/data.tsx`) so the UI stays instant and readable offline.
 */
import { supabase } from "../lib/supabase";

export type BookStatus = "reading" | "finished" | "paused" | "wishlist";
export type GoalKind = "minutes" | "pages" | "books";
export type GoalPeriod = "daily" | "weekly" | "yearly";

export interface Profile {
  id: string;
  display_name: string | null;
  daily_goal_minutes: number;
  theme_mode: string;
  reduce_motion: boolean;
  lang: string;
  onboarded: boolean;
  /** Weekday numbers (0=Sunday … 6=Saturday) the reader plans to rest. */
  rest_days: number[];
  /** The drink that signals "reading time" — part of the evening ritual. */
  ritual_drink: string;
  /** Pages in the book currently being finished, used for the shelf progress ring. */
  shelf_goal_pages: number;
  /** Pages the reader wants to get through each reading day. */
  daily_pages_goal: number;
  /** Weekday numbers reserved for reviewing what was read. */
  review_days: number[];
  /** Whether the in-app reading alarm is armed. */
  alarm_enabled: boolean;
  /** Local `HH:MM` the alarm rings. */
  alarm_time: string;
  /** Preferred reading time, `HH:MM`. */
  reading_time: string;
  /** Master switch for reminders and notifications. */
  notify_enabled: boolean;
  /** Whether the daily reading reminder is scheduled. */
  notify_reminder: boolean;
  /** Local `HH:MM` the daily reminder fires. */
  notify_reminder_time: string;
  /** Subscription tier: `free` (default) or `pro`. */
  plan: string;
}

export interface Book {
  id: string;
  title: string;
  author: string | null;
  total_pages: number;
  current_page: number;
  status: BookStatus;
  cover_color: string | null;
  category: string | null;
  /** Sits on the "read next" list rather than the active shelf. */
  is_future: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReadingSession {
  id: string;
  book_id: string | null;
  started_at: string;
  ended_at: string | null;
  minutes: number;
  pages_read: number;
  mood: string | null;
  note: string | null;
  /** Did the reader apply yesterday's takeaway today? */
  applied_yesterday: boolean | null;
  /** One-line summary of what today's reading was about. */
  summary: string | null;
  created_at: string;
}

/**
 * One row per reader per day: the summary written from that day's pages, plus
 * the running "essence" of the book being read.
 */
export interface DailyEntry {
  id: string;
  book_id: string | null;
  /** ISO day key (`YYYY-MM-DD`). */
  entry_date: string;
  pages_from: number | null;
  pages_to: number | null;
  summary: string;
  essence: string | null;
  created_at: string;
  updated_at: string;
}

export interface WeeklyReview {
  id: string;
  week_start: string;
  week_end: string;
  good: string;
  to_improve: string;
  created_at: string;
}

export interface Goal {
  id: string;
  kind: GoalKind;
  target: number;
  period: GoalPeriod;
  created_at: string;
}

export interface Quote {
  id: string;
  book_id: string | null;
  text: string;
  page: number | null;
  created_at: string;
}

export interface AgentMessage {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  tool_name: string | null;
  tool_args: Record<string, unknown> | null;
  tool_result: unknown;
  created_at: string;
}

export interface AgentToolCall {
  name: string;
  args: Record<string, unknown>;
  result?: unknown;
}

export type NotificationKind = "reminder" | "streak" | "achievement" | "system" | "ai";

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  emoji: string | null;
  data: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

export interface PushSubscriptionRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
  created_at: string;
}

function db() {
  if (!supabase) throw new Error("supabase_not_configured");
  return supabase;
}

export async function fetchBooks(): Promise<Book[]> {
  const { data, error } = await db()
    .from("books")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Book[];
}

export async function fetchFutureBooks(): Promise<Book[]> {
  const { data, error } = await db()
    .from("books")
    .select("*")
    .eq("is_future", true)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Book[];
}

export async function fetchWeeklyReviews(): Promise<WeeklyReview[]> {
  const { data, error } = await db()
    .from("weekly_reviews")
    .select("*")
    .order("week_start", { ascending: false })
    .limit(52);
  if (error) throw error;
  return (data ?? []) as WeeklyReview[];
}

export async function fetchDailyEntries(limit = 400): Promise<DailyEntry[]> {
  const { data, error } = await db()
    .from("daily_entries")
    .select("*")
    .order("entry_date", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as DailyEntry[];
}

/**
 * Saves the day's reflection. A reader gets one entry per day, so this is an
 * upsert keyed on (user, date) rather than a fresh insert.
 */
export async function upsertDailyEntry(input: {
  entry_date: string;
  book_id?: string | null;
  pages_from?: number | null;
  pages_to?: number | null;
  summary: string;
  essence?: string | null;
}): Promise<DailyEntry> {
  const { data: user } = await db().auth.getUser();
  if (!user.user) throw new Error("unauthorized");
  const { data, error } = await db()
    .from("daily_entries")
    .upsert(
      { ...input, user_id: user.user.id, updated_at: new Date().toISOString() },
      { onConflict: "user_id,entry_date" },
    )
    .select()
    .single();
  if (error) throw error;
  return data as DailyEntry;
}

export async function removeDailyEntry(id: string): Promise<void> {
  const { error } = await db().from("daily_entries").delete().eq("id", id);
  if (error) throw error;
}

export async function upsertWeeklyReview(input: {
  week_start: string;
  week_end: string;
  good: string;
  to_improve: string;
}): Promise<WeeklyReview> {
  const { data: user } = await db().auth.getUser();
  if (!user.user) throw new Error("unauthorized");
  const { data, error } = await db()
    .from("weekly_reviews")
    .upsert({ ...input, user_id: user.user.id }, { onConflict: "user_id,week_start" })
    .select()
    .single();
  if (error) throw error;
  return data as WeeklyReview;
}

export async function fetchProfile(): Promise<Profile | null> {
  const { data: user } = await db().auth.getUser();
  if (!user.user) return null;
  const { data, error } = await db().from("profiles").select("*").eq("id", user.user.id).maybeSingle();
  if (error) throw error;
  return (data as Profile) ?? null;
}

export async function fetchSessions(limit = 500): Promise<ReadingSession[]> {
  const { data, error } = await db()
    .from("reading_sessions")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as ReadingSession[];
}

export async function fetchGoals(): Promise<Goal[]> {
  const { data, error } = await db().from("goals").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Goal[];
}

export async function fetchQuotes(): Promise<Quote[]> {
  const { data, error } = await db().from("quotes").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Quote[];
}

export async function insertBook(input: {
  title: string;
  author?: string | null;
  total_pages?: number;
  current_page?: number;
  status?: BookStatus;
  cover_color?: string | null;
  category?: string | null;
  is_future?: boolean;
}): Promise<Book> {
  const { data: user } = await db().auth.getUser();
  if (!user.user) throw new Error("unauthorized");
  const { data, error } = await db()
    .from("books")
    .insert({ ...input, user_id: user.user.id })
    .select()
    .single();
  if (error) throw error;
  return data as Book;
}

export async function patchBook(id: string, patch: Partial<Book>): Promise<Book> {
  const { data, error } = await db().from("books").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data as Book;
}

export async function removeBook(id: string): Promise<void> {
  const { error } = await db().from("books").delete().eq("id", id);
  if (error) throw error;
}

export async function insertSession(input: {
  book_id?: string | null;
  started_at?: string;
  ended_at?: string | null;
  minutes: number;
  pages_read: number;
  mood?: string | null;
  note?: string | null;
  applied_yesterday?: boolean | null;
  summary?: string | null;
}): Promise<ReadingSession> {
  const { data: user } = await db().auth.getUser();
  if (!user.user) throw new Error("unauthorized");
  const { data, error } = await db()
    .from("reading_sessions")
    .insert({ ...input, user_id: user.user.id })
    .select()
    .single();
  if (error) throw error;
  return data as ReadingSession;
}

export async function removeSession(id: string): Promise<void> {
  const { error } = await db().from("reading_sessions").delete().eq("id", id);
  if (error) throw error;
}

export async function insertGoal(input: {
  kind: GoalKind;
  target: number;
  period: GoalPeriod;
}): Promise<Goal> {
  const { data: user } = await db().auth.getUser();
  if (!user.user) throw new Error("unauthorized");
  const { data, error } = await db()
    .from("goals")
    .insert({ ...input, user_id: user.user.id })
    .select()
    .single();
  if (error) throw error;
  return data as Goal;
}

export async function removeGoal(id: string): Promise<void> {
  const { error } = await db().from("goals").delete().eq("id", id);
  if (error) throw error;
}

export async function insertQuote(input: {
  book_id?: string | null;
  text: string;
  page?: number | null;
}): Promise<Quote> {
  const { data: user } = await db().auth.getUser();
  if (!user.user) throw new Error("unauthorized");
  const { data, error } = await db()
    .from("quotes")
    .insert({ ...input, user_id: user.user.id })
    .select()
    .single();
  if (error) throw error;
  return data as Quote;
}

export async function removeQuote(id: string): Promise<void> {
  const { error } = await db().from("quotes").delete().eq("id", id);
  if (error) throw error;
}

export async function updateProfile(patch: Partial<Profile>): Promise<void> {
  const { data: user } = await db().auth.getUser();
  if (!user.user) return;
  const { error } = await db().from("profiles").update(patch).eq("id", user.user.id);
  if (error) throw error;
}

export async function trackEvent(name: string, props: Record<string, unknown> = {}): Promise<void> {
  if (!supabase) return;
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;
    await supabase.from("analytics_events").insert({ user_id: user.user.id, name, props });
  } catch {
    /* analytics must never break the app */
  }
}

/** Loads persisted agent history for the signed-in user (most recent thread). */
export async function fetchAgentHistory(): Promise<AgentMessage[]> {
  const { data: threads, error: te } = await db()
    .from("agent_threads")
    .select("id")
    .order("updated_at", { ascending: false })
    .limit(1);
  if (te) throw te;
  const threadId = threads?.[0]?.id;
  if (!threadId) return [];
  const { data, error } = await db()
    .from("agent_messages")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as AgentMessage[];
}

export async function saveAgentMessage(input: {
  role: "user" | "assistant";
  content: string;
}): Promise<void> {
  const client = supabase;
  if (!client) return;
  try {
    const { data: user } = await client.auth.getUser();
    if (!user.user) return;
    const uid = user.user.id;
    const { data: threads } = await client
      .from("agent_threads")
      .select("id")
      .order("updated_at", { ascending: false })
      .limit(1);
    let threadId = threads?.[0]?.id as string | undefined;
    if (!threadId) {
      const { data: created } = await client
        .from("agent_threads")
        .insert({ user_id: uid, title: "Reading coach" })
        .select("id")
        .single();
      threadId = created?.id as string | undefined;
    }
    if (!threadId) return;
    await client.from("agent_messages").insert({ thread_id: threadId, user_id: uid, ...input });
    await client.from("agent_threads").update({ updated_at: new Date().toISOString() }).eq("id", threadId);
  } catch {
    /* history persistence is best-effort */
  }
}

/* ── Notifications ─────────────────────────────────────────────────────────── */

export async function fetchNotifications(limit = 100): Promise<AppNotification[]> {
  const { data, error } = await db()
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as AppNotification[];
}

export async function insertNotification(input: {
  kind: NotificationKind;
  title: string;
  body?: string;
  emoji?: string | null;
  data?: Record<string, unknown>;
}): Promise<AppNotification | null> {
  const { data: user } = await db().auth.getUser();
  if (!user.user) return null;
  const { data, error } = await db()
    .from("notifications")
    .insert({
      user_id: user.user.id,
      kind: input.kind,
      title: input.title,
      body: input.body ?? "",
      emoji: input.emoji ?? null,
      data: input.data ?? {},
    })
    .select()
    .single();
  if (error) throw error;
  return data as AppNotification;
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await db().from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}

export async function markAllNotificationsRead(): Promise<void> {
  const { data: user } = await db().auth.getUser();
  if (!user.user) return;
  const { error } = await db()
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.user.id)
    .is("read_at", null);
  if (error) throw error;
}

export async function removeNotification(id: string): Promise<void> {
  const { error } = await db().from("notifications").delete().eq("id", id);
  if (error) throw error;
}

export async function clearNotifications(): Promise<void> {
  const { data: user } = await db().auth.getUser();
  if (!user.user) return;
  const { error } = await db().from("notifications").delete().eq("user_id", user.user.id);
  if (error) throw error;
}

/* ── Web Push subscriptions ────────────────────────────────────────────────── */

export async function savePushSubscription(sub: {
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent?: string | null;
}): Promise<void> {
  const { data: user } = await db().auth.getUser();
  if (!user.user) return;
  const { error } = await db()
    .from("push_subscriptions")
    .upsert(
      {
        user_id: user.user.id,
        endpoint: sub.endpoint,
        p256dh: sub.p256dh,
        auth: sub.auth,
        user_agent: sub.user_agent ?? null,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "endpoint" },
    );
  if (error) throw error;
}

export async function deletePushSubscription(endpoint: string): Promise<void> {
  const { error } = await db().from("push_subscriptions").delete().eq("endpoint", endpoint);
  if (error) throw error;
}

export async function hasPushSubscription(endpoint: string): Promise<boolean> {
  const { data, error } = await db()
    .from("push_subscriptions")
    .select("id")
    .eq("endpoint", endpoint)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}
