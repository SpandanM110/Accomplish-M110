/**
 * hb_planner_generate_boilerplate — Generate repo structure for tech stack.
 */

import type { ResponseFormat } from '../../utils/formatters.js';

export const name = 'hb_planner_generate_boilerplate';
export const description =
  'Given confirmed tech stack, generate GitHub repo structure: folder layout, README skeleton, gitignore, basic CI. Returns file tree and content.';

export const inputSchema = {
  type: 'object' as const,
  properties: {
    tech_stack: {
      type: 'array',
      items: { type: 'string' },
      description: 'e.g. ["Next.js", "TypeScript"]',
    },
    project_name: { type: 'string' },
    response_format: { type: 'string', enum: ['json', 'markdown'] },
  },
};

export async function execute(args: Record<string, unknown>): Promise<string> {
  const stack = (args.tech_stack as string[]) || ['Next.js', 'TypeScript'];
  const name = (args.project_name as string) || 'hackathon-project';
  const format = (args.response_format as ResponseFormat) || 'markdown';

  const isNext = stack.some((s) => s.toLowerCase().includes('next'));
  const isPython = stack.some(
    (s) => s.toLowerCase().includes('python') || s.toLowerCase().includes('fastapi'),
  );

  const structure = isNext
    ? [
        `${name}/`,
        '├── src/',
        '│   ├── app/',
        '│   │   ├── page.tsx',
        '│   │   └── layout.tsx',
        '│   └── components/',
        '├── public/',
        '├── package.json',
        '├── tsconfig.json',
        '├── .gitignore',
        '└── README.md',
      ]
    : isPython
      ? [
          `${name}/`,
          '├── app/',
          '│   ├── main.py',
          '│   └── api/',
          '├── requirements.txt',
          '├── .gitignore',
          '└── README.md',
        ]
      : [`${name}/`, '├── src/', '├── package.json', '├── .gitignore', '└── README.md'];

  const readme = `# ${name}\n\n## Setup\n\n\`\`\`bash\nnpm install\nnpm run dev\n\`\`\`\n\n## Team\n\nAdd your names here.`;

  const gitignore = `node_modules/\n.env\n.env.local\n*.log\n.DS_Store`;

  if (format === 'markdown') {
    const lines = [
      '## Repo Structure',
      '',
      ...structure,
      '',
      '## README.md',
      '```',
      readme,
      '```',
      '',
      '## .gitignore',
      '```',
      gitignore,
      '```',
    ];
    return lines.join('\n');
  }
  return JSON.stringify({ structure, readme, gitignore });
}
