/**
 * hb_pitch_optimize_submission — Optimize Devpost submission.
 */

import { getContext } from '../../storage/context-store.js';
import type { ResponseFormat } from '../../utils/formatters.js';

export const name = 'hb_pitch_optimize_submission';
export const description =
  'Optimize Devpost submission: title, tagline, description, built-with, demo link, try-it. Return optimized fields and SEO tips.';

export const inputSchema = {
  type: 'object' as const,
  properties: {
    project_id: { type: 'string' },
    current_title: { type: 'string' },
    current_description: { type: 'string' },
    response_format: { type: 'string', enum: ['json', 'markdown'] },
  },
  required: ['project_id'],
};

export async function execute(args: Record<string, unknown>): Promise<string> {
  const projectId = args.project_id as string;
  const title = (args.current_title as string) || '';
  const desc = (args.current_description as string) || '';
  const format = (args.response_format as ResponseFormat) || 'markdown';

  const ctx = getContext(projectId);
  const idea = ctx.idea.description || desc || 'Our hackathon project';
  const stack = ctx.team.recommended_stack || {};
  const techList = Object.keys(stack).join(', ') || 'React, Node.js';

  const optimized = {
    title: title || idea.slice(0, 50).replace(/\.$/, ''),
    tagline: idea.slice(0, 80) + (idea.length > 80 ? '...' : ''),
    description: `## The Problem\n\n${ctx.idea.problem_statement || idea}\n\n## Our Solution\n\n${ctx.idea.proposed_solution || idea}\n\n## Built With\n\n${techList}`,
    built_with: techList,
    demo_link: 'Add your demo URL',
    try_it: 'Add your live app or video URL',
    seo_tips: [
      'Include hackathon name in title',
      'Use sponsor tech in built-with',
      'Add clear CTA in description',
    ],
  };

  if (format === 'markdown') {
    const lines = [
      '## Optimized Devpost Submission',
      '',
      '**Title:** ' + optimized.title,
      '**Tagline:** ' + optimized.tagline,
      '',
      '**Built With:** ' + optimized.built_with,
      '**Demo Link:** ' + optimized.demo_link,
      '**Try It:** ' + optimized.try_it,
      '',
      '### SEO Tips',
      ...optimized.seo_tips.map((t) => `- ${t}`),
    ];
    return lines.join('\n');
  }
  return JSON.stringify(optimized);
}
