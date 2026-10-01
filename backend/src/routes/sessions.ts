import type { Env } from "../types";
import { fail, ok, readJson } from "../lib/http";
import { getUser } from "../lib/auth";
import { uuid, now } from "../lib/crypto";
import {
  listItems,
  mutateItems,
  type BookRecord,
  type SessionRecord,
} from "../lib/store";

interface SessionInput {
  bookId?: string | null;
  startedAt?: number;
  endedAt?: number;
  minutes?: number;
  pagesRead?: number;
  note?: string;
}

function dayKey(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10);
}

export async function sessionRoutes(req: Request, env: Env, parts: string[]): Promise<Response> {
  const user = await getUser(req, env);
  if (!user) return fail(401, "unauthorized", env);

  const id = parts[0];

  if (req.method === "GET" && !id) {
    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 100), 500);
    const sessions = await listItems<SessionRecord>(env, "sessions", user.id);
    sessions.sort((a, b) => b.startedAt - a.startedAt);
    return ok({ sessions: sessions.slice(0, limit) }, env);
  }

  if (req.method === "GET" && id === "stats") {
    const sessions = await listItems<SessionRecord>(env, "sessions", user.id);

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

    // Reading streak: consecutive days ending today (or yesterday) with activity.
    const today = dayKey(Date.now());
    let streak = 0;
    const cursor = new Date(today + "T00:00:00Z");
    if (!byDay.has(today)) cursor.setUTCDate(cursor.getUTCDate() - 1);
    for (;;) {
      if (byDay.has(dayKey(cursor.getTime()))) {
        streak++;
        cursor.setUTCDate(cursor.getUTCDate() - 1);
      } else break;
    }

    const last30: { date: string; minutes: number; pages: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() - i);
      const k = dayKey(d.getTime());
      const v = byDay.get(k) ?? { minutes: 0, pages: 0 };
      last30.push({ date: k, minutes: v.minutes, pages: v.pages });
    }

    const books = await listItems<BookRecord>(env, "books", user.id);
    const booksFinished = books.filter((b) => b.status === "finished").length;

    return ok(
      {
        totalMinutes,
        totalPages,
        totalSessions: sessions.length,
        streak,
        booksFinished,
        last30,
      },
      env,
    );
  }

  if (req.method === "POST" && !id) {
    const body = await readJson<SessionInput>(req);
    const session: SessionRecord = {
      id: uuid(),
      bookId: body?.bookId ?? null,
      startedAt: body?.startedAt ?? now(),
      endedAt: body?.endedAt ?? null,
      minutes: body?.minutes ?? 0,
      pagesRead: body?.pagesRead ?? 0,
      note: body?.note ?? null,
      createdAt: now(),
    };
    await mutateItems<SessionRecord>(env, "sessions", user.id, (items) => [session, ...items]);

    if (session.bookId && session.pagesRead > 0) {
      await mutateItems<BookRecord>(env, "books", user.id, (items) =>
        items.map((b) =>
          b.id === session.bookId
            ? { ...b, currentPage: b.currentPage + session.pagesRead, updatedAt: now() }
            : b,
        ),
      );
    }
    return ok({ session }, env);
  }

  if (id && req.method === "DELETE") {
    const updated = await mutateItems<SessionRecord>(env, "sessions", user.id, (items) =>
      items.filter((s) => s.id !== id),
    );
    if (!updated) return fail(404, "not_found", env);
    return ok({ deleted: id }, env);
  }

  return fail(404, "not_found", env);
}
