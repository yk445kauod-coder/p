import type { Env } from "../types";
import { fail, ok } from "../lib/http";

/**
 * The APK lives on a GitHub release, so the API resolves the download link
 * through GitHub instead of hardcoding a URL. That keeps the landing page and
 * the in-app updater working after a new build is published, and it survives
 * GitHub's signed, expiring asset URLs because we only ever return the stable
 * `browser_download_url`.
 */

interface ReleaseInfo {
  url: string;
  name: string;
  size: number;
  version: string;
  downloadCount: number;
  publishedAt: string | null;
}

const CACHE_KEY = "release:latest";
const CACHE_TTL = 300; // seconds; keeps unauthenticated GitHub calls well under 60/hour

async function latestRelease(env: Env): Promise<ReleaseInfo> {
  const cached = await env.KV.get<ReleaseInfo>(CACHE_KEY, "json");
  if (cached) return cached;

  const repo = env.GITHUB_REPO;
  if (!repo) throw new Error("github_repo_not_configured");

  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "tracebook-api",
  };
  if (env.GITHUB_TOKEN) headers.Authorization = `Bearer ${env.GITHUB_TOKEN}`;

  const res = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, { headers });
  if (!res.ok) throw new Error(`github_${res.status}`);

  const release = (await res.json()) as {
    tag_name: string;
    published_at: string | null;
    assets?: { name: string; size: number; browser_download_url: string; download_count: number }[];
  };
  const asset = (release.assets ?? []).find((a) => a.name.endsWith(".apk"));
  if (!asset) throw new Error("apk_asset_missing");

  const info: ReleaseInfo = {
    url: asset.browser_download_url,
    name: asset.name,
    size: asset.size,
    version: release.tag_name,
    downloadCount: asset.download_count,
    publishedAt: release.published_at,
  };
  await env.KV.put(CACHE_KEY, JSON.stringify(info), { expirationTtl: CACHE_TTL });
  return info;
}

export async function downloadRoutes(req: Request, env: Env, parts: string[]): Promise<Response> {
  if (req.method !== "GET") return fail(405, "method_not_allowed", env);

  const wantsRedirect = parts[1] === "apk" || parts[0] === "apk";

  try {
    const info = await latestRelease(env);
    if (wantsRedirect) {
      return Response.redirect(info.url, 302);
    }
    return ok({ release: info }, env);
  } catch (err) {
    return fail(502, `download_unavailable: ${(err as Error).message}`, env);
  }
}
