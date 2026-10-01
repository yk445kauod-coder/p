import type { Env } from "../types";

export function cors(env: Env): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Max-Age": "86400",
  };
}

export function json(data: unknown, init: ResponseInit = {}, env?: Env): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...(env ? cors(env) : {}),
      ...(init.headers || {}),
    },
  });
}

export function ok(data: unknown, env: Env): Response {
  return json({ ok: true, data }, {}, env);
}

export function fail(status: number, error: string, env: Env): Response {
  return json({ ok: false, error }, { status }, env);
}

export async function readJson<T>(req: Request): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}
