/**
 * hb_pitch_simulate_judge_qa — Simulate judge Q&A.
 */

import { getContext } from '../../storage/context-store.js';
import type { ResponseFormat } from '../../utils/formatters.js';

export const name = 'hb_pitch_simulate_judge_qa';
export const description =
  'Simulate judge Q&A. Given project context, return 5 likely questions and suggested answers. Optionally include judge-specific angles from dossiers.';

export const inputSchema = {
  type: 'object' as const,
  properties: {
    project_id: { type: 'string' },
    num_questions: { type: 'number' },
    response_format: { type: 'string', enum: ['json', 'markdown'] },
  },
  required: ['project_id'],
};

const DEFAULT_QUESTIONS = [
  {
    q: 'How does this differ from existing solutions?',
    a: 'Focus on your unique angle and defensibility.',
  },
  {
    q: 'What is your business model?',
    a: 'Even for hackathons, show you thought about sustainability.',
  },
  {
    q: 'How did you build this in 48 hours?',
    a: 'Highlight tech choices and team division of labor.',
  },
  { q: 'What would you do with more time?', a: 'Prioritize 2–3 concrete next steps.' },
  { q: 'Who is your target user?', a: 'Be specific. One persona is better than "everyone."' },
];

export async function execute(args: Record<string, unknown>): Promise<string> {
  const projectId = args.project_id as string;
  const num = Math.min((args.num_questions as number) || 5, 10);
  const format = (args.response_format as ResponseFormat) || 'markdown';

  const ctx = getContext(projectId);
  const idea = ctx.idea.description || 'Our project';
  const stack = Object.keys(ctx.team.recommended_stack || {}).join(', ') || 'TBD';

  const qa = DEFAULT_QUESTIONS.slice(0, num).map((item) => ({
    question: item.q,
    suggested_answer: item.a
      .replace('Focus on', `For "${idea.slice(0, 50)}...", focus on`)
      .replace('Highlight', `We used ${stack}. Highlight`),
  }));

  if (format === 'markdown') {
    const lines = [
      '## Judge Q&A Prep',
      '',
      ...qa.map((x) => `**Q:** ${x.question}\n\n**A:** ${x.suggested_answer}`),
    ];
    return lines.join('\n\n');
  }
  return JSON.stringify({ qa });
}
