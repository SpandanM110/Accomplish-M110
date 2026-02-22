/**
 * hb_continuity_generate_readme — Generate polished GitHub README.
 */

import { getContext, updateContext } from '../../storage/context-store.js';
import type { ResponseFormat } from '../../utils/formatters.js';

export const name = 'hb_continuity_generate_readme';
export const description =
  "Generate a polished GitHub README from ProjectContext: name, tagline, problem, solution, tech stack, setup, team, demo link, what's next.";

export const inputSchema = {
  type: 'object' as const,
  properties: {
    project_id: { type: 'string' },
    project_name: { type: 'string' },
    demo_url: { type: 'string' },
    response_format: { type: 'string', enum: ['json', 'markdown'] },
  },
  required: ['project_id'],
};

export async function execute(args: Record<string, unknown>): Promise<string> {
  const projectId = args.project_id as string;
  const name = (args.project_name as string) || 'Our Project';
  const demoUrl = (args.demo_url as string) || '';
  const format = (args.response_format as ResponseFormat) || 'markdown';

  const ctx = getContext(projectId);
  const idea = ctx.idea.description || 'A hackathon project';
  const stack = ctx.team.recommended_stack || {};
  const team = ctx.team.members
    .map((m) => m.github_profile)
    .filter(Boolean)
    .join(', ');
  const incomplete = (ctx.build.tickets || []).filter((t) => t.status !== 'done').slice(0, 3);

  const readme = `# ${name}

> ${idea.slice(0, 100)}...

## Problem

${ctx.idea.problem_statement || idea}

## Solution

${ctx.idea.proposed_solution || 'See demo.'}

## Tech Stack

${
  Object.entries(stack)
    .map(([k, v]) => `- **${k}:** ${v}`)
    .join('\n') || '- TBD'
}

## Setup

\`\`\`bash
npm install
npm run dev
\`\`\`

## Team

${team || 'Add your names'}

## Demo

${demoUrl ? `[Live Demo](${demoUrl})` : 'Add demo link'}

## What's Next

${incomplete.map((t) => `- [ ] ${t.title}`).join('\n') || '- Polish & deploy'}`;

  updateContext(projectId, (c) => {
    c.outputs.readme_content = readme;
  });

  if (format === 'markdown') return readme;
  return JSON.stringify({ readme });
}
