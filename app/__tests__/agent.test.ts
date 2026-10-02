/**
 * `streamAgent` talks to the edge function over newline-delimited JSON. The
 * parser is the part that can silently corrupt a reply, so it is tested against
 * a stubbed fetch that emits the same event stream the function produces.
 */
import { streamAgent } from "../src/api/agent";

jest.mock("../src/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: { access_token: "test-token" } } }),
    },
  },
  supabaseConfigured: true,
  startAutoRefresh: () => () => {},
}));

beforeAll(() => {
  process.env.EXPO_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = "anon";
});

/** Builds a Response whose body streams the given NDJSON lines. */
function streamResponse(lines: string[], status = 200): Response {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      const enc = new TextEncoder();
      for (const line of lines) controller.enqueue(enc.encode(line + "\n"));
      controller.close();
    },
  });
  return new Response(body, { status });
}

describe("streamAgent", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("concatenates token events into the final content", async () => {
    global.fetch = jest.fn(async () =>
      streamResponse([
        JSON.stringify({ type: "token", text: "Read " }),
        JSON.stringify({ type: "token", text: "20 " }),
        JSON.stringify({ type: "token", text: "pages." }),
        JSON.stringify({ type: "done", model: "test-model" }),
      ]),
    ) as unknown as typeof fetch;

    const chunks: string[] = [];
    const reply = await streamAgent({ messages: [] }, { onToken: (t) => chunks.push(t) });

    expect(chunks.join("")).toBe("Read 20 pages.");
    expect(reply.content).toBe("Read 20 pages.");
    expect(reply.model).toBe("test-model");
  });

  it("surfaces tool events in order", async () => {
    global.fetch = jest.fn(async () =>
      streamResponse([
        JSON.stringify({ type: "tool", name: "log_session", args: { minutes: 25 }, ok: true }),
        JSON.stringify({ type: "token", text: "Logged." }),
        JSON.stringify({ type: "done" }),
      ]),
    ) as unknown as typeof fetch;

    const tools: string[] = [];
    const reply = await streamAgent({ messages: [] }, { onToken: () => {}, onTool: (c) => tools.push(c.name) });

    expect(tools).toEqual(["log_session"]);
    expect(reply.toolCalls).toHaveLength(1);
    expect(reply.toolCalls[0].ok).toBe(true);
  });

  it("throws an AgentError on an error event", async () => {
    global.fetch = jest.fn(async () =>
      streamResponse([JSON.stringify({ type: "error", error: "rate_limited" })]),
    ) as unknown as typeof fetch;

    await expect(streamAgent({ messages: [] }, { onToken: () => {} })).rejects.toThrow("rate_limited");
  });

  it("ignores blank lines and unparseable fragments", async () => {
    global.fetch = jest.fn(async () =>
      streamResponse(["", "not-json", JSON.stringify({ type: "token", text: "ok" }), JSON.stringify({ type: "done" })]),
    ) as unknown as typeof fetch;

    const reply = await streamAgent({ messages: [] }, { onToken: () => {} });
    expect(reply.content).toBe("ok");
  });

  it("falls back to the non-streaming path when the stream has no body", async () => {
    // First call: a stream-shaped 200 with no body. Second call: the JSON reply.
    let call = 0;
    global.fetch = jest.fn(async () => {
      call += 1;
      if (call === 1) return new Response(null, { status: 200 });
      return new Response(JSON.stringify({ content: "fallback", toolCalls: [] }), { status: 200 });
    }) as unknown as typeof fetch;

    const reply = await streamAgent({ messages: [] }, { onToken: () => {} });
    expect(reply.content).toBe("fallback");
  });
});
