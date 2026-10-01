/**
 * Thin API client for the TraceBook Cloudflare Worker.
 * The base URL is read from EXPO_PUBLIC_API_URL so the same build works against
 * local `wrangler dev`, a preview URL, or production.
 */

export const API_BASE =
  (process.env.EXPO_PUBLIC_API_URL as string | undefined)?.replace(/\/$/, "") ||
  "http://localhost:8787";

let authToken: string | null = null;

export function setToken(token: string | null) {
  authToken = token;
}

export function getToken(): string | null {
  return authToken;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok || data?.ok === false) {
    throw new ApiError(res.status, data?.error ?? `http_${res.status}`);
  }
  return data.data as T;
}

export const api = {
  health: () => request<{ status: string }>("/health"),

  register: (email: string, password: string, displayName?: string) =>
    request<{ token: string; user: any }>("/auth/register", {
      method: "POST",
      body: { email, password, displayName },
    }),
  login: (email: string, password: string) =>
    request<{ token: string; user: any }>("/auth/login", {
      method: "POST",
      body: { email, password },
    }),
  logout: () => request<{ loggedOut: boolean }>("/auth/logout", { method: "POST" }),
  me: () => request<{ user: any }>("/auth/me"),

  listBooks: () => request<{ books: any[] }>("/books"),
  createBook: (b: any) => request<{ book: any }>("/books", { method: "POST", body: b }),
  updateBook: (id: string, b: any) =>
    request<{ book: any }>(`/books/${id}`, { method: "PATCH", body: b }),
  deleteBook: (id: string) => request<{ deleted: string }>(`/books/${id}`, { method: "DELETE" }),

  listSessions: () => request<{ sessions: any[] }>("/sessions"),
  createSession: (s: any) => request<{ session: any }>("/sessions", { method: "POST", body: s }),
  deleteSession: (id: string) => request<{ deleted: string }>(`/sessions/${id}`, { method: "DELETE" }),
  stats: () => request<any>("/sessions/stats"),

  listGoals: () => request<{ goals: any[] }>("/goals"),
  createGoal: (g: any) => request<{ goal: any }>("/goals", { method: "POST", body: g }),
  deleteGoal: (id: string) => request<{ deleted: string }>(`/goals/${id}`, { method: "DELETE" }),

  listQuotes: () => request<{ quotes: any[] }>("/quotes"),
  createQuote: (q: any) => request<{ quote: any }>("/quotes", { method: "POST", body: q }),
  deleteQuote: (id: string) => request<{ deleted: string }>(`/quotes/${id}`, { method: "DELETE" }),

  chat: (messages: { role: string; content: string }[], bookContext?: string) =>
    request<{ message: { role: string; content: string }; model: string }>("/ai/chat", {
      method: "POST",
      body: { messages, bookContext },
    }),
};
