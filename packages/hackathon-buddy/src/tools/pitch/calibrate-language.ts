/**
 * hb_pitch_calibrate_language — Flag buzzwords, suggest replacements.
 */

import type { ResponseFormat } from '../../utils/formatters.js';

export const name = 'hb_pitch_calibrate_language';
export const description =
  'Flag buzzwords and unsubstantiated claims in pitch text. Return each with suggested concrete replacement and rationale.';

export const inputSchema = {
  type: 'object' as const,
  properties: {
    pitch_text: { type: 'string' },
    response_format: { type: 'string', enum: ['json', 'markdown'] },
  },
  required: ['pitch_text'],
};

const BUZZWORDS: Array<{ word: string; replacement: string; rationale: string }> = [
  {
    word: 'revolutionary',
    replacement: 'solves X by doing Y',
    rationale: 'Be specific about the mechanism',
  },
  { word: 'disrupt', replacement: 'improves/changes', rationale: 'Less hyperbolic' },
  { word: 'synergy', replacement: 'integration/combination', rationale: 'Concrete meaning' },
  { word: 'leverage', replacement: 'use', rationale: 'Simpler' },
  { word: 'paradigm', replacement: 'approach/method', rationale: 'Avoid jargon' },
  {
    word: 'scalable',
    replacement: 'handles N users with X infrastructure',
    rationale: 'Add numbers',
  },
  {
    word: 'AI-powered',
    replacement: 'uses [specific model/technique] to',
    rationale: 'Name the tech',
  },
];

export async function execute(args: Record<string, unknown>): Promise<string> {
  const text = (args.pitch_text as string) || '';
  const format = (args.response_format as ResponseFormat) || 'markdown';

  const lower = text.toLowerCase();
  const flags = BUZZWORDS.filter((b) => lower.includes(b.word.toLowerCase()));

  if (format === 'markdown') {
    const lines = [
      '## Language Calibration',
      '',
      ...flags.map((f) => `- **"${f.word}"** → "${f.replacement}" — ${f.rationale}`),
    ];
    return flags.length ? lines.join('\n') : 'No buzzwords flagged.';
  }
  return JSON.stringify({ flags });
}
