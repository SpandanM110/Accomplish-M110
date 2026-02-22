/**
 * hb_continuity_generate_dignity_archive — Archive package for teams that stop.
 */

import { getContext, updateContext } from '../../storage/context-store.js';
import type { ResponseFormat } from '../../utils/formatters.js';

export const name = 'hb_continuity_generate_dignity_archive';
export const description =
  "For teams that decide not to continue: generate clean archive: code summary, lessons learned (what worked/didn't), inventory of reusable components.";

export const inputSchema = {
  type: 'object' as const,
  properties: {
    project_id: { type: 'string' },
    what_worked: { type: 'string' },
    what_didnt: { type: 'string' },
    response_format: { type: 'string', enum: ['json', 'markdown'] },
  },
  required: ['project_id'],
};

export async function execute(args: Record<string, unknown>): Promise<string> {
  const projectId = args.project_id as string;
  const worked = (args.what_worked as string) || '';
  const didnt = (args.what_didnt as string) || '';
  const format = (args.response_format as ResponseFormat) || 'markdown';

  const ctx = getContext(projectId);
  const tickets = ctx.build.tickets || [];
  const completed = tickets.filter((t) => t.status === 'done');
  const components = ['UI components', 'API routes', 'Data models', 'Auth flow'].filter(
    (_, i) => completed.length > i,
  );

  const archive = {
    code_summary: `Project had ${tickets.length} tickets, ${completed.length} completed. Key modules: ${components.join(', ')}.`,
    lessons_learned: {
      what_worked: worked || 'Team collaboration, scope discipline',
      what_didnt: didnt || 'Time estimation, scope creep',
    },
    reusable_components: components.map((c) => ({
      type: c,
      location: 'TBD',
      notes: 'Extract before archive',
    })),
  };

  updateContext(projectId, (c) => {
    c.outputs.dignity_archive = archive;
  });

  if (format === 'markdown') {
    const lines = [
      '## Dignity Archive',
      '',
      '### Code Summary',
      archive.code_summary,
      '',
      '### Lessons Learned',
      `**What worked:** ${archive.lessons_learned.what_worked}`,
      `**What didn't:** ${archive.lessons_learned.what_didnt}`,
      '',
      '### Reusable Components',
      ...archive.reusable_components.map((r) => `- ${r.type}: ${r.notes}`),
    ];
    return lines.join('\n');
  }
  return JSON.stringify(archive);
}
