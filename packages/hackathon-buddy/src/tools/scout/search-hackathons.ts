/**
 * hb_scout_search_hackathons — Search Devpost, Devfolio, MLH for hackathons.
 */

import { searchHackathons } from '../../integrations/devpost.js';
import { paginate } from '../../utils/formatters.js';
import type { ResponseFormat } from '../../utils/formatters.js';

export const name = 'hb_scout_search_hackathons';
export const description =
  'Search Devpost, Devfolio, and MLH for active or upcoming hackathons. Accepts filters for theme, platform, date window. Returns paginated results with name, URL, prize pool, deadline, theme.';

export const inputSchema = {
  type: 'object' as const,
  properties: {
    query: { type: 'string', description: 'Search query (theme, keywords)' },
    platform: {
      type: 'string',
      enum: ['devpost', 'devfolio', 'mlh', 'all'],
      description: 'Platform filter',
    },
    limit: { type: 'number', description: 'Results per page (default 20)' },
    offset: { type: 'number', description: 'Pagination offset (default 0)' },
    response_format: { type: 'string', enum: ['json', 'markdown'], description: 'Output format' },
  },
};

export async function execute(args: Record<string, unknown>): Promise<string> {
  const query = (args.query as string) || '';
  const limit = Math.min((args.limit as number) || 20, 50);
  const offset = (args.offset as number) || 0;
  const format = (args.response_format as ResponseFormat) || 'markdown';

  try {
    const { hackathons } = await searchHackathons({
      query: query || undefined,
      page: Math.floor(offset / limit) + 1,
      perPage: limit,
    });

    const result = paginate(hackathons, limit, offset);

    if (format === 'markdown') {
      const lines = result.items.map((h) => {
        const url = h.url || `https://devpost.com/software/${h.id}`;
        return `- **${h.title}** — ${h.prize_amount || 'Prizes TBD'} | [Link](${url}) | ${h.end_date || 'Deadline TBD'}`;
      });
      return [
        `## Hackathons (${result.total_count} total)`,
        '',
        ...lines,
        '',
        result.has_more ? `*More results available (offset ${result.next_offset})*` : '',
      ].join('\n');
    }

    return JSON.stringify({
      hackathons: result.items,
      has_more: result.has_more,
      next_offset: result.next_offset,
      total_count: result.total_count,
    });
  } catch (err) {
    return JSON.stringify({
      error: err instanceof Error ? err.message : String(err),
      suggestion: 'Try a different search query or check Devpost availability.',
    });
  }
}
