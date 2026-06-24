// Type definitions for AI-generated BA analysis.
// The actual analysis is produced by the analyze-requirement edge function;
// this module is types-only plus tiny helpers.

export interface Requirement {
  id: string;
  title: string;
  rawText: string;
  createdAt: string;
  analysis: Analysis;
}

export interface ScoreBreakdown {
  clarity: number;
  completeness: number;
  consistency: number;
  testability: number;
  businessContext: number;
  missingFunctionalDetails: number;
}

export interface Ambiguity {
  term: string;
  reason: string;
}

export interface Highlight {
  text: string;
  category: "ambiguous" | "missing" | "risk";
  note: string;
}

export interface UserStory {
  id: string;
  asA: string;
  iWant: string;
  soThat: string;
  acceptanceCriteria: string[]; // Gherkin
  priority: "High" | "Medium" | "Low";
}

export interface Stakeholder {
  name: string;
  role: string;
  interest: "High" | "Medium" | "Low";
  influence: "High" | "Medium" | "Low";
}

export interface Risk {
  id: string;
  description: string;
  impact: "High" | "Medium" | "Low";
  likelihood: "High" | "Medium" | "Low";
  mitigation: string;
}

export interface Analysis {
  qualityScore: number;
  confidence: number;
  scoreBreakdown: ScoreBreakdown;
  ambiguities: Ambiguity[];
  missingActors: string[];
  missingBusinessRules: string[];
  missingValidations: string[];
  missingWorkflows: string[];
  missingExceptionScenarios: string[];
  missingNonFunctionalRequirements: string[];
  /** Flattened convenience list of all "missing" findings — used by dashboard/exporters. */
  missingInfo: string[];
  clarificationQuestions: string[];
  improvementSuggestions: string[];
  userStories: UserStory[];
  stakeholders: Stakeholder[];
  risks: Risk[];
  assumptions: string[];
  highlights: Highlight[];
}

export interface RawAiAnalysis {
  suggestedTitle?: string;
  qualityScore: number;
  confidence: number;
  scoreBreakdown: ScoreBreakdown;
  ambiguities: Ambiguity[];
  missingActors: string[];
  missingBusinessRules: string[];
  missingValidations: string[];
  missingWorkflows: string[];
  missingExceptionScenarios: string[];
  missingNonFunctionalRequirements: string[];
  clarificationQuestions: string[];
  improvementSuggestions: string[];
  userStories: Omit<UserStory, "id">[];
  stakeholders: Stakeholder[];
  risks: Omit<Risk, "id">[];
  assumptions: string[];
  highlights: Highlight[];
}

export function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export function normalizeAnalysis(raw: RawAiAnalysis): Analysis {
  const labeled = (label: string, items: string[] = []) =>
    items.map((i) => `${label}: ${i}`);
  return {
    qualityScore: clamp(raw.qualityScore),
    confidence: clamp(raw.confidence),
    scoreBreakdown: {
      clarity: clamp(raw.scoreBreakdown?.clarity ?? 0),
      completeness: clamp(raw.scoreBreakdown?.completeness ?? 0),
      consistency: clamp(raw.scoreBreakdown?.consistency ?? 0),
      testability: clamp(raw.scoreBreakdown?.testability ?? 0),
      businessContext: clamp(raw.scoreBreakdown?.businessContext ?? 0),
      missingFunctionalDetails: clamp(raw.scoreBreakdown?.missingFunctionalDetails ?? 0),
    },
    ambiguities: raw.ambiguities ?? [],
    missingActors: raw.missingActors ?? [],
    missingBusinessRules: raw.missingBusinessRules ?? [],
    missingValidations: raw.missingValidations ?? [],
    missingWorkflows: raw.missingWorkflows ?? [],
    missingExceptionScenarios: raw.missingExceptionScenarios ?? [],
    missingNonFunctionalRequirements: raw.missingNonFunctionalRequirements ?? [],
    missingInfo: [
      ...labeled("Actor", raw.missingActors),
      ...labeled("Business rule", raw.missingBusinessRules),
      ...labeled("Validation", raw.missingValidations),
      ...labeled("Workflow", raw.missingWorkflows),
      ...labeled("Exception", raw.missingExceptionScenarios),
      ...labeled("NFR", raw.missingNonFunctionalRequirements),
    ],
    clarificationQuestions: raw.clarificationQuestions ?? [],
    improvementSuggestions: raw.improvementSuggestions ?? [],
    userStories: (raw.userStories ?? []).map((s) => ({ ...s, id: uid() })),
    stakeholders: raw.stakeholders ?? [],
    risks: (raw.risks ?? []).map((r) => ({ ...r, id: uid() })),
    assumptions: raw.assumptions ?? [],
    highlights: raw.highlights ?? [],
  };
}

function clamp(n: number, min = 0, max = 100) {
  if (typeof n !== "number" || Number.isNaN(n)) return 0;
  return Math.max(min, Math.min(max, Math.round(n)));
}
