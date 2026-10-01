import type { Env } from "../types";
import { fail, ok, readJson } from "../lib/http";
import { getUser } from "../lib/auth";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatInput {
  messages?: ChatMessage[];
  bookContext?: string;
}

const FALLBACK_MODELS = [
  "nvidia/nemotron-3-super-120b-a12b:free",
  "liquid/lfm-2.5-2.6b:free",
  "cohere/north-mini-code:free",
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
];

const SYSTEM_PROMPT = `You are "Hoot", the friendly reading coach inside the TraceBook app.
You help people build a durable reading habit: suggest what to read next, break books into
manageable sessions, explain ideas simply, and keep the user motivated. Be concise, warm and
practical. When the user shares their reading stats or goals, tailor your advice to them.
Never invent facts about a specific book; if unsure, say so.`;

async function callOpenRouter(
  env: Env,
  messages: ChatMessage[],
): Promise<{ content: string; model: string }> {
  const models = [env.AI_MODEL, ...FALLBACK_MODELS].filter(Boolean) as string[];
  let lastError = "ai_unavailable";

  for (const model of models) {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://tracebook.app",
        "X-Title": "TraceBook",
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 800,
        temperature: 0.7,
      }),
    });

    const data = (await res.json()) as any;
    if (!res.ok || data?.error) {
      lastError = data?.error?.message ?? `http_${res.status}`;
      continue;
    }
    const choice = data?.choices?.[0]?.message;
    const content: string =
      choice?.content || choice?.reasoning || data?.choices?.[0]?.text || "";
    if (content.trim()) return { content: content.trim(), model };
    lastError = "empty_completion";
  }
  throw new Error(lastError);
}

export async function aiRoutes(req: Request, env: Env, parts: string[]): Promise<Response> {
  const user = await getUser(req, env);
  if (!user) return fail(401, "unauthorized", env);
  if (!env.OPENROUTER_API_KEY) return fail(500, "ai_not_configured", env);

  const action = parts[0];

  if (req.method === "POST" && action === "chat") {
    const body = await readJson<ChatInput>(req);
    const incoming = (body?.messages ?? []).filter(
      (m) => m && typeof m.content === "string" && m.content.trim(),
    );
    if (!incoming.length) return fail(400, "messages_required", env);

    const system: ChatMessage = {
      role: "system",
      content: body?.bookContext
        ? `${SYSTEM_PROMPT}\n\nReader context:\n${body.bookContext}`
        : SYSTEM_PROMPT,
    };
    // Keep the last 12 turns to stay within free-tier token budgets.
    const trimmed = incoming.slice(-12);

    try {
      const { content, model } = await callOpenRouter(env, [system, ...trimmed]);
      return ok({ message: { role: "assistant", content }, model }, env);
    } catch (err) {
      return fail(502, `ai_error: ${(err as Error).message}`, env);
    }
  }

  return fail(404, "not_found", env);
}
