/**
 * hb_pitch_generate_slide_structure — First-pass slide structure.
 */

import { getContext } from '../../storage/context-store.js';
import type { ResponseFormat } from '../../utils/formatters.js';

export const name = 'hb_pitch_generate_slide_structure';
export const description =
  'Return slide structure pre-filled with project details: problem (with data), solution, demo placeholder, tech stack, team, ask.';

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
  const idea = ctx.idea.description || 'Our solution';
  const team = ctx.team.members.map((m) => m.github_profile || 'Member').join(', ');

  const slides = [
    { title: 'Problem', content: idea.slice(0, 100) + '...' },
    { title: 'Solution', content: 'Live demo' },
    {
      title: 'Tech Stack',
      content: Object.keys(ctx.team.recommended_stack || {}).join(', ') || 'TBD',
    },
    { title: 'Team', content: team },
    { title: 'The Ask', content: 'Feedback, connections, next steps' },
  ];

  if (format === 'markdown') {
    const lines = [
      '## Slide Structure',
      '',
      ...slides.map((s, i) => `### Slide ${i + 1}: ${s.title}\n${s.content}`),
    ];
    return lines.join('\n\n');
  }
  return JSON.stringify({ slides });
}
