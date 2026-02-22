/**
 * hb_validator_validate_idea — Web research sweep for idea validation.
 */

import { getContext, updateContext } from '../../storage/context-store.js';
import { webSearch } from '../../integrations/web-search.js';
import type { ResponseFormat } from '../../utils/formatters.js';

export const name = 'hb_validator_validate_idea';
export const description =
  'Validate a project idea against the competitive landscape. Runs web research: existing products, market signals, similar failed ideas. Returns a validation brief, not pass/fail.';

export const inputSchema = {
  type: 'object' as const,
  properties: {
    project_id: { type: 'string' },
    idea_description: { type: 'string' },
    hackathon_id: { type: 'string' },
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
    return JSON.stringify({
      error: 'idea_description required',
      suggestion: 'Provide a project description.',
    });
  }

  const keywords = desc
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .slice(0, 5)
    .join(' ');
  const [competing, market, failed] = await Promise.all([
    webSearch(`${keywords} product app`, { num: 5 }),
    webSearch(`${keywords} market 2024 2025`, { num: 3 }),
    webSearch(`${keywords} failed startup why`, { num: 3 }),
  ]);

  const brief = {
    competing_products: competing.map((r) => ({ title: r.title, url: r.url, snippet: r.snippet })),
    market_signals: market.map((r) => ({ title: r.title, snippet: r.snippet })),
    failure_patterns: failed.map((r) => ({ title: r.title, snippet: r.snippet })),
    summary: `Found ${competing.length} competing products, ${market.length} market signals, ${failed.length} failure analyses.`,
  };

  updateContext(projectId, (c) => {
    c.idea.description = desc;
    c.idea.validation_brief = brief.summary;
  });

  if (format === 'markdown') {
    const lines = [
      '## Validation Brief',
      '',
      brief.summary,
      '',
      '### Competing Products',
      ...competing.map((r) => `- [${r.title}](${r.url}) — ${r.snippet?.slice(0, 100)}...`),
      '',
      '### Market Signals',
      ...market.map((r) => `- ${r.title}: ${r.snippet?.slice(0, 150)}...`),
    ];
    return lines.join('\n');
  }
  return JSON.stringify(brief);
}
