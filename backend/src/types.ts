export interface Env {
  KV: KVNamespace;
  OPENROUTER_API_KEY?: string;
  AI_MODEL?: string;
  ALLOWED_ORIGIN?: string;
  /** "owner/repo" hosting the release that carries the APK. */
  GITHUB_REPO?: string;
  /** Optional: raises the GitHub API rate limit for the download endpoints. */
  GITHUB_TOKEN?: string;
}

export interface AuthUser {
  id: string;
  email: string;
}

export interface UserRecord {
  id: string;
  email: string;
  password_hash: string;
  display_name: string | null;
  created_at: number;
}
