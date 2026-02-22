/**
 * hb_planner_generate_ticket_board — Generate full ticket board from project.
 */

import { getContext, updateContext } from '../../storage/context-store.js';
import type { ResponseFormat } from '../../utils/formatters.js';

export const name = 'hb_planner_generate_ticket_board';
export const description =
  'Generate a full ticket board from project description, tech stack, team roles, and hackathon deadline. Each ticket has title, description, acceptance criteria, estimate, owner, priority, dependencies.';

export const inputSchema = {
  type: 'object' as const,
  properties: {
    project_id: { type: 'string' },
    project_description: { type: 'string' },
    tech_stack: { type: 'array', items: { type: 'string' } },
    hours_remaining: { type: 'number', description: 'Hours until deadline' },
    response_format: { type: 'string', enum: ['json', 'markdown'] },
  },
  required: ['project_id'],
};

const DEFAULT_TICKETS = [
  { title: 'Project setup & boilerplate', category: 'infra', est: 2, deps: [] },
  { title: 'Core data model / API schema', category: 'backend', est: 3, deps: ['infra'] },
  { title: 'Main API endpoints', category: 'backend', est: 4, deps: ['schema'] },
  { title: 'Frontend shell & routing', category: 'frontend', est: 2, deps: ['infra'] },
  { title: 'Key UI screens', category: 'frontend', est: 6, deps: ['api'] },
  { title: 'Integration & polish', category: 'full', est: 4, deps: ['frontend', 'backend'] },
  { title: 'Demo prep & README', category: 'demo', est: 2, deps: ['integration'] },
];

export async function execute(args: Record<string, unknown>): Promise<string> {
  const projectId = args.project_id as string;
  const desc = (args.project_description as string) || '';
  const _techStack = (args.tech_stack as string[]) || [];
  const hoursRemaining = (args.hours_remaining as number) || 48;
  const format = (args.response_format as ResponseFormat) || 'markdown';

  const ctx = getContext(projectId);
  const projectDesc = desc || ctx.idea.description || 'Web application';
  const roles = ctx.team.members
    .map((m) => ({ github: m.github_profile, role: m.role_assignment }))
    .filter((r) => r.github);

  const tickets = DEFAULT_TICKETS.map((t, i) => {
    const owner = roles[i % roles.length]?.github || 'unassigned';
    return {
      id: `T${i + 1}`,
      title: t.title,
      description: `${t.title} for ${projectDesc.slice(0, 50)}...`,
      acceptance_criteria: [`${t.title} complete`, 'Tests pass'],
      estimate_hours: Math.min(t.est, Math.floor(hoursRemaining / 7)),
      owner,
      priority: i < 3 ? 'high' : i < 5 ? 'medium' : 'low',
      dependencies: t.deps
        .map((d) => `T${DEFAULT_TICKETS.findIndex((x) => x.category === d) + 1}`)
        .filter(Boolean),
      status: 'todo',
      risk_flag: false,
    };
  });

  updateContext(projectId, (c) => {
    c.build.tickets = tickets;
  });

  if (format === 'markdown') {
    const lines = [
      '## Ticket Board',
      '',
      ...tickets.map(
        (t) =>
          `- **${t.id}** ${t.title} | ${t.estimate_hours}h | ${t.owner} | ${t.priority}` +
          (t.dependencies.length ? ` | deps: ${t.dependencies.join(', ')}` : ''),
      ),
    ];
    return lines.join('\n');
  }
  return JSON.stringify({ tickets });
}
