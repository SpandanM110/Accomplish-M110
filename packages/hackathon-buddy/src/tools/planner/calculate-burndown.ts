/**
 * hb_planner_calculate_burndown — Burndown estimate from tickets and velocity.
 */

import { getContext } from '../../storage/context-store.js';
import type { ResponseFormat } from '../../utils/formatters.js';

export const name = 'hb_planner_calculate_burndown';
export const description =
  'Given ticket board, team velocity, and time remaining, return burndown estimate: on track or not, buffer hours, which tickets are at risk.';

export const inputSchema = {
  type: 'object' as const,
  properties: {
    project_id: { type: 'string' },
    hours_remaining: { type: 'number' },
    velocity_multiplier: { type: 'number', description: '1.0 = normal, 0.5 = slow' },
    response_format: { type: 'string', enum: ['json', 'markdown'] },
  },
  required: ['project_id'],
};

export async function execute(args: Record<string, unknown>): Promise<string> {
  const projectId = args.project_id as string;
  const hoursRemaining = (args.hours_remaining as number) || 24;
  const velocity = (args.velocity_multiplier as number) || 1;
  const format = (args.response_format as ResponseFormat) || 'markdown';

  const ctx = getContext(projectId);
  const tickets = ctx.build.tickets || [];
  const todoTickets = tickets.filter((t) => t.status !== 'done' && t.status !== 'complete');
  const totalHours = todoTickets.reduce((acc, t) => acc + (t.estimate_hours || 0), 0);
  const effectiveHours = hoursRemaining * velocity;
  const buffer = effectiveHours - totalHours;
  const onTrack = buffer >= 0;

  const atRisk = todoTickets
    .filter((t) => (t.estimate_hours || 0) > hoursRemaining / 3)
    .map((t) => t.id);

  const result = {
    on_track: onTrack,
    total_hours_remaining: totalHours,
    hours_available: effectiveHours,
    buffer_hours: buffer,
    at_risk_tickets: atRisk,
    recommendation: onTrack
      ? 'On track. Consider adding stretch goals.'
      : 'Behind. Cut scope or simplify tickets.',
  };

  if (format === 'markdown') {
    const lines = [
      '## Burndown',
      '',
      `**Status:** ${onTrack ? '✅ On track' : '⚠️ Behind'}`,
      `**Work remaining:** ${totalHours}h`,
      `**Time available:** ${effectiveHours}h`,
      `**Buffer:** ${buffer}h`,
      '',
      atRisk.length ? `**At risk:** ${atRisk.join(', ')}` : '',
      '',
      result.recommendation,
    ];
    return lines.join('\n');
  }
  return JSON.stringify(result);
}
