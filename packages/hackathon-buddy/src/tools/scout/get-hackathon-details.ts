/**
 * hb_scout_get_hackathon_details — Pull complete data for a hackathon by URL or ID.
 */

import { getHackathonByUrl } from '../../integrations/devpost.js';
import { updateContext } from '../../storage/context-store.js';
import type { ResponseFormat } from '../../utils/formatters.js';

export const name = 'hb_scout_get_hackathon_details';
export const description =
  'Pulls complete data for a specific hackathon by URL or ID. Returns prizes, judge profiles, sponsors, submission requirements, eligibility, deadlines. Populates the hackathon section of ProjectContext.';

export const inputSchema = {
  type: 'object' as const,
  properties: {
    project_id: { type: 'string', description: 'Project ID for context storage' },
    url: { type: 'string', description: 'Hackathon URL (e.g. Devpost hackathon page)' },
    hackathon_id: { type: 'string', description: 'Alternative: hackathon ID' },
    response_format: { type: 'string', enum: ['json', 'markdown'] },
  },
  required: ['project_id'],
};

export async function execute(args: Record<string, unknown>): Promise<string> {
  const projectId = args.project_id as string;
  const url = (args.url as string) || (args.hackathon_id as string) || '';
  const format = (args.response_format as ResponseFormat) || 'markdown';

  if (!url) {
    return JSON.stringify({
      error: 'url or hackathon_id required',
      suggestion: 'Provide the Devpost or Devfolio hackathon page URL.',
    });
  }

  try {
    const detail = await getHackathonByUrl(url);

    if (!detail) {
      return JSON.stringify({
        error: 'Hackathon not found',
        reason: 'The URL may be invalid or the hackathon may have been removed.',
        suggestion: 'Verify the URL and try again.',
      });
    }

    const hackathonData = {
      id: String(detail.id),
      name: detail.title,
      platform: 'devpost' as const,
      url: detail.url || url,
      theme: detail.tagline,
      prizes: (detail.prizes ?? []).map((p) => ({
        category: p.title,
        amount: p.amount,
      })),
      judges: (detail.judges ?? []).map((j) => ({
        name: j.name,
        affiliation: j.title,
      })),
      sponsors: (detail.sponsors ?? []).map((s) => ({
        name: s.name,
      })),
      deadlines: {
        start: (detail as { start_date?: string }).start_date ?? '',
        end: detail.end_date ?? '',
      } as Record<string, string>,
    };

    updateContext(projectId, (ctx) => {
      ctx.hackathon = hackathonData;
    });

    if (format === 'markdown') {
      const lines = [
        `# ${hackathonData.name}`,
        '',
        `**URL:** ${hackathonData.url}`,
        `**Theme:** ${hackathonData.theme || 'N/A'}`,
        '',
        '## Prizes',
        ...(hackathonData.prizes.length
          ? hackathonData.prizes.map((p) => `- ${p.category}: ${p.amount || 'TBD'}`)
          : ['- No prize details available']),
        '',
        '## Judges',
        ...(hackathonData.judges.length
          ? hackathonData.judges.map((j) => `- ${j.name} (${j.affiliation || 'N/A'})`)
          : ['- No judge details available']),
        '',
        '## Deadlines',
        `- Start: ${hackathonData.deadlines.start || 'TBD'}`,
        `- End: ${hackathonData.deadlines.end || 'TBD'}`,
      ];
      return lines.join('\n');
    }

    return JSON.stringify({ hackathon: hackathonData, stored_in_context: true });
  } catch (err) {
    return JSON.stringify({
      error: err instanceof Error ? err.message : String(err),
      suggestion:
        'Check the URL format. Devpost URLs look like: https://devpost.com/software/hackathon-name',
    });
  }
}
