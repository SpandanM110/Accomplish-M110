/**
 * hb_planner_trigger_panic_mode — Minimum viable pivot plan.
 */

import type { ResponseFormat } from '../../utils/formatters.js';

export const name = 'hb_planner_trigger_panic_mode';
export const description =
  'Given what works, what is broken, and hours remaining, return a minimum viable pivot plan: simplest version reusing existing work, hour-by-hour plan, rallying message.';

export const inputSchema = {
  type: 'object' as const,
  properties: {
    what_works: { type: 'string', description: 'What is already built and working' },
    what_broken: { type: 'string', description: 'What is broken or blocked' },
    hours_remaining: { type: 'number', description: 'Hours until deadline' },
    response_format: { type: 'string', enum: ['json', 'markdown'] },
  },
  required: ['what_works', 'what_broken', 'hours_remaining'],
};

export async function execute(args: Record<string, unknown>): Promise<string> {
  const works = (args.what_works as string) || '';
  const _broken = (args.what_broken as string) || '';
  const hours = (args.hours_remaining as number) || 6;
  const format = (args.response_format as ResponseFormat) || 'markdown';

  const plan = [
    { hour: 0, action: 'Stop. Breathe. Assess what can be demoed.' },
    { hour: 1, action: 'Strip to core: one user flow that works end-to-end.' },
    { hour: 2, action: 'Fix or remove the broken parts. Mock data if needed.' },
    { hour: 3, action: 'Polish the one flow. Make it look intentional.' },
    { hour: 4, action: 'Record demo. Practice 2-min pitch.' },
    { hour: 5, action: 'Write README. Submit.' },
  ].slice(0, Math.min(hours, 6));

  const rally = `You've got ${hours} hours. Focus on what works: "${works.slice(0, 50)}...". Cut everything else. Ship something.`;

  if (format === 'markdown') {
    const lines = [
      '## Panic Mode Plan',
      '',
      rally,
      '',
      '### Hour-by-hour',
      ...plan.map((p) => `- **Hour ${p.hour}:** ${p.action}`),
    ];
    return lines.join('\n');
  }
  return JSON.stringify({ plan, rally });
}
