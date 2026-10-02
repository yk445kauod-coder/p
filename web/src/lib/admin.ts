/**
 * Admin client.
 *
 * Every call here is a Postgres function that re-checks `is_admin()` server-side,
 * so the browser is never the thing enforcing authorisation — these wrappers are
 * only a typed convenience over `supabase.rpc`.
 *
 * Secret values are never read except by `revealSecret`, which the UI only calls
 * on an explicit click and which leaves an audit row every time.
 */
import { supabase } from "@/lib/supabase";

export interface AdminStats {
  users: number;
  pro: number;
  books: number;
  sessions: number;
  minutes: number;
  quotes: number;
  agents_threads: number;
  agent_messages: number;
  secrets: number;
  signups_7d: number;
  sessions_7d: number;
}

export interface AdminUser {
  id: string;
  email: string | null;
  display_name: string | null;
  plan: "free" | "pro";
  created_at: string;
  last_seen: string | null;
  books: number;
  sessions: number;
  minutes: number;
}

export interface AdminSecret {
  key: string;
  description: string;
  updated_at: string;
  updated_by: string | null;
  has_value: boolean;
}

/** Thrown when the caller is not an admin, so the UI can show a clear message. */
export class NotAdminError extends Error {
  constructor() {
    super("not_admin");
    this.name = "NotAdminError";
  }
}

function unwrap<T>(data: T | null, error: { code?: string; message: string } | null): T {
  if (error) {
    // 42501 is Postgres' insufficient_privilege.
    if (error.code === "42501" || /not_admin|permission denied/i.test(error.message)) {
      throw new NotAdminError();
    }
    throw new Error(error.message);
  }
  return data as T;
}

function client() {
  if (!supabase) throw new Error("supabase_not_configured");
  return supabase;
}

/** True when the signed-in reader is an admin. */
export async function checkAdmin(): Promise<boolean> {
  if (!supabase) return false;
  const { data, error } = await supabase.rpc("is_admin");
  if (error) return false;
  return data === true;
}

/**
 * One-time bootstrap: the first authenticated caller becomes the admin.
 * Returns false when an admin already exists, which is the permanent state.
 */
export async function claimAdmin(): Promise<boolean> {
  const { data, error } = await client().rpc("admin_claim");
  if (error) throw new Error(error.message);
  return data === true;
}

export async function fetchStats(): Promise<AdminStats> {
  const { data, error } = await client().rpc("admin_stats");
  return unwrap<AdminStats>(data, error);
}

export async function fetchUsers(search = "", limit = 200): Promise<AdminUser[]> {
  const { data, error } = await client().rpc("admin_list_users", {
    p_search: search || null,
    p_limit: limit,
  });
  return unwrap<AdminUser[]>(data, error);
}

export async function setPlan(userId: string, plan: "free" | "pro"): Promise<void> {
  const { error } = await client().rpc("admin_set_plan", { p_user: userId, p_plan: plan });
  unwrap(null, error);
}

export async function deleteUser(userId: string): Promise<void> {
  const { error } = await client().rpc("admin_delete_user", { p_user: userId });
  unwrap(null, error);
}

export async function fetchSecrets(): Promise<AdminSecret[]> {
  const { data, error } = await client().rpc("admin_list_secrets");
  return unwrap<AdminSecret[]>(data, error);
}

export async function setSecret(key: string, value: string, description = ""): Promise<void> {
  const { error } = await client().rpc("admin_set_secret", {
    p_key: key,
    p_value: value,
    p_description: description,
  });
  unwrap(null, error);
}

/** Reads a secret back. Audited server-side on every call. */
export async function revealSecret(key: string): Promise<string | null> {
  const { data, error } = await client().rpc("admin_reveal_secret", { p_key: key });
  return unwrap<string | null>(data, error);
}

export async function deleteSecret(key: string): Promise<void> {
  const { error } = await client().rpc("admin_delete_secret", { p_key: key });
  unwrap(null, error);
}

/**
 * Secrets the platform expects, with the edge functions that consume them.
 *
 * Surfacing these as a checklist means a missing key is obvious rather than a
 * mystery 500 from the coach.
 */
export const KNOWN_SECRETS: { key: string; label: string; description: string; usedBy: string }[] = [
  {
    key: "OPENROUTER_API_KEY",
    label: "OpenRouter API key",
    description: "Powers the AI reading coach.",
    usedBy: "agent",
  },
  {
    key: "AI_MODEL",
    label: "AI model id",
    description: "Optional override, e.g. openai/gpt-4o-mini.",
    usedBy: "agent",
  },
  {
    key: "AI_BASE_URL",
    label: "AI base URL",
    description: "Optional. Defaults to https://openrouter.ai/api/v1.",
    usedBy: "agent",
  },
  {
    key: "VAPID_PRIVATE_KEY",
    label: "VAPID private key",
    description: "Signs Web Push notifications.",
    usedBy: "push",
  },
  {
    key: "VAPID_PUBLIC_KEY",
    label: "VAPID public key",
    description: "Shared with browsers to subscribe to push.",
    usedBy: "push",
  },
];
