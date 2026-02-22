/**
 * hb_planner_flag_risk_tickets — Flag tickets on critical path with skill gaps.
 */

import { getContext } from '../../storage/context-store.js';
import { getTopLanguages } from '../../integrations/github.js';
import type { ResponseFormat } from '../../utils/formatters.js';

export const name = 'hb_planner_flag_risk_tickets';
export const description =
  'Analyze ticket board against team skill maps. Flag tickets on critical path where assigned owner has limited relevant GitHub history. Returns risk report with mitigations.';

export const inputSchema = {
  type: 'object' as const,
  properties: {
    project_id: { type: 'string' },
    response_format: { type: 'string', enum: ['json', 'markdown'] },
  },
  required: ['project_id'],
};

export async function execute(args: Record<string, unknown>): Promise<string> {
  const projectId = args.project_id as string;
  const format = (args.response_format as ResponseFormat) || 'markdown';

  const ctx = getContext(projectId);
  const tickets = ctx.build.tickets || [];
  const risks: Array<{
    ticket_id: string;
    title: string;
    owner: string;
    risk: string;
    mitigation: string;
  }> = [];

  for (const t of tickets.slice(0, 5)) {
    if (!t.owner || t.owner === 'unassigned') continue;
    const langs = await getTopLanguages(t.owner);
    const hasJs = 'JavaScript' in langs || 'TypeScript' in langs;
    const hasPy = 'Python' in langs;
    const category = (t.title || '').toLowerCase();
    const needsJs =
      category.includes('frontend') || category.includes('api') || category.includes('web');
    const needsPy = category.includes('ml') || category.includes('data');

    if (needsJs && !hasJs) {
      risks.push({
        ticket_id: t.id,
        title: t.title,
        owner: t.owner,
        risk: 'Limited JS/TS experience',
        mitigation: 'Pair with teammate or use template',
      });
    }
    if (needsPy && !hasPy) {
      risks.push({
        ticket_id: t.id,
        title: t.title,
        owner: t.owner,
        risk: 'Limited Python experience',
        mitigation: 'Simplify scope or use no-code ML',
      });
    }
  }

  if (format === 'markdown') {
    const lines = [
      '## Risk Report',
      '',
      ...risks.map((r) => `- **${r.ticket_id}** (${r.owner}): ${r.risk} → ${r.mitigation}`),
    ];
    return risks.length ? lines.join('\n') : 'No high-risk tickets flagged.';
  }
  return JSON.stringify({ risks });
}
