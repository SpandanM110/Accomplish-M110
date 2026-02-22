/**
 * hb_continuity_generate_sprint_board — 30-day post-hackathon sprint.
 */

import { getContext, updateContext } from '../../storage/context-store.js';
import type { ResponseFormat } from '../../utils/formatters.js';

export const name = 'hb_continuity_generate_sprint_board';
export const description =
  'Generate 30-day post-hackathon sprint board. Incomplete hackathon tickets become Week 1 backlog. New tickets: Week 1 cleanup, Week 2 user research, Week 3 first user, Week 4 decision point.';

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
  const incomplete = (ctx.build.tickets || []).filter((t) => t.status !== 'done');

  const sprint = [
    {
      week: 1,
      theme: 'Cleanup & Deploy',
      tickets: [...incomplete.map((t) => t.title), 'Deploy to production', 'Fix critical bugs'],
    },
    {
      week: 2,
      theme: 'User Research',
      tickets: ['Define target user', 'Interview 5 users', 'Synthesize feedback'],
    },
    {
      week: 3,
      theme: 'First Real User',
      tickets: ['Onboard first user', 'Collect usage data', 'Iterate on UX'],
    },
    {
      week: 4,
      theme: 'Decision Point',
      tickets: ['Review metrics', 'Decide: continue or archive', 'Document learnings'],
    },
  ];

  updateContext(projectId, (c) => {
    c.outputs.sprint_board = sprint;
  });

  if (format === 'markdown') {
    const lines = [
      '## 30-Day Sprint Board',
      '',
      ...sprint.map(
        (s) => `### Week ${s.week}: ${s.theme}\n${s.tickets.map((t) => `- [ ] ${t}`).join('\n')}`,
      ),
    ];
    return lines.join('\n\n');
  }
  return JSON.stringify({ sprint });
}
