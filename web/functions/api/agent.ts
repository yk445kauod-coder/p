interface Env {
  OPENROUTER_API_KEY: string;
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM = `You are Fahm, the practical AI reading coach inside TraceBook.
Answer in the same language as the reader. Use the supplied live snapshot as your source of truth. Never invent progress, books, streaks, or actions. Be warm, concise, and concrete. The app is local-first: if the reader asks to log a session, add a book, or change data, explain the exact action they should confirm in the UI because this endpoint cannot directly mutate their local browser database. You can analyse patterns, create reading plans, suggest books, summarise notes, and identify gaps. Do not use Markdown tables or code unless the reader explicitly asks; prefer short paragraphs and bullets.`;

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

export const onRequestOptions = () => new Response(null, { status: 204, headers: CORS });

export const onRequestPost = async (context: { request: Request; env: Env }) => {
  if (!context.env.OPENROUTER_API_KEY) return response({ error: "ai_not_configured" }, 500);
  let body: { messages?: unknown[]; context?: string };
  try { body = await context.request.json(); } catch { return response({ error: "invalid_body" }, 400); }
  const messages = Array.isArray(body.messages)
    ? body.messages.filter((message): message is { role: "user" | "assistant"; content: string } => Boolean(message && typeof message === "object" && typeof (message as { content?: unknown }).content === "string" && ((message as { role?: string }).role === "user" || (message as { role?: string }).role === "assistant"))).slice(-12)
    : [];
  if (!messages.length) return response({ error: "messages_required" }, 400);
  const liveContext = typeof body.context === "string" ? body.context.slice(0, 18000) : "{}";
  const upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${context.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://tracebook.pages.dev",
      "X-Title": "TraceBook Fahm",
    },
    body: JSON.stringify({
      model: "openai/gpt-4o-mini",
      messages: [{ role: "system", content: `${SYSTEM}\n\nLIVE SNAPSHOT:\n${liveContext}` }, ...messages],
      temperature: 0.55,
      max_tokens: 64,
    }),
  });
  const data = await upstream.json().catch(() => null) as { choices?: { message?: { content?: string } }[]; error?: { message?: string } } | null;
  if (!upstream.ok || data?.error) return response({ error: data?.error?.message ?? `provider_http_${upstream.status}` }, 502);
  const content = data?.choices?.[0]?.message?.content?.trim();
  if (!content) return response({ error: "empty_ai_response" }, 502);
  return response({ content, model: "openai/gpt-4o-mini", toolCalls: [] });
};
