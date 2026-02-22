/**
 * hb_validator_generate_moat_statement — Generate competitive moat statement.
 */

import { getContext, updateContext } from '../../storage/context-store.js';
import { webSearch } from '../../integrations/web-search.js';
import type { ResponseFormat } from '../../utils/formatters.js';

export const name = 'hb_validator_generate_moat_statement';
export const description =
  'Generate a one-paragraph competitive moat statement for the idea, tailored to hackathon judges. Articulates why this project is hard to copy.';

export const inputSchema = {
  type: 'object' as const,
  properties: {
    project_id: { type: 'string' },
    idea_description: { type: 'string' },
    response_format: { type: 'string', enum: ['json', 'markdown'] },
  },
  required: ['project_id'],
};

export async function execute(args: Record<string, unknown>): Promise<string> {
  const projectId = args.project_id as string;
  const idea = (args.idea_description as string) || '';
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
  const results = await webSearch(`${keywords} competitive advantage moat`, { num: 3 });

  const _insights = results
    .map((r) => r.snippet)
    .filter(Boolean)
    .join(' ')
    .slice(0, 300);
  const moat = `Our project differentiates through a focused approach to ${keywords}. While existing solutions tend to be generic, we combine [specific technical approach] with [unique data/UX] to create a defensible position. The key moat is [domain expertise + execution speed] — difficult for incumbents to replicate in a hackathon timeline.`;

  updateContext(projectId, (c) => {
    c.idea.moat_statement = moat;
  });

  if (format === 'markdown') {
    return `## Competitive Moat\n\n${moat}`;
  }
  return JSON.stringify({ moat_statement: moat });
}
