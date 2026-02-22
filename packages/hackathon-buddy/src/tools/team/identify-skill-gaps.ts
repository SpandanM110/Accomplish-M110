/**
 * hb_team_identify_skill_gaps — Identify missing skills for the project.
 */

import { getContext, updateContext } from '../../storage/context-store.js';
import { getTopLanguages } from '../../integrations/github.js';
import type { ResponseFormat } from '../../utils/formatters.js';

export const name = 'hb_team_identify_skill_gaps';
export const description =
  'Given team skill maps and project description, return gaps: what skills are missing, how critical each is, and what to do (use template, simplify scope, or seek teammate).';

export const inputSchema = {
  type: 'object' as const,
  properties: {
    project_id: { type: 'string' },
    project_description: { type: 'string' },
    github_usernames: { type: 'array', items: { type: 'string' } },
    response_format: { type: 'string', enum: ['json', 'markdown'] },
  },
  required: ['project_id'],
};

export async function execute(args: Record<string, unknown>): Promise<string> {
  const projectId = args.project_id as string;
  const desc = ((args.project_description as string) || '').toLowerCase();
  const usernames = (args.github_usernames as string[]) || [];
  const format = (args.response_format as ResponseFormat) || 'markdown';

  const ctx = getContext(projectId);
  const members = usernames.length
    ? usernames
    : (ctx.team.members.map((m) => m.github_profile).filter(Boolean) as string[]);

  const allLangs: Record<string, number> = {};
  for (const u of members) {
    const langs = await getTopLanguages(u);
    for (const [k, v] of Object.entries(langs)) {
      allLangs[k] = (allLangs[k] || 0) + v;
    }
  }

  const teamLangs = new Set(Object.keys(allLangs).map((l) => l.toLowerCase()));
  const gaps: Array<{ skill: string; criticality: string; action: string }> = [];

  const checks: Array<{ keyword: string; skill: string; criticality: string }> = [
    { keyword: 'web', skill: 'JavaScript/TypeScript', criticality: 'high' },
    { keyword: 'api', skill: 'Backend (Node/Python)', criticality: 'high' },
    { keyword: 'ml', skill: 'Python/Machine Learning', criticality: 'high' },
    { keyword: 'mobile', skill: 'React Native/Flutter', criticality: 'high' },
    { keyword: 'blockchain', skill: 'Solidity/Web3', criticality: 'high' },
    { keyword: 'database', skill: 'SQL/NoSQL', criticality: 'medium' },
    { keyword: 'devops', skill: 'Docker/CI', criticality: 'medium' },
  ];

  for (const { keyword, skill, criticality } of checks) {
    if (desc.includes(keyword)) {
      const hasSkill =
        teamLangs.has('javascript') || teamLangs.has('typescript') || teamLangs.has('python');
      if (!hasSkill && (skill.includes('JavaScript') || skill.includes('Python'))) {
        gaps.push({
          skill,
          criticality,
          action:
            criticality === 'high'
              ? 'Use a template or seek teammate'
              : 'Simplify scope or use no-code tools',
        });
      } else if (!hasSkill) {
        gaps.push({ skill, criticality, action: 'Consider using templates or reducing scope' });
      }
    }
  }

  updateContext(projectId, (c) => {
    c.team.skill_gaps = gaps.map((g) => g.skill);
  });

  if (format === 'markdown') {
    const lines = [
      '## Skill Gaps',
      '',
      ...gaps.map((g) => `- **${g.skill}** (${g.criticality}): ${g.action}`),
    ];
    return gaps.length ? lines.join('\n') : 'No critical skill gaps identified.';
  }
  return JSON.stringify({ gaps, team_languages: [...teamLangs] });
}
