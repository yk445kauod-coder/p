/**
 * Client for the TraceBook agent (Supabase Edge Function).
 *
 * The function holds the model provider key, talks to Postgres as the signed-in
 * user (so RLS still applies), and can call tools that read or write the user's
 * own data. Nothing secret ever reaches this bundle.
 */
import { supabase } from "../lib/supabase";

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface AgentToolCall {
  name: string;
  args: Record<string, unknown>;
  result?: unknown;
  ok?: boolean;
}

export interface AgentReply {
  content: string;
  toolCalls: AgentToolCall[];
  model?: string;
}

export class AgentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AgentError";
  }
}

async function accessToken(): Promise<string> {
  if (!supabase) throw new AgentError("supabase_not_configured");
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new AgentError("unauthorized");
  return token;
}

function endpoint(): string {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL as string | undefined;
  if (!url) throw new AgentError("supabase_not_configured");
  return `${url.replace(/\/$/, "")}/functions/v1/agent`;
}

export interface AgentRequest {
  messages: ChatTurn[];
  /** Lets the agent tailor its answer to what the reader is doing right now. */
  context?: string;
  /** Continue an existing conversation. */
  threadId?: string;
  /** Allow the agent to perform write actions (logging sessions, adding books). */
  allowActions?: boolean;
}

/** One-shot request used when streaming is unavailable. */
export async function askAgent(req: AgentRequest): Promise<AgentReply> {
  const token = await accessToken();
  const res = await fetch(endpoint(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      apikey: (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string) ?? "",
    },
    body: JSON.stringify({ ...req, stream: false }),
  });
  const text = await res.text();
  let payload: any = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    /* non-JSON error body */
  }
  if (!res.ok) throw new AgentError(payload?.error ?? `http_${res.status}`);
  return {
    content: payload?.content ?? "",
    toolCalls: payload?.toolCalls ?? [],
    model: payload?.model,
  };
}

/**
 * Streams the agent's reply token by token.
 *
 * The response is newline-delimited JSON events: `{type:"token"|"tool"|"done"|"error"}`.
 * `onToken` receives incremental text; `onTool` fires as each tool call settles so
 * the UI can show a live action timeline.
 */
export async function streamAgent(
  req: AgentRequest,
  handlers: {
    onToken: (chunk: string) => void;
    onTool?: (call: AgentToolCall) => void;
    signal?: AbortSignal;
  },
): Promise<AgentReply> {
  const token = await accessToken();
  const res = await fetch(endpoint(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      apikey: (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string) ?? "",
    },
    body: JSON.stringify({ ...req, stream: true }),
    signal: handlers.signal,
  });

  if (!res.ok || !res.body) {
    // Fall back to the non-streaming path so the user still gets an answer.
    const reply = await askAgent(req);
    handlers.onToken(reply.content);
    reply.toolCalls.forEach((c) => handlers.onTool?.(c));
    return reply;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let content = "";
  const toolCalls: AgentToolCall[] = [];
  let model: string | undefined;

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      let evt: any;
      try {
        evt = JSON.parse(trimmed);
      } catch {
        continue;
      }
      if (evt.type === "token" && typeof evt.text === "string") {
        content += evt.text;
        handlers.onToken(evt.text);
      } else if (evt.type === "tool") {
        const call: AgentToolCall = { name: evt.name, args: evt.args ?? {}, result: evt.result, ok: evt.ok };
        toolCalls.push(call);
        handlers.onTool?.(call);
      } else if (evt.type === "done") {
        model = evt.model;
        if (typeof evt.content === "string" && !content) content = evt.content;
      } else if (evt.type === "error") {
        throw new AgentError(evt.error ?? "agent_error");
      }
    }
  }

  return { content, toolCalls, model };
}
