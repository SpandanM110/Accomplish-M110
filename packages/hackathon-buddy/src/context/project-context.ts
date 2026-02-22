/**
 * Shared Project Context — spine of the Hackathon Buddy system.
 * Every tool reads from and writes to this object across the hackathon lifecycle.
 */

export interface HackathonInfo {
  id: string;
  name: string;
  platform: 'devpost' | 'devfolio' | 'mlh' | 'other';
  url: string;
  theme?: string;
  prizes: Array<{ category: string; amount?: string; description?: string }>;
  judges: Array<{ name: string; affiliation?: string; bio?: string }>;
  sponsors: Array<{ name: string; url?: string; apiDocs?: string }>;
  deadlines: Record<string, string>;
  submission_format?: string;
  eligibility?: string;
}

export interface ProjectContext {
  project_id: string;
  hackathon: Partial<HackathonInfo>;
  idea: {
    description?: string;
    problem_statement?: string;
    target_user?: string;
    proposed_solution?: string;
    viability_score?: Record<string, number>;
    similar_projects?: Array<{ name: string; url?: string; overlap?: string }>;
    moat_statement?: string;
    validation_brief?: string;
  };
  team: {
    members: Array<{
      github_profile?: string;
      linkedin_profile?: string;
      skill_map?: Record<string, number>;
      commit_velocity?: number;
      preferred_hours?: string;
      role_assignment?: string;
    }>;
    chemistry_score?: number;
    skill_gaps?: string[];
    recommended_stack?: Record<string, string>;
  };
  build: {
    tickets: Array<{
      id: string;
      title: string;
      description?: string;
      acceptance_criteria?: string[];
      estimate_hours?: number;
      owner?: string;
      priority?: string;
      dependencies?: string[];
      status?: string;
      risk_flag?: boolean;
    }>;
    burndown?: Record<string, unknown>;
    scope_warnings?: string[];
    commit_sentiment_log?: Array<Record<string, unknown>>;
  };
  pitch: {
    judge_dossiers?: Array<Record<string, unknown>>;
    demo_script?: string;
    slide_structure?: string[];
    rehearsal_notes?: string[];
    buzzword_flags?: string[];
  };
  outputs: {
    readme_content?: string;
    linkedin_posts?: Record<string, string>;
    one_pager_content?: string;
    matched_grants?: Array<Record<string, unknown>>;
    sprint_board?: Array<Record<string, unknown>>;
    dignity_archive?: Record<string, unknown>;
  };
}

export function createEmptyContext(projectId: string): ProjectContext {
  return {
    project_id: projectId,
    hackathon: {},
    idea: {},
    team: { members: [] },
    build: { tickets: [] },
    pitch: {},
    outputs: {},
  };
}
