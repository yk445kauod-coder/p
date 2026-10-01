import type { Env } from "../types";
import { fail, ok, readJson } from "../lib/http";
import { getUser } from "../lib/auth";
import { uuid, now } from "../lib/crypto";
import { listItems, mutateItems, type BookRecord } from "../lib/store";

interface BookInput {
  title?: string;
  author?: string;
  totalPages?: number;
  currentPage?: number;
  status?: string;
  coverColor?: string;
}

export async function bookRoutes(req: Request, env: Env, parts: string[]): Promise<Response> {
  const user = await getUser(req, env);
  if (!user) return fail(401, "unauthorized", env);

  const id = parts[0];

  if (req.method === "GET" && !id) {
    const books = await listItems<BookRecord>(env, "books", user.id);
    books.sort((a, b) => b.updatedAt - a.updatedAt);
    return ok({ books }, env);
  }

  if (req.method === "POST" && !id) {
    const body = await readJson<BookInput>(req);
    if (!body?.title?.trim()) return fail(400, "title_required", env);
    const ts = now();
    const book: BookRecord = {
      id: uuid(),
      title: body.title.trim(),
      author: body.author ?? null,
      totalPages: body.totalPages ?? 0,
      currentPage: body.currentPage ?? 0,
      status: body.status ?? "reading",
      coverColor: body.coverColor ?? null,
      createdAt: ts,
      updatedAt: ts,
    };
    await mutateItems<BookRecord>(env, "books", user.id, (items) => [book, ...items]);
    return ok({ book }, env);
  }

  if (id && (req.method === "PUT" || req.method === "PATCH")) {
    const body = await readJson<BookInput>(req);
    const updated = await mutateItems<BookRecord>(env, "books", user.id, (items) => {
      const i = items.findIndex((b) => b.id === id);
      if (i === -1) return null;
      const merged: BookRecord = {
        ...items[i],
        title: body?.title ?? items[i].title,
        author: body?.author ?? items[i].author,
        totalPages: body?.totalPages ?? items[i].totalPages,
        currentPage: body?.currentPage ?? items[i].currentPage,
        status: body?.status ?? items[i].status,
        coverColor: body?.coverColor ?? items[i].coverColor,
        updatedAt: now(),
      };
      items[i] = merged;
      return items;
    });
    if (!updated) return fail(404, "not_found", env);
    return ok({ book: updated.find((b) => b.id === id) }, env);
  }

  if (id && req.method === "DELETE") {
    const updated = await mutateItems<BookRecord>(env, "books", user.id, (items) =>
      items.filter((b) => b.id !== id),
    );
    if (!updated) return fail(404, "not_found", env);
    return ok({ deleted: id }, env);
  }

  return fail(404, "not_found", env);
}
