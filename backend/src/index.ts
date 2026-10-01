import type { Env } from "./types";
import { cors, fail, ok } from "./lib/http";
import { authRoutes } from "./routes/auth";
import { bookRoutes } from "./routes/books";
import { sessionRoutes } from "./routes/sessions";
import { goalRoutes } from "./routes/goals";
import { quoteRoutes } from "./routes/quotes";
import { aiRoutes } from "./routes/ai";
import { downloadRoutes } from "./routes/download";

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);

    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors(env) });
    }

    if (url.pathname === "/" || url.pathname === "/health") {
      return ok({ service: "tracebook-api", status: "healthy", time: Date.now() }, env);
    }

    const parts = url.pathname.replace(/^\/+|\/+$/g, "").split("/");
    const [root, ...rest] = parts;

    try {
      switch (root) {
        case "auth":
          return await authRoutes(req, env, rest);
        case "books":
          return await bookRoutes(req, env, rest);
        case "sessions":
          return await sessionRoutes(req, env, rest);
        case "goals":
          return await goalRoutes(req, env, rest);
        case "quotes":
          return await quoteRoutes(req, env, rest);
        case "ai":
          return await aiRoutes(req, env, rest);
        case "download":
          return await downloadRoutes(req, env, rest);
        default:
          return fail(404, "not_found", env);
      }
    } catch (err) {
      return fail(500, `server_error: ${(err as Error).message}`, env);
    }
  },
};
