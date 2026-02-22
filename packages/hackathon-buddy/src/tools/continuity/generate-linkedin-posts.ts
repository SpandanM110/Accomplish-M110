/**
 * hb_continuity_generate_linkedin_posts — Three LinkedIn post variants.
 */

import { getContext, updateContext } from '../../storage/context-store.js';
import type { ResponseFormat } from '../../utils/formatters.js';

export const name = 'hb_continuity_generate_linkedin_posts';
export const description =
  'Generate three LinkedIn post variants: celebratory, technical deep-dive, founder-mode. Each with suggested hashtags.';

export const inputSchema = {
  type: 'object' as const,
  properties: {
    project_id: { type: 'string' },
    project_name: { type: 'string' },
    hackathon_name: { type: 'string' },
    response_format: { type: 'string', enum: ['json', 'markdown'] },
  },
  required: ['project_id'],
};

export async function execute(args: Record<string, unknown>): Promise<string> {
  const projectId = args.project_id as string;
  const name = (args.project_name as string) || 'Our project';
  const hackathon = (args.hackathon_name as string) || 'the hackathon';
  const format = (args.response_format as ResponseFormat) || 'markdown';

  const ctx = getContext(projectId);
  const idea = ctx.idea.description || 'Building something cool';

  const posts = {
    celebratory: `Just shipped ${name} at ${hackathon}! 🎉\n\n${idea.slice(0, 150)}...\n\nGrateful to my team. More to come.\n\n#Hackathon #BuildInPublic #Tech`,
    technical: `How we built ${name}:\n\n${idea.slice(0, 100)}...\n\nTech stack: ${Object.keys(ctx.team.recommended_stack || {}).join(', ') || 'TBD'}\n\nThread on what we learned. 🧵\n\n#WebDev #OpenSource #Engineering`,
    founder: `We built ${name} in 48 hours. Now we're deciding: continue or archive?\n\n${idea.slice(0, 120)}...\n\nIf you're building in this space, let's connect.\n\n#Startup #Hackathon #Founder`,
  };

  updateContext(projectId, (c) => {
    c.outputs.linkedin_posts = posts;
  });

  if (format === 'markdown') {
    const lines = [
      '## Celebratory',
      posts.celebratory,
      '',
      '## Technical',
      posts.technical,
      '',
      '## Founder',
      posts.founder,
    ];
    return lines.join('\n\n');
  }
  return JSON.stringify(posts);
}
