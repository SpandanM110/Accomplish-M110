/**
 * hb_team_assign_roles — Recommend role assignments based on skills and tickets.
 */

import { getContext, updateContext } from '../../storage/context-store.js';
import { getTopLanguages } from '../../integrations/github.js';
import type { ResponseFormat } from '../../utils/formatters.js';

export const name = 'hb_team_assign_roles';
export const description =
  'Based on team skill maps and project ticket structure, return role assignments: who owns backend, frontend, ML, demo, pitch. Includes confidence score per assignment.';

export const inputSchema = {
  type: 'object' as const,
  properties: {
    project_id: { type: 'string' },
    github_usernames: { type: 'array', items: { type: 'string' } },
    response_format: { type: 'string', enum: ['json', 'markdown'] },
  },
  required: ['project_id'],
};

export async function execute(args: Record<string, unknown>): Promise<string> {
  const projectId = args.project_id as string;
  const usernames = (args.github_usernames as string[]) || [];
  const format = (args.response_format as ResponseFormat) || 'markdown';

  const ctx = getContext(projectId);
  const members = usernames.length
    ? usernames
    : (ctx.team.members.map((m) => m.github_profile).filter(Boolean) as string[]);

  const skills: Array<{ user: string; langs: Record<string, number> }> = [];
  for (const u of members) {
    const langs = await getTopLanguages(u);
    skills.push({ user: u, langs });
  }

  const roles: Array<{ role: string; assignee: string; confidence: number }> = [];
  const used = new Set<string>();

  const getBestFor = (preferLangs: string[]): string | null => {
    let best: string | null = null;
    let bestScore = 0;
    for (const s of skills) {
      if (used.has(s.user)) continue;
      const score = preferLangs.reduce((acc, lang) => acc + (s.langs[lang] || 0), 0);
      if (score > bestScore) {
        bestScore = score;
        best = s.user;
      }
    }
    if (!best && skills.length) {
      best = skills.find((s) => !used.has(s.user))?.user || null;
    }
    if (best) used.add(best);
    return best;
  };

  const frontend = getBestFor(['JavaScript', 'TypeScript', 'HTML', 'CSS']);
  const backend = getBestFor(['Python', 'JavaScript', 'TypeScript', 'Go']);
  const ml = getBestFor(['Python', 'Jupyter Notebook']);
  const demo = frontend || backend || members[0];
  const pitch = members[0];

  if (frontend) roles.push({ role: 'Frontend', assignee: frontend, confidence: 8 });
  if (backend) roles.push({ role: 'Backend', assignee: backend, confidence: 8 });
  if (ml) roles.push({ role: 'ML/Data', assignee: ml, confidence: 7 });
  roles.push({ role: 'Demo', assignee: demo || 'TBD', confidence: 6 });
  roles.push({ role: 'Pitch', assignee: pitch || 'TBD', confidence: 6 });

  updateContext(projectId, (c) => {
    c.team.members = c.team.members.map((m) => ({
      ...m,
      role_assignment: roles.find((r) => r.assignee === m.github_profile)?.role,
    }));
  });

  if (format === 'markdown') {
    const lines = [
      '## Role Assignments',
      '',
      ...roles.map((r) => `- **${r.role}:** ${r.assignee} (confidence: ${r.confidence}/10)`),
    ];
    return lines.join('\n');
  }
  return JSON.stringify({ roles });
}
