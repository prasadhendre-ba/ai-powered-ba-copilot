// Type definitions for AI-generated BA analysis.
// The actual analysis is produced by the analyze-requirement edge function.

export interface Requirement {
  id: string;
  title: string;
  rawText: string;
  createdAt: string;
  analysis: Analysis;
}

export interface ScoreBreakdown {
  businessObjective: number;
  actorsStakeholders: number;
  functionalRequirements: number;
  businessRules: number;
  validations: number;
  workflowCoverage: number;
  exceptionHandling: number;
  integrations: number;
  nonFunctionalRequirements: number;
  testability: number;
}

export interface ScoreDeduction { dimension: string; points: number; reason: string; }
export interface ScoreRationale { strengths: string[]; weaknesses: string[]; deductions: ScoreDeduction[]; }
export interface Ambiguity { term: string; reason: string; }
export interface Highlight { text: string; category: "ambiguous" | "missing" | "risk"; note: string; }
export interface AcceptanceCriteria { happyPath: string; validation: string; exception: string; }

export interface UserStory {
  id: string;
  storyId: string;
  title: string;
  priority: "High" | "Medium" | "Low";
  businessValue: string;
  complexityPoints: number;
  asA: string;
  iWant: string;
  soThat: string;
  acceptanceCriteria: AcceptanceCriteria;
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

export interface BRD {
  executiveSummary: string;
  businessObjective: string;
  problemStatement: string;
  currentState: string;
  futureState: string;
  inScope: string[];
  outOfScope: string[];
  constraints: string[];
  businessRules: string[];
  dependencies: string[];
  successMetrics: string[];
}

export interface DecisionPoint { question: string; yesPath: string; noPath: string; }

export interface ActivityDiagram {
  startNode: string;
  endNodes: string[];
  activities: string[];
  decisions: DecisionPoint[];
  alternatePaths: string[];
  exceptionPaths: string[];
  actorActions: { actor: string; action: string }[];
  systemActions: string[];
  integrationPoints: string[];
  textActivityFlow: string[];
  /** Primary BA-facing narrative. Each entry is a single line in the
   *  Start / → activity / Decision: / Yes / No / End format. */
  narrative: string[];
  mermaid: string;
}

export interface ProcessFlow {
  actors: string[];
  activities: string[];
  decisionPoints: DecisionPoint[];
  systemActions: string[];
  integrations: string[];
  endStates: string[];
  textFlow: string[];
  mermaid: string;
  activityDiagram: ActivityDiagram;
}

export interface Analysis {
  qualityScore: number;
  confidence: number;
  scoreBreakdown: ScoreBreakdown;
  scoreRationale: ScoreRationale;
  ambiguities: Ambiguity[];
  missingActors: string[];
  missingBusinessRules: string[];
  missingValidations: string[];
  missingWorkflows: string[];
  missingExceptionScenarios: string[];
  missingNonFunctionalRequirements: string[];
  missingInfo: string[];
  clarificationQuestions: string[];
  improvementSuggestions: string[];
  userStories: UserStory[];
  stakeholders: Stakeholder[];
  risks: Risk[];
  assumptions: string[];
  highlights: Highlight[];
  brd: BRD;
  processFlow: ProcessFlow;
}

export interface RawAiAnalysis {
  suggestedTitle?: string;
  qualityScore: number;
  confidence: number;
  scoreBreakdown: ScoreBreakdown;
  scoreRationale: ScoreRationale;
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
  brd?: BRD;
  processFlow?: ProcessFlow;
}

export const SCORE_DIMENSIONS: { key: keyof ScoreBreakdown; label: string }[] = [
  { key: "businessObjective", label: "Business Objective" },
  { key: "actorsStakeholders", label: "Actors & Stakeholders" },
  { key: "functionalRequirements", label: "Functional Requirements" },
  { key: "businessRules", label: "Business Rules" },
  { key: "validations", label: "Validations" },
  { key: "workflowCoverage", label: "Workflow Coverage" },
  { key: "exceptionHandling", label: "Exception Handling" },
  { key: "integrations", label: "Integrations" },
  { key: "nonFunctionalRequirements", label: "Non-Functional Requirements" },
  { key: "testability", label: "Testability" },
];

export function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function clamp(n: number, min = 0, max = 100) {
  if (typeof n !== "number" || Number.isNaN(n)) return 0;
  return Math.max(min, Math.min(max, Math.round(n)));
}

const EMPTY_BRD: BRD = {
  executiveSummary: "",
  businessObjective: "",
  problemStatement: "",
  currentState: "",
  futureState: "",
  inScope: [],
  outOfScope: [],
  constraints: [],
  businessRules: [],
  dependencies: [],
  successMetrics: [],
};

const EMPTY_ACTIVITY: ActivityDiagram = {
  startNode: "Start",
  endNodes: [],
  activities: [],
  decisions: [],
  alternatePaths: [],
  exceptionPaths: [],
  actorActions: [],
  systemActions: [],
  integrationPoints: [],
  textActivityFlow: [],
  narrative: [],
  mermaid: "flowchart TD\n  Start((Start)) --> A[Activity]\n  A --> End((End))",
};

const EMPTY_FLOW: ProcessFlow = {
  actors: [],
  activities: [],
  decisionPoints: [],
  systemActions: [],
  integrations: [],
  endStates: [],
  textFlow: [],
  mermaid: "flowchart TD\n  Start((Start)) --> A[Process]\n  A --> End((End))",
  activityDiagram: EMPTY_ACTIVITY,
};

export function normalizeAnalysis(raw: RawAiAnalysis): Analysis {
  const labeled = (label: string, items: string[] = []) => items.map((i) => `${label}: ${i}`);
  const sb = raw.scoreBreakdown ?? ({} as ScoreBreakdown);
  const breakdown: ScoreBreakdown = {
    businessObjective: clamp(sb.businessObjective ?? 0, 0, 10),
    actorsStakeholders: clamp(sb.actorsStakeholders ?? 0, 0, 10),
    functionalRequirements: clamp(sb.functionalRequirements ?? 0, 0, 10),
    businessRules: clamp(sb.businessRules ?? 0, 0, 10),
    validations: clamp(sb.validations ?? 0, 0, 10),
    workflowCoverage: clamp(sb.workflowCoverage ?? 0, 0, 10),
    exceptionHandling: clamp(sb.exceptionHandling ?? 0, 0, 10),
    integrations: clamp(sb.integrations ?? 0, 0, 10),
    nonFunctionalRequirements: clamp(sb.nonFunctionalRequirements ?? 0, 0, 10),
    testability: clamp(sb.testability ?? 0, 0, 10),
  };
  const sum = Object.values(breakdown).reduce((a, n) => a + n, 0);
  return {
    qualityScore: clamp(raw.qualityScore ?? sum),
    confidence: clamp(raw.confidence),
    scoreBreakdown: breakdown,
    scoreRationale: {
      strengths: raw.scoreRationale?.strengths ?? [],
      weaknesses: raw.scoreRationale?.weaknesses ?? [],
      deductions: raw.scoreRationale?.deductions ?? [],
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
    brd: { ...EMPTY_BRD, ...(raw.brd ?? {}) },
    processFlow: {
      ...EMPTY_FLOW,
      ...(raw.processFlow ?? {}),
      activityDiagram: { ...EMPTY_ACTIVITY, ...(raw.processFlow?.activityDiagram ?? {}) },
    },
  };
}

// === Traceability Matrix derivation ===
export interface RtmRow {
  requirementId: string;
  requirementDescription: string;
  userStoryId: string;
  acceptanceCriteriaId: string;
  riskId: string;
  stakeholder: string;
  priority: string;
  status: "Traced" | "Orphan Story" | "Orphan Requirement";
}

export interface RtmReport {
  rows: RtmRow[];
  coverage: number;
  orphanRequirements: string[];
  orphanStories: string[];
}

const AC_SUFFIX = [
  { key: "happyPath" as const, suffix: "HP" },
  { key: "validation" as const, suffix: "VAL" },
  { key: "exception" as const, suffix: "EX" },
];

/**
 * Generates a requirement ID with sequential numbering.
 * @param index - The zero-based index of the requirement (0 = REQ-001, 1 = REQ-002, etc.)
 * @returns Formatted requirement ID string
 */
function generateRequirementId(index: number): string {
  const paddedNumber = String(index + 1).padStart(3, "0");
  return `REQ-${paddedNumber}`;
}

/**
 * Builds the RTM (Requirements Traceability Matrix) report for a single requirement.
 * Generates sequential requirement IDs based on the requirement index.
 * @param req - The requirement to trace
 * @param requirementIndex - The zero-based index of this requirement in the collection (for unique ID generation)
 * @returns RTM report with traced relationships
 */
export function buildRtm(req: Requirement, requirementIndex: number = 0): RtmReport {
  const a = req.analysis;
  const reqId = generateRequirementId(requirementIndex);
  const reqDesc = req.title;
  const stories = a.userStories;
  const risks = a.risks;
  const stakeholders = a.stakeholders;

  const rows: RtmRow[] = [];
  if (!stories.length) {
    rows.push({
      requirementId: reqId,
      requirementDescription: reqDesc,
      userStoryId: "—",
      acceptanceCriteriaId: "—",
      riskId: "—",
      stakeholder: stakeholders[0]?.name ?? "—",
      priority: "—",
      status: "Orphan Requirement",
    });
  } else {
    stories.forEach((s, sIdx) => {
      AC_SUFFIX.forEach(({ key, suffix }) => {
        const hasAc = !!s.acceptanceCriteria?.[key]?.trim();
        if (!hasAc) return;
        const risk = risks[sIdx % Math.max(risks.length, 1)];
        const stakeholder = stakeholders[sIdx % Math.max(stakeholders.length, 1)];
        rows.push({
          requirementId: reqId,
          requirementDescription: reqDesc,
          userStoryId: s.storyId,
          acceptanceCriteriaId: `AC-${s.storyId}-${suffix}`,
          riskId: risk ? `RISK-${String(risks.indexOf(risk) + 1).padStart(3, "0")}` : "—",
          stakeholder: stakeholder?.name ?? "—",
          priority: s.priority,
          status: "Traced",
        });
      });
      // story with no AC at all → orphan
      const hasAny = AC_SUFFIX.some(({ key }) => !!s.acceptanceCriteria?.[key]?.trim());
      if (!hasAny) {
        rows.push({
          requirementId: reqId,
          requirementDescription: reqDesc,
          userStoryId: s.storyId,
          acceptanceCriteriaId: "—",
          riskId: "—",
          stakeholder: "—",
          priority: s.priority,
          status: "Orphan Story",
        });
      }
    });
  }

  const traced = rows.filter((r) => r.status === "Traced").length;
  const coverage = rows.length ? Math.round((traced / rows.length) * 100) : 0;
  const orphanStories = rows.filter((r) => r.status === "Orphan Story").map((r) => r.userStoryId);
  const orphanRequirements = rows.filter((r) => r.status === "Orphan Requirement").map((r) => r.requirementId);
  return { rows, coverage, orphanRequirements, orphanStories };
}
