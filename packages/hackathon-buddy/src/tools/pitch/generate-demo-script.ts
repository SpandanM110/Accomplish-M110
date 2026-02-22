/**
 * hb_pitch_generate_demo_script — Generate 2-min demo script.
 */

import { getContext, updateContext } from '../../storage/context-store.js';
import type { ResponseFormat } from '../../utils/formatters.js';

export const name = 'hb_pitch_generate_demo_script';
export const description =
  'Generate a 2-minute demo script: hook in first 15 seconds, problem-solution arc, tech credibility moment, closing. Tailored to judging panel.';

export const inputSchema = {
  type: 'object' as const,
  properties: {
    project_id: { type: 'string' },
    project_description: { type: 'string' },
    prize_category: { type: 'string' },
    response_format: { type: 'string', enum: ['json', 'markdown'] },
  },
  required: ['project_id'],
};

export async function execute(args: Record<string, unknown>): Promise<string> {
  const projectId = args.project_id as string;
  const desc = (args.project_description as string) || '';
  const prize = (args.prize_category as string) || 'General';
  const format = (args.response_format as ResponseFormat) || 'markdown';

  const ctx = getContext(projectId);
  const projectDesc = desc || ctx.idea.description || 'Our project';

  const script = `## 2-Minute Demo Script

**0:00-0:15 — Hook**
"Imagine [pain point]. We built [project name] to fix that."

**0:15-0:45 — Problem**
"${projectDesc.slice(0, 80)}${projectDesc.length > 80 ? '...' : ''} Today, [current state]. We saw an opportunity."

**0:45-1:15 — Solution**
"Here's how it works. [Live demo]. [Key feature 1]. [Key feature 2]."

**1:15-1:45 — Tech credibility**
"We used [tech stack]. [One technical highlight]. This is what makes it scalable."

**1:45-2:00 — Close**
"We're built for ${prize}. Try it at [demo URL]. Thank you."`;

  updateContext(projectId, (c) => {
    c.pitch.demo_script = script;
  });

  if (format === 'markdown') return script;
  return JSON.stringify({ demo_script: script });
}
