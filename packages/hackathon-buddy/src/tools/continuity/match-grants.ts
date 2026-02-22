/**
 * hb_continuity_match_grants — Match grants/accelerators for project.
 */

import { webSearch } from '../../integrations/web-search.js';
import type { ResponseFormat } from '../../utils/formatters.js';

export const name = 'hb_continuity_match_grants';
export const description =
  'Given project domain and description, return five matched opportunities: grants, accelerators, open-source programs. Ranked by relevance with deadline and URL.';

export const inputSchema = {
  type: 'object' as const,
  properties: {
    project_domain: { type: 'string' },
    project_description: { type: 'string' },
    response_format: { type: 'string', enum: ['json', 'markdown'] },
  },
};

export async function execute(args: Record<string, unknown>): Promise<string> {
  const domain = (args.project_domain as string) || '';
  const desc = (args.project_description as string) || '';
  const format = (args.response_format as ResponseFormat) || 'markdown';

  const query = `${domain} ${desc} grant accelerator 2025`.slice(0, 80);
  const results = await webSearch(query, { num: 8 });

  const grants = results.slice(0, 5).map((r) => ({
    name: r.title,
    url: r.url,
    snippet: r.snippet,
    match_rationale: `Relevant to project domain`,
    deadline: 'Check website',
  }));

  if (format === 'markdown') {
    const lines = [
      '## Matched Opportunities',
      '',
      ...grants.map((g) => `- [${g.name}](${g.url}) — ${g.snippet?.slice(0, 80)}...`),
    ];
    return lines.join('\n');
  }
  return JSON.stringify({ grants });
}
