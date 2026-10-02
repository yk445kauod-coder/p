// TraceBook agent — Supabase Edge Function.
//
// Holds the model provider key, runs a tool-calling loop, and reaches Postgres as
// the signed-in user so row-level security still applies to every read and write.
// Responds with newline-delimited JSON events so the client can render a live
// action timeline plus streamed text.

import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const BASE_URL = Deno.env.get("AI_BASE_URL") ?? "https://openrouter.ai/api/v1";

const PROVIDER_KEY =
  Deno.env.get("AI_API_KEY") ??
  Deno.env.get("OPENROUTER_API_KEY") ??
  Deno.env.get("OPENAI_API_KEY") ??
  "";

const MODELS = [
  Deno.env.get("AI_MODEL"),
  "openai/gpt-4o-mini",
  "openai/gpt-4o",
].filter(Boolean) as string[];

const MAX_STEPS = 4;

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT = `You are Hoot, the reading coach inside TraceBook.

You are an agent, not a chatbot: before answering questions about the reader's
progress you call your tools to look at their real data, then ground every claim
in what the tools returned. Never invent numbers, books, or streaks.

Style: warm, concise, practical. Short paragraphs or tight bullets. When you
suggest a plan, make it concrete (what to read, how many minutes, when).
When a tool performs a write, confirm plainly what changed.
If a tool fails, say so and suggest the manual step instead.`;

interface ToolDef {
  name: string;
  description: string;
  write: boolean;
  parameters: Record<string, unknown>;
}

const TOOLS: ToolDef[] = [
  {
    name: "get_reading_stats",
    description:
      "Aggregate the reader's reading activity over the last N days: totals, averages, active days, best day and a per-day series. Use this for any question about progress, consistency or streaks.",
    write: false,
    parameters: {
      type: "object",
      properties: {
        days: { type: "integer", description: "Look-back window in days (default 30, max 365)." },
      },
    },
  },
  {
    name: "list_books",
    description: "List the reader's books, optionally filtered by status.",
    write: false,
    parameters: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["reading", "finished", "paused", "wishlist"],
          description: "Optional status filter.",
        },
      },
    },
  },
  {
    name: "list_recent_sessions",
    description: "List the most recent reading sessions with minutes, pages and notes.",
    write: false,
    parameters: {
      type: "object",
      properties: { limit: { type: "integer", description: "How many sessions (default 10, max 50)." } },
    },
  },
  {
    name: "list_goals",
    description: "List the reader's active goals.",
    write: false,
    parameters: { type: "object", properties: {} },
  },
  {
    name: "list_quotes",
    description: "List saved quotes, optionally for one book.",
    write: false,
    parameters: {
      type: "object",
      properties: { limit: { type: "integer", description: "How many quotes (default 10, max 50)." } },
    },
  },
  {
    name: "log_session",
    description:
      "Record a reading session for the reader. Use when they say they read, finished a chapter, or want it tracked. Resolve the book by title when given.",
    write: true,
    parameters: {
      type: "object",
      properties: {
        minutes: { type: "integer", description: "Minutes read. Required." },
        pages_read: { type: "integer", description: "Pages read (default 0)." },
        book_title: { type: "string", description: "Title of the book read, if mentioned." },
        note: { type: "string", description: "Optional short note." },
        mood: { type: "string", description: "Optional mood, e.g. focused, distracted, enjoyable." },
      },
      required: ["minutes"],
    },
  },
  {
    name: "add_book",
    description: "Add a book to the reader's shelf.",
    write: true,
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        author: { type: "string" },
        total_pages: { type: "integer" },
        status: { type: "string", enum: ["reading", "finished", "paused", "wishlist"] },
      },
      required: ["title"],
    },
  },
  {
    name: "set_goal",
    description: "Create or replace a reading goal.",
    write: true,
    parameters: {
      type: "object",
      properties: {
        kind: { type: "string", enum: ["minutes", "pages", "books"] },
        target: { type: "integer" },
        period: { type: "string", enum: ["daily", "weekly", "yearly"] },
      },
      required: ["kind", "target"],
    },
  },
];

function toolSchema(t: ToolDef) {
  return {
    type: "function" as const,
    function: { name: t.name, description: t.description, parameters: t.parameters },
  };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

async function callModel(messages: unknown[], tools: unknown[]): Promise<any> {
  let lastError = "ai_unavailable";
  for (const model of MODELS) {
    const res = await fetch(`${BASE_URL.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PROVIDER_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://tracebook.app",
        "X-Title": "TraceBook",
      },
      body: JSON.stringify({
        model,
        messages,
        tools: tools.length ? tools : undefined,
        tool_choice: tools.length ? "auto" : undefined,
        temperature: 0.6,
        max_tokens: 900,
      }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || data?.error) {
      lastError = data?.error?.message ?? `http_${res.status}`;
      continue;
    }
    const message = data?.choices?.[0]?.message;
    if (message) return { message, model };
    lastError = "empty_completion";
  }
  throw new Error(lastError);
}

/** Runs one tool by name against the user-scoped client. */
async function runTool(
  name: string,
  args: Record<string, any>,
  user: SupabaseClient,
  service: SupabaseClient,
  userId: string,
): Promise<unknown> {
  switch (name) {
    case "get_reading_stats": {
      const days = Math.min(Math.max(Number(args.days) || 30, 1), 365);
      const { data, error } = await service.rpc("user_analytics", { p_user: userId, p_days: days });
      if (error) throw error;
      return data;
    }
    case "list_books": {
      let q = user
        .from("books")
        .select("id,title,author,status,total_pages,current_page,updated_at")
        .order("updated_at", { ascending: false });
      if (args.status) q = q.eq("status", args.status);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    }
    case "list_recent_sessions": {
      const limit = Math.min(Math.max(Number(args.limit) || 10, 1), 50);
      const { data, error } = await user
        .from("reading_sessions")
        .select("started_at,minutes,pages_read,mood,note,book_id")
        .order("started_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data;
    }
    case "list_goals": {
      const { data, error } = await user
        .from("goals")
        .select("id,kind,target,period,created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    }
    case "list_quotes": {
      const limit = Math.min(Math.max(Number(args.limit) || 10, 1), 50);
      const { data, error } = await user
        .from("quotes")
        .select("text,page,book_id,created_at")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data;
    }
    case "log_session": {
      const minutes = Math.max(0, Math.round(Number(args.minutes) || 0));
      if (!minutes) throw new Error("minutes_required");
      const pages = Math.max(0, Math.round(Number(args.pages_read) || 0));
      let bookId: string | null = null;
      if (args.book_title) {
        const { data: match } = await user
          .from("books")
          .select("id,current_page")
          .ilike("title", `%${String(args.book_title).slice(0, 80)}%`)
          .limit(1);
        bookId = match?.[0]?.id ?? null;
      }
      const { data, error } = await user
        .from("reading_sessions")
        .insert({
          user_id: userId,
          book_id: bookId,
          minutes,
          pages_read: pages,
          note: args.note ?? null,
          mood: args.mood ?? null,
        })
        .select("id,started_at,minutes,pages_read")
        .single();
      if (error) throw error;
      if (bookId && pages > 0) {
        const { data: book } = await user
          .from("books")
          .select("current_page,total_pages")
          .eq("id", bookId)
          .single();
        if (book) {
          const next = (book.current_page ?? 0) + pages;
          await user
            .from("books")
            .update({
              current_page: next,
              status: book.total_pages > 0 && next >= book.total_pages ? "finished" : "reading",
            })
            .eq("id", bookId);
        }
      }
      return data;
    }
    case "add_book": {
      const title = String(args.title ?? "").trim();
      if (!title) throw new Error("title_required");
      const { data, error } = await user
        .from("books")
        .insert({
          user_id: userId,
          title,
          author: args.author ?? null,
          total_pages: Math.max(0, Math.round(Number(args.total_pages) || 0)),
          status: args.status ?? "reading",
        })
        .select("id,title,status")
        .single();
      if (error) throw error;
      return data;
    }
    case "set_goal": {
      const kind = String(args.kind ?? "");
      const target = Math.max(1, Math.round(Number(args.target) || 0));
      const period = args.period ?? "daily";
      if (!["minutes", "pages", "books"].includes(kind) || !target) throw new Error("invalid_goal");
      const { data, error } = await user
        .from("goals")
        .insert({ user_id: userId, kind, target, period })
        .select("id,kind,target,period")
        .single();
      if (error) throw error;
      return data;
    }
    default:
      throw new Error(`unknown_tool:${name}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);

  const user = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await user.auth.getUser();
  if (authError || !authData.user) return json({ error: "unauthorized" }, 401);
  const userId = authData.user.id;

  const service = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (!PROVIDER_KEY) return json({ error: "ai_not_configured" }, 500);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_body" }, 400);
  }

  const incoming = Array.isArray(body?.messages) ? body.messages : [];
  const turns = incoming
    .filter((m: any) => m && typeof m.content === "string" && m.content.trim())
    .slice(-14)
    .map((m: any) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: String(m.content),
    }));

  if (!turns.length) return json({ error: "messages_required" }, 400);

  const allowActions = body?.allowActions !== false;
  const tools = TOOLS.filter((t) => allowActions || !t.write).map(toolSchema);

  const system = body?.context
    ? `${SYSTEM_PROMPT}\n\nLive snapshot from the app (may be stale — verify with tools):\n${body.context}`
    : SYSTEM_PROMPT;

  const convo: any[] = [{ role: "system", content: system }, ...turns];

  const stream = body?.stream === true;
  const encoder = new TextEncoder();
  const toolCalls: { name: string; args: unknown; result: unknown; ok: boolean }[] = [];

  const emit = (obj: unknown) => encoder.encode(`${JSON.stringify(obj)}\n`);

  async function runLoop(): Promise<{ content: string; model: string }> {
    let content = "";
    let model = MODELS[0];
    for (let step = 0; step < MAX_STEPS; step++) {
      const { message, model: used } = await callModel(convo, tools);
      model = used;
      const calls = message?.tool_calls ?? [];
      if (!calls.length) {
        content = (message?.content ?? "").trim();
        break;
      }
      convo.push({ role: "assistant", content: message.content ?? "", tool_calls: calls });
      for (const call of calls) {
        const name = call?.function?.name ?? "unknown";
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(call?.function?.arguments || "{}");
        } catch {
          /* model sent malformed JSON; run with empty args */
        }
        let result: unknown;
        let ok = true;
        try {
          result = await runTool(name, args, user, service, userId);
        } catch (err) {
          ok = false;
          result = { error: (err as Error).message };
        }
        toolCalls.push({ name, args, result, ok });
        convo.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify(result).slice(0, 6000),
        });
      }
    }
    if (!content) {
      const { message, model: used } = await callModel(
        [
          ...convo,
          { role: "user", content: "Summarise what you found for the reader in a short, warm reply." },
        ],
        [],
      );
      content = (message?.content ?? "").trim();
      model = used;
    }
    return { content, model };
  }

  if (!stream) {
    try {
      const { content, model } = await runLoop();
      return json({ content, model, toolCalls });
    } catch (err) {
      return json({ error: `ai_error: ${(err as Error).message}` }, 502);
    }
  }

  const bodyStream = new ReadableStream({
    async start(controller) {
      try {
        const { content, model } = await runLoop();
        // Emit the settled tool timeline, then reveal the answer progressively.
        for (const call of toolCalls) {
          controller.enqueue(
            emit({ type: "tool", name: call.name, args: call.args, result: call.result, ok: call.ok }),
          );
        }
        const chunks = content.match(/[\s\S]{1,24}/g) ?? [];
        for (const chunk of chunks) {
          controller.enqueue(emit({ type: "token", text: chunk }));
          await new Promise((r) => setTimeout(r, 12));
        }
        controller.enqueue(emit({ type: "done", content, model }));
      } catch (err) {
        controller.enqueue(emit({ type: "error", error: `ai_error: ${(err as Error).message}` }));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(bodyStream, {
    headers: {
      ...CORS,
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
});
