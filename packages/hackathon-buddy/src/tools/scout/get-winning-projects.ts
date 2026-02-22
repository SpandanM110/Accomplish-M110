/**
 * hb_scout_get_winning_projects — Fetch historical winning projects from a hackathon.
 */

import { getWinningProjects } from '../../integrations/devpost.js';
import type { ResponseFormat } from '../../utils/formatters.js';

export const name = 'hb_scout_get_winning_projects';
export const description =
  'Fetches historical winning projects from a given hackathon (by name or URL). Returns project names, descriptions, tech stacks, demo links. Used for "What Would a Winner Do?" analysis.';

export const inputSchema = {
  type: 'object' as const,
  properties: {
    hackathon_url: { type: 'string', description: 'Hackathon URL or name' },
    limit: { type: 'number', description: 'Max projects to return (default 20)' },
    response_format: { type: 'string', enum: ['json', 'markdown'] },
  },
};

export async function execute(args: Record<string, unknown>): Promise<string> {
  const url = args.hackathon_url as string;
  const limit = Math.min((args.limit as number) || 20, 50);
  const format = (args.response_format as ResponseFormat) || 'markdown';

  if (!url) {
    return JSON.stringify({
      error: 'hackathon_url required',
      suggestion: 'Provide the Devpost hackathon page URL.',
    });
  }

  try {
    const projects = await getWinningProjects(url);
    const slice = projects.slice(0, limit);

    if (format === 'markdown') {
      const lines = [
        `## Winning Projects (${slice.length} shown)`,
        '',
        ...slice.map((p) => {
          const stack = p.built_with?.length ? ` | ${p.built_with.join(', ')}` : '';
          return (
            `- **${p.name}** — ${p.description || 'No description'}` +
            (p.url ? ` [Demo](${p.url})` : '') +
            stack
          );
        }),
      ];
      return lines.join('\n');
    }

    return JSON.stringify({
      projects: slice,
      total: projects.length,
    });
  } catch (err) {
    return JSON.stringify({
      error: err instanceof Error ? err.message : String(err),
      suggestion: 'Verify the hackathon URL. Try the main hackathon page, not a submission link.',
    });
  }
}
