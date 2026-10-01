import type { Env, UserRecord } from "../types";
import { fail, ok, readJson } from "../lib/http";
import { hashPassword, uuid, verifyPassword, now } from "../lib/crypto";
import { createSession, destroySession, getUser } from "../lib/auth";
import { getUserByEmail, putUser } from "../lib/store";

interface Creds {
  email?: string;
  password?: string;
  displayName?: string;
}

export async function authRoutes(req: Request, env: Env, parts: string[]): Promise<Response> {
  const action = parts[0];

  if (req.method === "POST" && action === "register") {
    const body = await readJson<Creds>(req);
    const email = body?.email?.trim().toLowerCase();
    const password = body?.password ?? "";
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail(400, "invalid_email", env);
    if (password.length < 8) return fail(400, "weak_password", env);

    const exists = await getUserByEmail(env, email);
    if (exists) return fail(409, "email_taken", env);

    const id = uuid();
    const displayName = body?.displayName ?? email.split("@")[0];
    const user: UserRecord = {
      id,
      email,
      password_hash: await hashPassword(password),
      display_name: displayName,
      created_at: now(),
    };
    await putUser(env, user);

    const token = await createSession(env, id);
    return ok({ token, user: { id, email, displayName } }, env);
  }

  if (req.method === "POST" && action === "login") {
    const body = await readJson<Creds>(req);
    const email = body?.email?.trim().toLowerCase();
    if (!email) return fail(400, "invalid_email", env);
    const user = await getUserByEmail(env, email);
    if (!user) return fail(401, "invalid_credentials", env);
    const valid = await verifyPassword(body?.password ?? "", user.password_hash);
    if (!valid) return fail(401, "invalid_credentials", env);
    const token = await createSession(env, user.id);
    return ok(
      { token, user: { id: user.id, email: user.email, displayName: user.display_name } },
      env,
    );
  }

  if (req.method === "POST" && action === "logout") {
    const header = req.headers.get("Authorization") || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    if (token) await destroySession(env, token);
    return ok({ loggedOut: true }, env);
  }

  if (req.method === "GET" && action === "me") {
    const user = await getUser(req, env);
    if (!user) return fail(401, "unauthorized", env);
    const full = await getUserByEmail(env, user.email);
    return ok({ user: { ...user, displayName: full?.display_name ?? null } }, env);
  }

  return fail(404, "not_found", env);
}
