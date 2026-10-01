import type { Env, AuthUser } from "../types";
import { randomToken } from "./crypto";
import { getUserById } from "./store";

const SESSION_TTL = 60 * 60 * 24 * 30; // 30 days

export async function createSession(env: Env, userId: string): Promise<string> {
  const token = randomToken();
  await env.KV.put(`session:${token}`, userId, { expirationTtl: SESSION_TTL });
  return token;
}

export async function destroySession(env: Env, token: string): Promise<void> {
  await env.KV.delete(`session:${token}`);
}

export async function getUser(req: Request, env: Env): Promise<AuthUser | null> {
  const header = req.headers.get("Authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return null;
  const userId = await env.KV.get(`session:${token}`);
  if (!userId) return null;
  const user = await getUserById(env, userId);
  return user ? { id: user.id, email: user.email } : null;
}
