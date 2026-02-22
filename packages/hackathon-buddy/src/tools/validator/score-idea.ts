/**
 * hb_validator_score_idea — Score idea across five axes.
 */

import { getContext, updateContext } from '../../storage/context-store.js';
import type { ResponseFormat } from '../../utils/formatters.js';

export const name = 'hb_validator_score_idea';
export const description =
  'Score the current idea across five axes (0-10): feasibility, market relevance, tech-team match, originality, prize alignment. Returns composite score and primary risk factor.';

export const inputSchema = {
  type: 'object' as const,
  properties: {
    project_id: { type: 'string' },
    idea_description: { type: 'string' },
    response_format: { type: 'string', enum: ['json', 'markdown'] },
  },
  required: ['project_id'],
};

function scoreFeasibility(desc: string): number {
  const words = desc.split(/\s+/).length;
  if (words < 20) return 5;
  if (words < 50) return 7;
  return 8;
}

function scoreMarketRelevance(desc: string): number {
  const lower = desc.toLowerCase();
  const keywords = ['user', 'problem', 'solution', 'market', 'need'];
  const hits = keywords.filter((k) => lower.includes(k)).length;
  return Math.min(10, 5 + hits);
}

function scoreTechMatch(desc: string, teamLangs: string[]): number {
  const lower = desc.toLowerCase();
  const needs = ['web', 'api', 'ml', 'mobile'].filter((k) => lower.includes(k)).length;
  const has = teamLangs.length;
  if (needs === 0) return 9;
  return Math.min(10, 5 + Math.min(has - needs + 2, 5));
}

function scoreOriginality(desc: string): number {
  const unique = new Set(desc.toLowerCase().split(/\s+/)).size;
  return Math.min(10, Math.floor(unique / 10) + 5);
}

function scorePrizeAlignment(desc: string, hackathonTheme?: string): number {
  if (!hackathonTheme) return 7;
  const themeWords = hackathonTheme.toLowerCase().split(/\s+/);
  const descLower = desc.toLowerCase();
  const matches = themeWords.filter((w) => w.length > 3 && descLower.includes(w)).length;
  return Math.min(10, 5 + matches);
}

export async function execute(args: Record<string, unknown>): Promise<string> {
  const projectId = args.project_id as string;
  const idea = (args.idea_description as string) || '';
  const format = (args.response_format as ResponseFormat) || 'markdown';

  const ctx = getContext(projectId);
  const desc = idea || ctx.idea.description || '';
  const teamLangs = ctx.team.members.flatMap((m) => Object.keys(m.skill_map || {})).filter(Boolean);
  const theme = ctx.hackathon?.theme || '';

  if (!desc) {
    return JSON.stringify({ error: 'idea_description required' });
  }

  const feasibility = scoreFeasibility(desc);
  const marketRelevance = scoreMarketRelevance(desc);
  const techMatch = scoreTechMatch(desc, teamLangs);
  const originality = scoreOriginality(desc);
  const prizeAlignment = scorePrizeAlignment(desc, theme);

  const composite = Math.round(
    (feasibility + marketRelevance + techMatch + originality + prizeAlignment) / 5,
  );
  const scores = {
    feasibility,
    marketRelevance,
    techMatch,
    originality,
    prizeAlignment,
    composite,
  };
  const risks = [
    { axis: 'feasibility', score: feasibility, risk: feasibility < 6 },
    { axis: 'marketRelevance', score: marketRelevance, risk: marketRelevance < 6 },
    { axis: 'techMatch', score: techMatch, risk: techMatch < 5 },
    { axis: 'originality', score: originality, risk: originality < 5 },
    { axis: 'prizeAlignment', score: prizeAlignment, risk: prizeAlignment < 5 },
  ];
  const primaryRisk = risks.find((r) => r.risk)?.axis || 'none';

  updateContext(projectId, (c) => {
    c.idea.viability_score = scores;
  });

  if (format === 'markdown') {
    const lines = [
      '## Idea Score',
      '',
      `**Composite:** ${composite}/10`,
      `**Primary Risk:** ${primaryRisk}`,
      '',
      '| Axis | Score |',
      '|------|------|',
      `| Feasibility | ${feasibility} |`,
      `| Market Relevance | ${marketRelevance} |`,
      `| Tech-Team Match | ${techMatch} |`,
      `| Originality | ${originality} |`,
      `| Prize Alignment | ${prizeAlignment} |`,
    ];
    return lines.join('\n');
  }
  return JSON.stringify({ scores, primary_risk: primaryRisk });
}
