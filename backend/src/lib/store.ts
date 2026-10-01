import type { Env, UserRecord } from "../types";

/**
 * TraceBook persists everything in KV rather than D1. The Cloudflare free plan
 * caps an account at 10 D1 databases, and this account was already at the limit,
 * so the whole store is keyed by user id inside one namespace.
 *
 * Keys:
 *   user:<id>            -> UserRecord
 *   email:<email>        -> user id
 *   books:<userId>       -> BookRecord[]
 *   sessions:<userId>    -> SessionRecord[]
 *   goals:<userId>       -> GoalRecord[]
 *   quotes:<userId>      -> QuoteRecord[]
 */

export interface BookRecord {
  id: string;
  title: string;
  author: string | null;
  totalPages: number;
  currentPage: number;
  status: string;
  coverColor: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface SessionRecord {
  id: string;
  bookId: string | null;
  startedAt: number;
  endedAt: number | null;
  minutes: number;
  pagesRead: number;
  note: string | null;
  createdAt: number;
}

export interface GoalRecord {
  id: string;
  kind: string;
  target: number;
  period: string;
  createdAt: number;
}

export interface QuoteRecord {
  id: string;
  bookId: string | null;
  text: string;
  page: number | null;
  createdAt: number;
}

const userKey = (id: string) => `user:${id}`;
const emailKey = (email: string) => `email:${email}`;
const listKey = (kind: string, userId: string) => `${kind}:${userId}`;

export async function getUserById(env: Env, id: string): Promise<UserRecord | null> {
  return env.KV.get<UserRecord>(userKey(id), "json");
}

export async function getUserByEmail(env: Env, email: string): Promise<UserRecord | null> {
  const id = await env.KV.get(emailKey(email));
  return id ? getUserById(env, id) : null;
}

export async function putUser(env: Env, user: UserRecord): Promise<void> {
  await env.KV.put(userKey(user.id), JSON.stringify(user));
  await env.KV.put(emailKey(user.email), user.id);
}

export async function listItems<T>(env: Env, kind: string, userId: string): Promise<T[]> {
  return (await env.KV.get<T[]>(listKey(kind, userId), "json")) ?? [];
}

export async function putItems<T>(env: Env, kind: string, userId: string, items: T[]): Promise<void> {
  await env.KV.put(listKey(kind, userId), JSON.stringify(items));
}

/** Applies `mutate` to a user's collection and writes the result back. */
export async function mutateItems<T extends { id: string }>(
  env: Env,
  kind: string,
  userId: string,
  mutate: (items: T[]) => T[] | null,
): Promise<T[] | null> {
  const items = await listItems<T>(env, kind, userId);
  const next = mutate(items);
  if (next === null) return null;
  await putItems(env, kind, userId, next);
  return next;
}
