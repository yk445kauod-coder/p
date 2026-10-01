import type { Env } from "../types";
import { fail, ok, readJson } from "../lib/http";
import { getUser } from "../lib/auth";
import { uuid, now } from "../lib/crypto";
import { listItems, mutateItems, type QuoteRecord } from "../lib/store";

interface QuoteInput {
  bookId?: string | null;
  text?: string;
  page?: number;
}

export async function quoteRoutes(req: Request, env: Env, parts: string[]): Promise<Response> {
  const user = await getUser(req, env);
  if (!user) return fail(401, "unauthorized", env);

  const id = parts[0];

  if (req.method === "GET" && !id) {
    const quotes = await listItems<QuoteRecord>(env, "quotes", user.id);
    quotes.sort((a, b) => b.createdAt - a.createdAt);
    return ok({ quotes }, env);
  }

  if (req.method === "POST" && !id) {
    const body = await readJson<QuoteInput>(req);
    if (!body?.text?.trim()) return fail(400, "text_required", env);
    const quote: QuoteRecord = {
      id: uuid(),
      bookId: body.bookId ?? null,
      text: body.text.trim(),
      page: body.page ?? null,
      createdAt: now(),
    };
    await mutateItems<QuoteRecord>(env, "quotes", user.id, (items) => [quote, ...items]);
    return ok({ quote }, env);
  }

  if (id && req.method === "DELETE") {
    const updated = await mutateItems<QuoteRecord>(env, "quotes", user.id, (items) =>
      items.filter((q) => q.id !== id),
    );
    if (!updated) return fail(404, "not_found", env);
    return ok({ deleted: id }, env);
  }

  return fail(404, "not_found", env);
}
