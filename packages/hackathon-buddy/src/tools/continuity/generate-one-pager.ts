/**
 * hb_continuity_generate_one_pager — One-pager for investors/partners.
 */

import { getContext, updateContext } from '../../storage/context-store.js';
import type { ResponseFormat } from '../../utils/formatters.js';

export const name = 'hb_continuity_generate_one_pager';
export const description =
  'Generate a one-pager for investors/partners: problem, solution, traction, team, ask. Fits on one page.';

export const inputSchema = {
  type: 'object' as const,
  properties: {
    project_id: { type: 'string' },
    traction_notes: { type: 'string' },
    ask: { type: 'string' },
    response_format: { type: 'string', enum: ['json', 'markdown'] },
  },
  required: ['project_id'],
};

export async function execute(args: Record<string, unknown>): Promise<string> {
  const projectId = args.project_id as string;
  const traction = (args.traction_notes as string) || 'Built in 48h at hackathon';
  const ask = (args.ask as string) || 'Feedback and connections';
  const format = (args.response_format as ResponseFormat) || 'markdown';

  const ctx = getContext(projectId);
  const team = ctx.team.members
    .map((m) => m.github_profile || m.role_assignment)
    .filter(Boolean)
    .join(', ');

  const onePager = `# One-Pager

## Problem
${ctx.idea.problem_statement || ctx.idea.description || 'TBD'}

## Solution
${ctx.idea.proposed_solution || ctx.idea.description || 'TBD'}

## Traction
${traction}

## Team
${team || 'Add names'}

## The Ask
${ask}`;

  updateContext(projectId, (c) => {
    c.outputs.one_pager_content = onePager;
  });

  if (format === 'markdown') return onePager;
  return JSON.stringify({ one_pager: onePager });
}
