export interface Requirement {
  id: string;
  title: string;
  rawText: string;
  createdAt: string;
  analysis: Analysis;
}

export interface Analysis {
  qualityScore: number;
  ambiguities: string[];
  missingInfo: string[];
  clarificationQuestions: string[];
  improvementSuggestions: string[];
  userStories: UserStory[];
  stakeholders: Stakeholder[];
  risks: Risk[];
  assumptions: string[];
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

const VAGUE_WORDS = ["fast", "easy", "user-friendly", "intuitive", "scalable", "robust", "secure", "simple", "quickly", "efficient", "modern", "seamless", "nice", "good"];

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export function analyzeRequirement(text: string, title: string): Requirement {
  const lower = text.toLowerCase();
  const words = text.trim().split(/\s+/).length;
  const hasMetrics = /\b\d+\s*(%|ms|seconds?|minutes?|users?|requests?)\b/i.test(text);
  const hasActor = /\b(user|admin|customer|manager|stakeholder|client|employee)\b/i.test(text);
  const hasAction = /\b(should|must|shall|will|can|need to|able to)\b/i.test(text);
  const hasAcceptance = /\b(when|then|given|if)\b/i.test(text);
  const foundVague = VAGUE_WORDS.filter((w) => lower.includes(w));

  let score = 50;
  if (words > 30) score += 10;
  if (words > 80) score += 5;
  if (hasMetrics) score += 12;
  if (hasActor) score += 8;
  if (hasAction) score += 7;
  if (hasAcceptance) score += 8;
  score -= Math.min(25, foundVague.length * 5);
  score = Math.max(15, Math.min(98, score));

  const ambiguities: string[] = [];
  foundVague.forEach((w) =>
    ambiguities.push(`The term "${w}" is subjective and lacks measurable criteria.`)
  );
  if (!hasActor) ambiguities.push("No clear actor or user role identified in the requirement.");
  if (/\b(etc|and so on|various|some|many|few)\b/i.test(text))
    ambiguities.push("Open-ended phrasing (e.g. 'etc.', 'various') leaves scope undefined.");

  const missingInfo: string[] = [];
  if (!hasMetrics) missingInfo.push("No quantitative success metrics or performance thresholds provided.");
  if (!/\b(deadline|by|within|q[1-4]|month|week)\b/i.test(lower))
    missingInfo.push("Target timeline or delivery deadline is not specified.");
  if (!/\b(budget|cost|resource)\b/i.test(lower))
    missingInfo.push("Budget, cost, or resource constraints not mentioned.");
  if (!/\b(integration|api|system|platform)\b/i.test(lower))
    missingInfo.push("Integration points with existing systems are not described.");

  const clarificationQuestions = [
    "Who is the primary user or persona for this feature?",
    "What measurable success criteria define 'done' for this requirement?",
    "Are there compliance, security, or regulatory constraints to consider?",
    "What is the expected user volume and performance target?",
    "Which existing systems must this feature integrate with?",
  ];

  const improvementSuggestions = [
    "Rewrite vague terms with specific, measurable thresholds (e.g. 'page loads in <2s').",
    "Add explicit user roles using the 'As a [role], I want…' format.",
    "Include preconditions, postconditions, and edge cases.",
    "Define out-of-scope items to prevent scope creep.",
    "Attach mockups or reference flows where applicable.",
  ];

  const role = hasActor
    ? (text.match(/\b(user|admin|customer|manager|stakeholder|client|employee)\b/i)?.[0] ?? "user")
    : "user";

  const featureGuess = title || text.split(/[.!?]/)[0].slice(0, 60);

  const userStories: UserStory[] = [
    {
      id: uid(),
      asA: role.toLowerCase(),
      iWant: `to ${featureGuess.toLowerCase().replace(/^(the |a |an )/, "")}`,
      soThat: "I can complete my workflow efficiently and accurately",
      acceptanceCriteria: [
        "Given I am authenticated\nWhen I navigate to the feature\nThen I see the primary action available",
        "Given valid inputs are provided\nWhen I submit the form\nThen the system saves the data and confirms success",
        "Given invalid inputs are provided\nWhen I submit the form\nThen the system displays clear validation errors",
      ],
      priority: "High",
    },
    {
      id: uid(),
      asA: "system administrator",
      iWant: "to configure access permissions for this feature",
      soThat: "only authorized roles can perform sensitive actions",
      acceptanceCriteria: [
        "Given I have admin privileges\nWhen I open role settings\nThen I can grant or revoke access per role",
        "Given a user lacks permission\nWhen they attempt the action\nThen access is denied with a meaningful message",
      ],
      priority: "Medium",
    },
    {
      id: uid(),
      asA: "product owner",
      iWant: "to track usage analytics for this feature",
      soThat: "I can measure adoption and prioritize improvements",
      acceptanceCriteria: [
        "Given the feature is in production\nWhen users interact with it\nThen events are logged to the analytics pipeline",
      ],
      priority: "Low",
    },
  ];

  const stakeholders: Stakeholder[] = [
    { name: "Product Owner", role: "Defines vision and priority", interest: "High", influence: "High" },
    { name: "End Users", role: "Daily users of the feature", interest: "High", influence: "Medium" },
    { name: "Engineering Lead", role: "Technical feasibility & delivery", interest: "High", influence: "High" },
    { name: "QA Team", role: "Validates acceptance criteria", interest: "Medium", influence: "Medium" },
    { name: "Compliance Officer", role: "Ensures regulatory adherence", interest: "Medium", influence: "High" },
  ];

  const risks: Risk[] = [
    {
      id: uid(),
      description: "Ambiguous requirements lead to scope creep during development",
      impact: "High",
      likelihood: foundVague.length > 2 ? "High" : "Medium",
      mitigation: "Conduct clarification workshop with stakeholders before sprint planning",
    },
    {
      id: uid(),
      description: "Performance targets undefined—may not meet user expectations",
      impact: "Medium",
      likelihood: hasMetrics ? "Low" : "High",
      mitigation: "Establish SLAs and run load testing in staging environment",
    },
    {
      id: uid(),
      description: "Integration dependencies unclear—risk of late discovery of blockers",
      impact: "High",
      likelihood: "Medium",
      mitigation: "Run technical spike during discovery phase to map integrations",
    },
    {
      id: uid(),
      description: "Compliance/security gaps if regulatory needs are not specified upfront",
      impact: "High",
      likelihood: "Low",
      mitigation: "Engage compliance early; document data flows and retention policies",
    },
  ];

  const assumptions = [
    "Users have access to a modern browser (Chrome, Edge, Safari, Firefox latest).",
    "Authentication and SSO infrastructure are already in place.",
    "Required third-party APIs are stable and within agreed SLA.",
    "Training material will be created prior to rollout.",
  ];

  return {
    id: uid(),
    title: title || featureGuess,
    rawText: text,
    createdAt: new Date().toISOString(),
    analysis: {
      qualityScore: score,
      ambiguities,
      missingInfo,
      clarificationQuestions,
      improvementSuggestions,
      userStories,
      stakeholders,
      risks,
      assumptions,
    },
  };
}
