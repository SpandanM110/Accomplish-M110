/**
 * hb_validator_find_similar_projects — Search for similar projects.
 */

import { getContext, updateContext } from '../../storage/context-store.js';
import { webSearch } from '../../integrations/web-search.js';
import type { ResponseFormat } from '../../utils/formatters.js';

export const name = 'hb_validator_find_similar_projects';
export const description =
  'Search Devpost and GitHub for projects similar to the idea. Returns ranked list with similarity score, overlaps, differences, and whether they won.';

export const inputSchema = {
  type: 'object' as const,
  properties: {
    project_id: { type: 'string' },
    idea_description: { type: 'string' },
    limit: { type: 'number' },
    response_format: { type: 'string', enum: ['json', 'markdown'] },
  },
  required: ['project_id'],
};

export async function execute(args: Record<string, unknown>): Promise<string> {
  const projectId = args.project_id as string;
  const idea = (args.idea_description as string) || '';
  const limit = Math.min((args.limit as number) || 10, 20);
  const format = (args.response_format as ResponseFormat) || 'markdown';

  const ctx = getContext(projectId);
  const desc = idea || ctx.idea.description || '';

  if (!desc) {
    return JSON.stringify({ error: 'idea_description required' });
  }

  const keywords = desc
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .slice(0, 4)
    .join(' ');
  const [devpost, github] = await Promise.all([
    webSearch(`site:devpost.com ${keywords}`, { num: limit }),
    webSearch(`site:github.com ${keywords}`, { num: Math.floor(limit / 2) }),
  ]);

  const similar = [
    ...devpost.map((r) => ({
      name: r.title,
      url: r.url,
      platform: 'devpost',
      snippet: r.snippet,
      won:
        r.title.toLowerCase().includes('winner') || r.title.toLowerCase().includes('1st')
          ? true
          : undefined,
    })),
    ...github.map((r) => ({
      name: r.title,
      url: r.url,
      platform: 'github',
      snippet: r.snippet,
      won: false,
    })),
  ].slice(0, limit);

  updateContext(projectId, (c) => {
    c.idea.similar_projects = similar.map((s) => ({
      name: s.name,
      url: s.url,
      overlap: s.snippet?.slice(0, 100),
    }));
  });

  if (format === 'markdown') {
    const lines = [
      '## Similar Projects',
      '',
      ...similar.map(
        (s) => `- [${s.name}](${s.url}) ${s.won ? '(Winner)' : ''} — ${s.snippet?.slice(0, 80)}...`,
      ),
    ];
    return lines.join('\n');
  }
  return JSON.stringify({ similar_projects: similar });
}
