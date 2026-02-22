/**
 * hb_pitch_run_rehearsal — Run rehearsal checklist.
 */

import { getContext } from '../../storage/context-store.js';
import type { ResponseFormat } from '../../utils/formatters.js';

export const name = 'hb_pitch_run_rehearsal';
export const description =
  'Run rehearsal checklist: timing (2 min), demo flow, backup plan if live demo fails, Q&A prep. Return checklist with pass/fail and notes.';

export const inputSchema = {
  type: 'object' as const,
  properties: {
    project_id: { type: 'string' },
    rehearsal_notes: { type: 'string' },
    response_format: { type: 'string', enum: ['json', 'markdown'] },
  },
  required: ['project_id'],
};

export async function execute(args: Record<string, unknown>): Promise<string> {
  const projectId = args.project_id as string;
  const notes = (args.rehearsal_notes as string) || '';
  const format = (args.response_format as ResponseFormat) || 'markdown';

  getContext(projectId);

  const checklist = [
    { item: 'Timing under 2 min', status: 'pending', note: 'Practice with timer' },
    { item: 'Demo flow works end-to-end', status: 'pending', note: 'Test on presentation machine' },
    { item: 'Backup plan if demo fails', status: 'pending', note: 'Have screenshots/video ready' },
    { item: 'Q&A prep reviewed', status: 'pending', note: 'Run hb_pitch_simulate_judge_qa' },
    { item: 'Hook in first 15 seconds', status: 'pending', note: 'Grab attention early' },
  ];

  if (notes) {
    checklist[0].note = notes;
  }

  if (format === 'markdown') {
    const lines = [
      '## Rehearsal Checklist',
      '',
      ...checklist.map((c) => `- [ ] ${c.item} — ${c.note}`),
    ];
    return lines.join('\n');
  }
  return JSON.stringify({ checklist });
}
