/**
 * hb_team_recommend_stack — Recommend tech stack based on team skills and project.
 */

import { getContext } from '../../storage/context-store.js';
import { getTopLanguages } from '../../integrations/github.js';
import type { ResponseFormat } from '../../utils/formatters.js';

export const name = 'hb_team_recommend_stack';
export const description =
  'Given GitHub usernames and project description, recommend a tech stack (frameworks, not just languages) that the team can execute. Includes rationale and flags for limited experience.';

export const inputSchema = {
  type: 'object' as const,
  properties: {
    project_id: { type: 'string', description: 'Project ID' },
    github_usernames: {
      type: 'array',
      items: { type: 'string' },
      description: 'List of GitHub usernames',
    },
    project_description: { type: 'string', description: 'Project description' },
    response_format: { type: 'string', enum: ['json', 'markdown'] },
  },
  required: ['project_id'],
};

const _STACK_MAP: Record<string, string[]> = {
  javascript: ['React', 'Next.js', 'Node.js', 'Express'],
  typescript: ['React', 'Next.js', 'Node.js', 'Express'],
  python: ['FastAPI', 'Django', 'Flask', 'PyTorch'],
  java: ['Spring Boot', 'Android'],
  go: ['Gin', 'Echo', 'Fiber'],
  rust: ['Actix', 'Rocket'],
  cpp: ['Qt', 'CMake'],
};

export async function execute(args: Record<string, unknown>): Promise<string> {
  const projectId = args.project_id as string;
  const usernames = (args.github_usernames as string[]) || [];
  const desc = ((args.project_description as string) || '').toLowerCase();
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

  const topLangs = Object.entries(allLangs)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([l]) => l.toLowerCase());

  const recommended: Array<{
    category: string;
    choice: string;
    rationale: string;
    experience: string;
  }> = [];

  if (
    desc.includes('web') ||
    desc.includes('app') ||
    topLangs.includes('javascript') ||
    topLangs.includes('typescript')
  ) {
    recommended.push({
      category: 'Frontend',
      choice: topLangs.includes('typescript') ? 'Next.js + TypeScript' : 'React',
      rationale: 'Team has JS/TS experience',
      experience:
        topLangs.includes('javascript') || topLangs.includes('typescript') ? 'Strong' : 'Limited',
    });
  }
  if (desc.includes('api') || desc.includes('backend') || topLangs.includes('python')) {
    recommended.push({
      category: 'Backend',
      choice: topLangs.includes('python') ? 'FastAPI' : 'Node.js + Express',
      rationale: 'Matches team skills',
      experience:
        topLangs.includes('python') || topLangs.includes('javascript') ? 'Strong' : 'Limited',
    });
  }
  if (desc.includes('ml') || desc.includes('ai') || desc.includes('model')) {
    recommended.push({
      category: 'ML',
      choice: 'PyTorch or Hugging Face',
      rationale: 'Python ecosystem',
      experience: topLangs.includes('python') ? 'Strong' : 'Consider simplifying',
    });
  }

  if (recommended.length === 0) {
    recommended.push({
      category: 'Full-stack',
      choice: 'Next.js',
      rationale: 'Default for hackathons',
      experience: 'Check team skills',
    });
  }

  if (format === 'markdown') {
    const lines = [
      '## Recommended Stack',
      '',
      ...recommended.map(
        (r) => `- **${r.category}:** ${r.choice} (${r.experience}) — ${r.rationale}`,
      ),
    ];
    return lines.join('\n');
  }
  return JSON.stringify({ recommended, team_languages: topLangs });
}
