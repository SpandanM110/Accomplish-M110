/**
 * GitHub API client for profile analysis.
 * Requires GITHUB_TOKEN env var.
 */

const GITHUB_API = 'https://api.github.com';

function getHeaders(): Record<string, string> {
  const token = process.env.GITHUB_TOKEN;
  return {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'HackathonBuddy/1.0',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

export interface GitHubProfile {
  login: string;
  name?: string;
  bio?: string;
  public_repos: number;
  followers: number;
  created_at: string;
}

export interface RepoLanguage {
  [lang: string]: number;
}

export async function getProfile(username: string): Promise<GitHubProfile | null> {
  const clean = username.replace(/^https?:\/\/(www\.)?github\.com\//, '').split('/')[0];
  if (!clean) return null;
  try {
    const res = await fetch(`${GITHUB_API}/users/${clean}`, { headers: getHeaders() });
    if (!res.ok) return null;
    return (await res.json()) as GitHubProfile;
  } catch {
    return null;
  }
}

export async function getTopLanguages(username: string): Promise<Record<string, number>> {
  const clean = username.replace(/^https?:\/\/(www\.)?github\.com\//, '').split('/')[0];
  if (!clean) return {};
  try {
    const res = await fetch(`${GITHUB_API}/users/${clean}/repos?per_page=100&sort=pushed`, {
      headers: getHeaders(),
    });
    if (!res.ok) return {};
    const repos = (await res.json()) as Array<{ language: string | null }>;
    const langCount: Record<string, number> = {};
    for (const r of repos) {
      if (r.language) {
        langCount[r.language] = (langCount[r.language] || 0) + 1;
      }
    }
    return langCount;
  } catch {
    return {};
  }
}

export async function getCommitActivity(
  username: string,
): Promise<{ recent: number; avgPerWeek: number }> {
  const clean = username.replace(/^https?:\/\/(www\.)?github\.com\//, '').split('/')[0];
  if (!clean) return { recent: 0, avgPerWeek: 0 };
  try {
    const res = await fetch(`${GITHUB_API}/users/${clean}/events/public?per_page=100`, {
      headers: getHeaders(),
    });
    if (!res.ok) return { recent: 0, avgPerWeek: 0 };
    const events = (await res.json()) as Array<{ type: string; created_at: string }>;
    const pushes = events.filter((e) => e.type === 'PushEvent').length;
    return { recent: pushes, avgPerWeek: Math.round(pushes / 4) };
  } catch {
    return { recent: 0, avgPerWeek: 0 };
  }
}
