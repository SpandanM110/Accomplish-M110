/**
 * Web search client. Exa (primary), Brave, or Serper.
 * Set EXA_API_KEY (recommended), BRAVE_API_KEY, or SERPER_API_KEY in env.
 * @see https://exa.ai/docs/reference/search-quickstart
 */

const EXA_SEARCH_URL = 'https://api.exa.ai/search';
const BRAVE_SEARCH_URL = 'https://api.search.brave.com/res/v1/web/search';
const SERPER_URL = 'https://google.serper.dev/search';

export interface SearchResult {
  title: string;
  url: string;
  snippet?: string;
}

interface ExaResult {
  title?: string;
  url?: string;
  text?: string;
  highlights?: string[];
}

export async function webSearch(
  query: string,
  options?: {
    num?: number;
    category?: 'people' | 'company' | 'research paper' | 'news';
    includeDomains?: string[];
  },
): Promise<SearchResult[]> {
  const num = Math.min(options?.num ?? 10, 100);
  const exaKey = process.env.EXA_API_KEY;
  const braveKey = process.env.BRAVE_API_KEY;
  const serperKey = process.env.SERPER_API_KEY;

  // Exa (primary) — neural search, great for hackathon research, judge dossiers, grants
  if (exaKey) {
    try {
      const body: Record<string, unknown> = {
        query,
        type: 'auto',
        numResults: num,
        contents: { text: true },
      };
      if (options?.category) body.category = options.category;
      if (options?.includeDomains?.length) body.includeDomains = options.includeDomains;
      const res = await fetch(EXA_SEARCH_URL, {
        method: 'POST',
        headers: {
          'x-api-key': exaKey,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errBody = await res.text();
        console.error(
          '[web-search] Exa API error:',
          res.status,
          res.statusText,
          errBody.slice(0, 200),
        );
        return [];
      }
      const data = (await res.json()) as { results?: ExaResult[] };
      return (data.results ?? []).map((r) => ({
        title: r.title ?? '',
        url: r.url ?? '',
        snippet: r.highlights?.[0] ?? r.text?.slice(0, 400) ?? undefined,
      }));
    } catch {
      return [];
    }
  }

  if (braveKey) {
    const res = await fetch(`${BRAVE_SEARCH_URL}?q=${encodeURIComponent(query)}&count=${num}`, {
      headers: {
        'X-Subscription-Token': braveKey,
        Accept: 'application/json',
      },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      web?: { results?: Array<{ title: string; url: string; description?: string }> };
    };
    return (data.web?.results ?? []).map((r) => ({
      title: r.title,
      url: r.url,
      snippet: r.description,
    }));
  }

  if (serperKey) {
    const res = await fetch(SERPER_URL, {
      method: 'POST',
      headers: { 'X-API-KEY': serperKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: query, num }),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      organic?: Array<{ title: string; link: string; snippet?: string }>;
    };
    return (data.organic ?? []).map((r) => ({
      title: r.title,
      url: r.link,
      snippet: r.snippet,
    }));
  }

  return [];
}
