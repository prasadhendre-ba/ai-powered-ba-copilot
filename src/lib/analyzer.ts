// Type definitions and helpers for AI-generated BA analysis.
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
  /** Owning functional requirement id (FR-NNN). Optional for backward compat. */
  functionalRequirementId?: string;
}

export interface Stakeholder {
  name: string;
  role: string;
  interest: "High" | "Medium" | "Low";
  influence: "High" | "Medium" | "Low";
  power?: "High" | "Medium" | "Low";
  communicationFrequency?: string;
  communicationMethod?: string;
  raci?: "R" | "A" | "C" | "I" | string;
  owner?: string;
}

export interface Risk {
  id: string;
  riskId?: string;
  description: string;
  impact: "High" | "Medium" | "Low";
  likelihood: "High" | "Medium" | "Low";
  mitigation: string;
  category?: string;
  functionalRequirementId?: string;
  userStoryId?: string;
  owner?: string;
  status?: string;
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

// === NEW: Requirement Decomposition Hierarchy ===

export const FR_CATEGORIES = [
  "Functional", "Business Rule", "Validation", "Calculation", "Integration",
  "Security", "Audit", "Notification", "Reporting", "Compliance", "Workflow",
  "Approval", "Data Requirement", "Document Requirement", "Performance",
  "Availability", "Usability", "Accessibility", "Error Handling", "Logging",
  "API Requirement", "Configuration",
] as const;
export type FrCategory = (typeof FR_CATEGORIES)[number] | string;

export interface BusinessRequirement {
  id: string;          // BR-001
  name: string;
  description: string;
}

export interface FunctionalRequirement {
  id: string;                       // FR-001
  name: string;
  description: string;
  category: FrCategory;
  type?: string;
  priority: "High" | "Medium" | "Low";
  businessValue: string;
  complexity: "High" | "Medium" | "Low";
  businessOwner?: string;
  primaryStakeholder?: string;
  dependencies: string[];
  assumptions: string[];
  constraints: string[];
  sourceParagraph?: string;
  status: "Draft" | "Approved" | "In Review" | string;
  /** Story IDs (US-NNN) that implement this FR. */
  storyIds: string[];
}

export interface Decomposition {
  businessRequirement: BusinessRequirement;
  functionalRequirements: FunctionalRequirement[];
}

export interface ClarificationGroup {
  functionalRequirementId?: string;
  functionalRequirementName?: string;
  questions: string[];
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
  clarificationGroups?: ClarificationGroup[];
  improvementSuggestions: string[];
  userStories: UserStory[];
  stakeholders: Stakeholder[];
  risks: Risk[];
  assumptions: string[];
  highlights: Highlight[];
  brd: BRD;
  processFlow: ProcessFlow;
  /** Optional; synthesized at read-time when absent (backward compat). */
  decomposition?: Decomposition;
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
  clarificationGroups?: ClarificationGroup[];
  improvementSuggestions: string[];
  userStories: (Omit<UserStory, "id"> & { functionalRequirementId?: string })[];
  stakeholders: Stakeholder[];
  risks: (Omit<Risk, "id">)[];
  assumptions: string[];
  highlights: Highlight[];
  brd?: BRD;
  processFlow?: ProcessFlow;
  decomposition?: {
    businessRequirement?: Partial<BusinessRequirement>;
    functionalRequirements?: Partial<FunctionalRequirement>[];
  };
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

export function pad3(n: number) { return String(n).padStart(3, "0"); }
export function pad2(n: number) { return String(n).padStart(2, "0"); }
export function brId(n = 1) { return `BR-${pad3(n)}`; }
export function frId(n: number) { return `FR-${pad3(n)}`; }
export function usId(n: number) { return `US-${pad3(n)}`; }
export function riskId(n: number) { return `RISK-${pad3(n)}`; }
export function acId(storyId: string, n: number) { return `AC-${storyId}-${pad2(n)}`; }

const EMPTY_BRD: BRD = {
  executiveSummary: "", businessObjective: "", problemStatement: "",
  currentState: "", futureState: "", inScope: [], outOfScope: [],
  constraints: [], businessRules: [], dependencies: [], successMetrics: [],
};

const EMPTY_ACTIVITY: ActivityDiagram = {
  startNode: "Start", endNodes: [], activities: [], decisions: [],
  alternatePaths: [], exceptionPaths: [], actorActions: [],
  systemActions: [], integrationPoints: [], textActivityFlow: [],
  narrative: [],
  mermaid: "flowchart TD\n  Start((Start)) --> A[Activity]\n  A --> End((End))",
};

const EMPTY_FLOW: ProcessFlow = {
  actors: [], activities: [], decisionPoints: [], systemActions: [],
  integrations: [], endStates: [], textFlow: [],
  mermaid: "flowchart TD\n  Start((Start)) --> A[Process]\n  A --> End((End))",
  activityDiagram: EMPTY_ACTIVITY,
};

/** Categorize a story title/text into an FR category heuristically. */
function inferCategory(text: string): FrCategory {
  const t = text.toLowerCase();
  if (/validat/.test(t)) return "Validation";
  if (/notif|sms|email|alert/.test(t)) return "Notification";
  if (/approv|reject/.test(t)) return "Approval";
  if (/report|dashboard/.test(t)) return "Reporting";
  if (/integrat|api|sync|gateway|bureau/.test(t)) return "Integration";
  if (/login|auth|password|otp|secur/.test(t)) return "Security";
  if (/audit|log/.test(t)) return "Audit";
  if (/calculat|compute|formula|interest/.test(t)) return "Calculation";
  if (/upload|document/.test(t)) return "Document Requirement";
  if (/disburs|payment|transfer/.test(t)) return "Workflow";
  return "Functional";
}

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

  // === Renumber stories sequentially US-001…, preserve AI's FR assignment by index ===
  const rawStories = raw.userStories ?? [];
  const userStories: UserStory[] = rawStories.map((s, i) => ({
    ...s,
    id: uid(),
    storyId: usId(i + 1),
    functionalRequirementId: s.functionalRequirementId, // may be remapped below
  }));

  // === Build/normalize decomposition ===
  const rawDecomp = raw.decomposition;
  let decomposition: Decomposition;
  if (rawDecomp?.functionalRequirements?.length) {
    // Renumber BR-001 + FR-001..FR-N, then map AI's FR keys → new FR ids.
    const aiFrs = rawDecomp.functionalRequirements;
    const oldToNew = new Map<string, string>();
    const frs: FunctionalRequirement[] = aiFrs.map((fr, i) => {
      const newId = frId(i + 1);
      if (fr.id) oldToNew.set(fr.id, newId);
      return {
        id: newId,
        name: fr.name ?? `Functional Requirement ${i + 1}`,
        description: fr.description ?? "",
        category: fr.category ?? "Functional",
        type: fr.type,
        priority: (fr.priority as "High" | "Medium" | "Low") ?? "Medium",
        businessValue: fr.businessValue ?? "",
        complexity: (fr.complexity as "High" | "Medium" | "Low") ?? "Medium",
        businessOwner: fr.businessOwner,
        primaryStakeholder: fr.primaryStakeholder,
        dependencies: fr.dependencies ?? [],
        assumptions: fr.assumptions ?? [],
        constraints: fr.constraints ?? [],
        sourceParagraph: fr.sourceParagraph,
        status: fr.status ?? "Draft",
        storyIds: [],
      };
    });
    // Map stories → FR. Stories carry the AI's original FR id; remap to new id.
    userStories.forEach((s) => {
      const aiFrId = s.functionalRequirementId;
      const mapped = aiFrId ? oldToNew.get(aiFrId) : undefined;
      s.functionalRequirementId = mapped ?? frs[0]?.id;
    });
    // Populate FR.storyIds
    frs.forEach((fr) => {
      fr.storyIds = userStories.filter((s) => s.functionalRequirementId === fr.id).map((s) => s.storyId);
    });
    decomposition = {
      businessRequirement: {
        id: brId(1),
        name: rawDecomp.businessRequirement?.name ?? raw.suggestedTitle ?? "Business Requirement",
        description: rawDecomp.businessRequirement?.description ?? "",
      },
      functionalRequirements: frs,
    };
  } else {
    // Backward-compat: synthesize ONE FR per story group (each story = FR).
    const frs: FunctionalRequirement[] = userStories.map((s, i) => ({
      id: frId(i + 1),
      name: s.title,
      description: `${s.asA ? `As a ${s.asA}, ` : ""}${s.iWant ? `I want ${s.iWant}` : ""}${s.soThat ? `, so that ${s.soThat}.` : ""}`,
      category: inferCategory(`${s.title} ${s.iWant}`),
      priority: s.priority,
      businessValue: s.businessValue,
      complexity: s.complexityPoints >= 8 ? "High" : s.complexityPoints >= 5 ? "Medium" : "Low",
      dependencies: [], assumptions: [], constraints: [],
      status: "Draft",
      storyIds: [s.storyId],
    }));
    userStories.forEach((s, i) => { s.functionalRequirementId = frs[i].id; });
    decomposition = {
      businessRequirement: {
        id: brId(1),
        name: raw.suggestedTitle ?? "Business Requirement",
        description: "",
      },
      functionalRequirements: frs,
    };
  }

  // === Renumber risks RISK-001… and link to FR/Story if AI provided refs ===
  const risks: Risk[] = (raw.risks ?? []).map((r, i) => {
    const rr = r as Risk;
    const aiFrId = rr.functionalRequirementId;
    const mappedFr = decomposition.functionalRequirements.find((fr) =>
      fr.id === aiFrId ||
      fr.name?.toLowerCase() === (aiFrId ?? "").toLowerCase()
    )?.id;
    return {
      ...rr,
      id: uid(),
      riskId: riskId(i + 1),
      functionalRequirementId: mappedFr,
    };
  });

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
    clarificationGroups: raw.clarificationGroups,
    improvementSuggestions: raw.improvementSuggestions ?? [],
    userStories,
    stakeholders: raw.stakeholders ?? [],
    risks,
    assumptions: raw.assumptions ?? [],
    highlights: raw.highlights ?? [],
    brd: { ...EMPTY_BRD, ...(raw.brd ?? {}) },
    processFlow: {
      ...EMPTY_FLOW,
      ...(raw.processFlow ?? {}),
      activityDiagram: { ...EMPTY_ACTIVITY, ...(raw.processFlow?.activityDiagram ?? {}) },
    },
    decomposition,
  };
}

/**
 * Returns the decomposition for any analysis. Synthesizes a single-FR
 * structure for older (pre-decomposition) analyses so all consumers can
 * assume `decomposition` exists.
 */
export function ensureDecomposition(a: Analysis): Decomposition {
  if (a.decomposition?.functionalRequirements?.length) return a.decomposition;
  const stories = a.userStories;
  const frs: FunctionalRequirement[] = stories.length
    ? stories.map((s, i) => ({
        id: frId(i + 1),
        name: s.title,
        description: `${s.asA ? `As a ${s.asA}, ` : ""}${s.iWant ? `I want ${s.iWant}` : ""}${s.soThat ? `, so that ${s.soThat}.` : ""}`,
        category: inferCategory(`${s.title} ${s.iWant}`),
        priority: s.priority,
        businessValue: s.businessValue,
        complexity: s.complexityPoints >= 8 ? "High" : s.complexityPoints >= 5 ? "Medium" : "Low",
        dependencies: [], assumptions: [], constraints: [],
        status: "Draft",
        storyIds: [s.storyId],
      }))
    : [{
        id: frId(1), name: "Primary Functional Requirement", description: "",
        category: "Functional", priority: "Medium", businessValue: "", complexity: "Medium",
        dependencies: [], assumptions: [], constraints: [], status: "Draft", storyIds: [],
      }];
  return {
    businessRequirement: { id: brId(1), name: "Business Requirement", description: "" },
    functionalRequirements: frs,
  };
}

// === Traceability Matrix derivation (enterprise hierarchy) ===
export interface RtmRow {
  brId: string;
  brName: string;
  frId: string;
  frName: string;
  frCategory: string;
  userStoryId: string;
  acceptanceCriteriaId: string;
  riskId: string;
  stakeholder: string;
  priority: string;
  status: "Traced" | "Orphan Story" | "Orphan FR";
  module?: string;
  owner?: string;
  sprint?: string;
  verificationStatus?: string;
  testCase?: string;
  // legacy aliases for older consumers
  requirementId: string;
  requirementDescription: string;
}

export interface RtmReport {
  rows: RtmRow[];
  coverage: number;
  orphanFrs: string[];
  orphanStories: string[];
  /** legacy alias */
  orphanRequirements: string[];
}

const AC_SUFFIX = [
  { key: "happyPath" as const, n: 1 },
  { key: "validation" as const, n: 2 },
  { key: "exception" as const, n: 3 },
];

export function buildRtm(req: Requirement, _requirementIndex: number = 0): RtmReport {
  const a = req.analysis;
  const decomp = ensureDecomposition(a);
  const stories = a.userStories;
  const risks = a.risks;
  const stakeholders = a.stakeholders;
  const br = decomp.businessRequirement;
  const rows: RtmRow[] = [];

  decomp.functionalRequirements.forEach((fr, frIdx) => {
    const frStories = stories.filter((s) => fr.storyIds.includes(s.storyId));
    if (!frStories.length) {
      rows.push({
        brId: br.id, brName: br.name,
        frId: fr.id, frName: fr.name, frCategory: String(fr.category),
        userStoryId: "—", acceptanceCriteriaId: "—",
        riskId: "—",
        stakeholder: fr.primaryStakeholder ?? stakeholders[0]?.name ?? "—",
        priority: fr.priority,
        status: "Orphan FR",
        owner: fr.businessOwner, sprint: "—", module: String(fr.category),
        verificationStatus: "Pending", testCase: `TC-${fr.id}`,
        requirementId: fr.id, requirementDescription: fr.name,
      });
      return;
    }
    frStories.forEach((s, sIdx) => {
      const linkedRisks = risks.filter((r) => r.functionalRequirementId === fr.id || r.userStoryId === s.storyId);
      const fallbackRisk = risks[(frIdx + sIdx) % Math.max(risks.length, 1)];
      AC_SUFFIX.forEach(({ key, n }) => {
        if (!s.acceptanceCriteria?.[key]?.trim()) return;
        const linkedRisk = linkedRisks[0] ?? fallbackRisk;
        rows.push({
          brId: br.id, brName: br.name,
          frId: fr.id, frName: fr.name, frCategory: String(fr.category),
          userStoryId: s.storyId,
          acceptanceCriteriaId: acId(s.storyId, n),
          riskId: linkedRisk?.riskId ?? (linkedRisk ? `RISK-${pad3(risks.indexOf(linkedRisk) + 1)}` : "—"),
          stakeholder: fr.primaryStakeholder ?? stakeholders[sIdx % Math.max(stakeholders.length, 1)]?.name ?? "—",
          priority: s.priority,
          status: "Traced",
          owner: fr.businessOwner, sprint: `Sprint ${1 + (frIdx % 3)}`, module: String(fr.category),
          verificationStatus: "Planned", testCase: `TC-${s.storyId}-${pad2(n)}`,
          requirementId: fr.id, requirementDescription: fr.name,
        });
      });
      const hasAny = AC_SUFFIX.some(({ key }) => !!s.acceptanceCriteria?.[key]?.trim());
      if (!hasAny) {
        rows.push({
          brId: br.id, brName: br.name,
          frId: fr.id, frName: fr.name, frCategory: String(fr.category),
          userStoryId: s.storyId, acceptanceCriteriaId: "—",
          riskId: "—", stakeholder: "—", priority: s.priority,
          status: "Orphan Story",
          requirementId: fr.id, requirementDescription: fr.name,
        });
      }
    });
  });

  const traced = rows.filter((r) => r.status === "Traced").length;
  const coverage = rows.length ? Math.round((traced / rows.length) * 100) : 0;
  const orphanStories = rows.filter((r) => r.status === "Orphan Story").map((r) => r.userStoryId);
  const orphanFrs = rows.filter((r) => r.status === "Orphan FR").map((r) => r.frId);
  return { rows, coverage, orphanFrs, orphanStories, orphanRequirements: orphanFrs };
}
