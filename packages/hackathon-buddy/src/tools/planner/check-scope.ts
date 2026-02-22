/**
 * hb_planner_check_scope — Scope assessment for new feature.
 */

import { getContext } from '../../storage/context-store.js';
import type { ResponseFormat } from '../../utils/formatters.js';

export const name = 'hb_planner_check_scope';
export const description =
  'Assess whether a feature or project scope is appropriate for time remaining. Returns cost in hours, recommendation (build or cut).';

export const inputSchema = {
  type: 'object' as const,
  properties: {
    project_id: { type: 'string' },
    feature_description: { type: 'string' },
    hours_remaining: { type: 'number' },
    response_format: { type: 'string', enum: ['json', 'markdown'] },
  },
  required: ['project_id'],
};

export async function execute(args: Record<string, unknown>): Promise<string> {
  const projectId = args.project_id as string;
  const feature = (args.feature_description as string) || '';
  const hoursRemaining = (args.hours_remaining as number) || 24;
  const format = (args.response_format as ResponseFormat) || 'markdown';

  const ctx = getContext(projectId);
  const existingHours = (ctx.build.tickets || []).reduce(
    (acc, t) => acc + (t.estimate_hours || 0),
    0,
  );
  const featureWords = feature.split(/\s+/).length;
  const estimatedHours = Math.min(24, Math.max(2, Math.floor(featureWords * 1.5)));
  const fits = existingHours + estimatedHours <= hoursRemaining;
  const recommendation = fits ? 'Build it' : 'Cut it — simplify or defer';

  const result = {
    feature,
    estimated_hours: estimatedHours,
    existing_work_hours: existingHours,
    hours_remaining: hoursRemaining,
    fits: fits,
    recommendation,
  };

  if (format === 'markdown') {
    return `## Scope Check\n\n**Feature:** ${feature}\n**Estimate:** ${estimatedHours}h\n**Verdict:** ${recommendation}`;
  }
  return JSON.stringify(result);
}
