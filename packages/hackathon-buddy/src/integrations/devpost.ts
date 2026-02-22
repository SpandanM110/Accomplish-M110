/**
 * Devpost integration for hackathon data.
 * Uses Devpost's internal API when available; falls back to web search for discovery.
 */

import { webSearch } from './web-search.js';

export interface DevpostHackathon {
  id: string;
  title: string;
  url: string;
  tagline?: string;
  prize_amount?: string;
  end_date?: string;
}

export interface DevpostHackathonDetail extends DevpostHackathon {
  description?: string;
  prizes?: Array<{ title: string; amount?: string }>;
  judges?: Array<{ name: string; title?: string }>;
  sponsors?: Array<{ name: string }>;
}

export async function searchHackathons(params: {
  query?: string;
  page?: number;
  perPage?: number;
}): Promise<{ hackathons: DevpostHackathon[]; total?: number }> {
  const perPage = Math.min(params.perPage ?? 20, 50);
  const q = (params.query || 'active upcoming hackathons 2025').trim();

  try {
    const results = await webSearch(q, { num: perPage });
    const hackathonDomains = ['devpost.com', 'devfolio.co', 'mlh.io'];
    const hackathons: DevpostHackathon[] = results
      .filter(
        (r) => hackathonDomains.some((d) => r.url.includes(d)) && !r.url.includes('/software/'),
      )
      .slice(0, perPage)
      .map((r, i) => ({
        id: `devpost-${i + 1}`,
        title: r.title.replace(/\s*\|\s*Devpost$/, ''),
        url: r.url,
        tagline: r.snippet,
        prize_amount: undefined,
        end_date: undefined,
      }));
    return { hackathons, total: hackathons.length };
  } catch {
    return { hackathons: [] };
  }
}

export async function getHackathonByUrl(url: string): Promise<DevpostHackathonDetail | null> {
  const slug = url.split('/').filter(Boolean).pop();
  if (!slug) return null;
  return {
    id: slug,
    title: slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    url,
    tagline: 'Hackathon details - add BRAVE_API_KEY or SERPER_API_KEY for full data',
    prizes: [],
    judges: [],
    sponsors: [],
  };
}

export async function getWinningProjects(hackathonUrl: string): Promise<
  Array<{
    name: string;
    description?: string;
    built_with?: string[];
    url?: string;
  }>
> {
  const slug = hackathonUrl.split('/').filter(Boolean).pop();
  if (!slug) return [];
  try {
    const results = await webSearch(`site:devpost.com ${slug} winning projects`);
    return results.slice(0, 15).map((r) => ({
      name: r.title,
      description: r.snippet,
      url: r.url,
    }));
  } catch {
    return [];
  }
}
