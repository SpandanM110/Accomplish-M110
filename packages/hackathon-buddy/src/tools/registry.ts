/**
 * Central tool registry. All hb_* tools are registered here.
 */

import * as scoutSearch from './scout/search-hackathons.js';
import * as scoutDetails from './scout/get-hackathon-details.js';
import * as scoutWinning from './scout/get-winning-projects.js';

import * as teamAnalyze from './team/analyze-github.js';
import * as teamRecommend from './team/recommend-stack.js';
import * as teamGaps from './team/identify-skill-gaps.js';
import * as teamRoles from './team/assign-roles.js';

import * as validatorValidate from './validator/validate-idea.js';
import * as validatorScore from './validator/score-idea.js';
import * as validatorSimilar from './validator/find-similar-projects.js';
import * as validatorMoat from './validator/generate-moat-statement.js';

import * as plannerBoard from './planner/generate-ticket-board.js';
import * as plannerRisk from './planner/flag-risk-tickets.js';
import * as plannerBurndown from './planner/calculate-burndown.js';
import * as plannerPanic from './planner/trigger-panic-mode.js';
import * as plannerScope from './planner/check-scope.js';
import * as plannerBoilerplate from './planner/generate-boilerplate.js';

import * as pitchDossier from './pitch/build-judge-dossier.js';
import * as pitchQa from './pitch/simulate-judge-qa.js';
import * as pitchDemo from './pitch/generate-demo-script.js';
import * as pitchRehearsal from './pitch/run-rehearsal.js';
import * as pitchSlides from './pitch/generate-slide-structure.js';
import * as pitchCalibrate from './pitch/calibrate-language.js';
import * as pitchOptimize from './pitch/optimize-submission.js';

import * as continuityReadme from './continuity/generate-readme.js';
import * as continuityLinkedin from './continuity/generate-linkedin-posts.js';
import * as continuityOnePager from './continuity/generate-one-pager.js';
import * as continuityGrants from './continuity/match-grants.js';
import * as continuitySprint from './continuity/generate-sprint-board.js';
import * as continuityArchive from './continuity/generate-dignity-archive.js';

export interface ToolDef {
  name: string;
  description: string;
  inputSchema: object;
  execute: (args: Record<string, unknown>) => Promise<string>;
}

export const tools: ToolDef[] = [
  // Phase 1 — Scout
  {
    name: scoutSearch.name,
    description: scoutSearch.description,
    inputSchema: scoutSearch.inputSchema,
    execute: scoutSearch.execute,
  },
  {
    name: scoutDetails.name,
    description: scoutDetails.description,
    inputSchema: scoutDetails.inputSchema,
    execute: scoutDetails.execute,
  },
  {
    name: scoutWinning.name,
    description: scoutWinning.description,
    inputSchema: scoutWinning.inputSchema,
    execute: scoutWinning.execute,
  },
  // Phase 2 — Team
  {
    name: teamAnalyze.name,
    description: teamAnalyze.description,
    inputSchema: teamAnalyze.inputSchema,
    execute: teamAnalyze.execute,
  },
  {
    name: teamRecommend.name,
    description: teamRecommend.description,
    inputSchema: teamRecommend.inputSchema,
    execute: teamRecommend.execute,
  },
  {
    name: teamGaps.name,
    description: teamGaps.description,
    inputSchema: teamGaps.inputSchema,
    execute: teamGaps.execute,
  },
  {
    name: teamRoles.name,
    description: teamRoles.description,
    inputSchema: teamRoles.inputSchema,
    execute: teamRoles.execute,
  },
  // Phase 3 — Validator
  {
    name: validatorValidate.name,
    description: validatorValidate.description,
    inputSchema: validatorValidate.inputSchema,
    execute: validatorValidate.execute,
  },
  {
    name: validatorScore.name,
    description: validatorScore.description,
    inputSchema: validatorScore.inputSchema,
    execute: validatorScore.execute,
  },
  {
    name: validatorSimilar.name,
    description: validatorSimilar.description,
    inputSchema: validatorSimilar.inputSchema,
    execute: validatorSimilar.execute,
  },
  {
    name: validatorMoat.name,
    description: validatorMoat.description,
    inputSchema: validatorMoat.inputSchema,
    execute: validatorMoat.execute,
  },
  // Phase 4 — Planner
  {
    name: plannerBoard.name,
    description: plannerBoard.description,
    inputSchema: plannerBoard.inputSchema,
    execute: plannerBoard.execute,
  },
  {
    name: plannerRisk.name,
    description: plannerRisk.description,
    inputSchema: plannerRisk.inputSchema,
    execute: plannerRisk.execute,
  },
  {
    name: plannerBurndown.name,
    description: plannerBurndown.description,
    inputSchema: plannerBurndown.inputSchema,
    execute: plannerBurndown.execute,
  },
  {
    name: plannerPanic.name,
    description: plannerPanic.description,
    inputSchema: plannerPanic.inputSchema,
    execute: plannerPanic.execute,
  },
  {
    name: plannerScope.name,
    description: plannerScope.description,
    inputSchema: plannerScope.inputSchema,
    execute: plannerScope.execute,
  },
  {
    name: plannerBoilerplate.name,
    description: plannerBoilerplate.description,
    inputSchema: plannerBoilerplate.inputSchema,
    execute: plannerBoilerplate.execute,
  },
  // Phase 5 — Pitch
  {
    name: pitchDossier.name,
    description: pitchDossier.description,
    inputSchema: pitchDossier.inputSchema,
    execute: pitchDossier.execute,
  },
  {
    name: pitchQa.name,
    description: pitchQa.description,
    inputSchema: pitchQa.inputSchema,
    execute: pitchQa.execute,
  },
  {
    name: pitchDemo.name,
    description: pitchDemo.description,
    inputSchema: pitchDemo.inputSchema,
    execute: pitchDemo.execute,
  },
  {
    name: pitchRehearsal.name,
    description: pitchRehearsal.description,
    inputSchema: pitchRehearsal.inputSchema,
    execute: pitchRehearsal.execute,
  },
  {
    name: pitchSlides.name,
    description: pitchSlides.description,
    inputSchema: pitchSlides.inputSchema,
    execute: pitchSlides.execute,
  },
  {
    name: pitchCalibrate.name,
    description: pitchCalibrate.description,
    inputSchema: pitchCalibrate.inputSchema,
    execute: pitchCalibrate.execute,
  },
  {
    name: pitchOptimize.name,
    description: pitchOptimize.description,
    inputSchema: pitchOptimize.inputSchema,
    execute: pitchOptimize.execute,
  },
  // Phase 5 — Continuity
  {
    name: continuityReadme.name,
    description: continuityReadme.description,
    inputSchema: continuityReadme.inputSchema,
    execute: continuityReadme.execute,
  },
  {
    name: continuityLinkedin.name,
    description: continuityLinkedin.description,
    inputSchema: continuityLinkedin.inputSchema,
    execute: continuityLinkedin.execute,
  },
  {
    name: continuityOnePager.name,
    description: continuityOnePager.description,
    inputSchema: continuityOnePager.inputSchema,
    execute: continuityOnePager.execute,
  },
  {
    name: continuityGrants.name,
    description: continuityGrants.description,
    inputSchema: continuityGrants.inputSchema,
    execute: continuityGrants.execute,
  },
  {
    name: continuitySprint.name,
    description: continuitySprint.description,
    inputSchema: continuitySprint.inputSchema,
    execute: continuitySprint.execute,
  },
  {
    name: continuityArchive.name,
    description: continuityArchive.description,
    inputSchema: continuityArchive.inputSchema,
    execute: continuityArchive.execute,
  },
];
