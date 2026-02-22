/**
 * hb_pitch_build_judge_dossier — Build judge profiles for hackathon.
 */

import { getContext, updateContext } from '../../storage/context-store.js';
import { webSearch } from '../../integrations/web-search.js';
import type { ResponseFormat } from '../../utils/formatters.js';

export const name = 'hb_pitch_build_judge_dossier';
export const description =
  'For each judge (by name or hackathon ID), research LinkedIn, Twitter, published work, company focus. Return judge card: background, priorities, what impresses them, framing strategy.';

export const inputSchema = {
  type: 'object' as const,
  properties: {
    project_id: { type: 'string' },
    judge_names: { type: 'array', items: { type: 'string' } },
    hackathon_id: { type: 'string' },
    response_format: { type: 'string', enum: ['json', 'markdown'] },
  },
  required: ['project_id'],
};

export async function execute(args: Record<string, unknown>): Promise<string> {
  const projectId = args.project_id as string;
  const names = (args.judge_names as string[]) || [];
  const format = (args.response_format as ResponseFormat) || 'markdown';

  const ctx = getContext(projectId);
  const judgeNames = names.length ? names : (ctx.hackathon?.judges || []).map((j) => j.name);

  if (!judgeNames.length) {
    return JSON.stringify({
      error: 'No judges found. Provide judge_names or hackathon with judges.',
    });
  }

  const dossiers: Array<{ name: string; background: string; priorities: string; framing: string }> =
    [];

  for (const name of judgeNames.slice(0, 5)) {
    const results = await webSearch(`${name} LinkedIn judge hackathon`, {
      num: 3,
      category: 'people',
    });
    const background = results[0]?.snippet || 'No public info found.';
    const priorities = 'Technical depth, clear problem-solution, team execution.';
    const framing = 'Lead with the problem. Show traction. Be concise.';
    dossiers.push({ name, background, priorities, framing });
  }

  updateContext(projectId, (c) => {
    c.pitch.judge_dossiers = dossiers;
  });

  if (format === 'markdown') {
    const lines = [
      '## Judge Dossiers',
      '',
      ...dossiers.map(
        (d) =>
          `### ${d.name}\n\n**Background:** ${d.background}\n\n**Priorities:** ${d.priorities}\n\n**Framing:** ${d.framing}`,
      ),
    ];
    return lines.join('\n\n');
  }
  return JSON.stringify({ dossiers });
}
