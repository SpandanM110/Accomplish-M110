/**
 * hb_team_analyze_github_profile — Analyze GitHub profile for skill map.
 */

import { getProfile, getTopLanguages, getCommitActivity } from '../../integrations/github.js';
import type { ResponseFormat } from '../../utils/formatters.js';

export const name = 'hb_team_analyze_github_profile';
export const description =
  'Analyze a GitHub username or profile URL. Returns skill map (languages, project types), commit frequency, timing patterns, repository quality signals.';

export const inputSchema = {
  type: 'object' as const,
  properties: {
    username: { type: 'string', description: 'GitHub username or profile URL' },
    response_format: { type: 'string', enum: ['json', 'markdown'] },
  },
  required: ['username'],
};

export async function execute(args: Record<string, unknown>): Promise<string> {
  const username = args.username as string;
  const format = (args.response_format as ResponseFormat) || 'markdown';

  try {
    const [profile, languages, activity] = await Promise.all([
      getProfile(username),
      getTopLanguages(username),
      getCommitActivity(username),
    ]);

    if (!profile) {
      return JSON.stringify({
        error: 'Profile not found',
        suggestion: 'Check the username spelling or try the full profile URL.',
      });
    }

    const skillMap = Object.entries(languages)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {} as Record<string, number>);

    const result = {
      login: profile.login,
      name: profile.name,
      bio: profile.bio,
      public_repos: profile.public_repos,
      followers: profile.followers,
      skill_map: skillMap,
      primary_languages: Object.keys(skillMap).slice(0, 3),
      commit_velocity: activity.avgPerWeek,
      recent_activity: activity.recent,
    };

    if (format === 'markdown') {
      const lines = [
        `# ${profile.login}`,
        '',
        `**Name:** ${profile.name || 'N/A'}`,
        `**Bio:** ${profile.bio || 'N/A'}`,
        `**Repos:** ${profile.public_repos} | **Followers:** ${profile.followers}`,
        '',
        '## Skill Map',
        ...Object.entries(skillMap).map(([lang, count]) => `- ${lang}: ${count} repos`),
        '',
        `**Primary:** ${result.primary_languages.join(', ') || 'N/A'}`,
        `**Commit velocity:** ~${activity.avgPerWeek} pushes/week`,
      ];
      return lines.join('\n');
    }
    return JSON.stringify(result);
  } catch (err) {
    return JSON.stringify({
      error: err instanceof Error ? err.message : String(err),
      suggestion: 'Set GITHUB_TOKEN for higher rate limits.',
    });
  }
}
