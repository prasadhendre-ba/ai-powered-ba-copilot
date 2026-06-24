// Edge function: analyze-requirement
// Calls Lovable AI Gateway with structured tool-calling to produce a real,
// requirement-specific Senior Business Analyst analysis including RTM, BRD and Process Flow inputs.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are a Senior Business Analyst with 15+ years of enterprise experience in Banking, Insurance and Financial Services. You produce BRD, FRD, RTM, Process Flow and Agile backlog artifacts.

Analyze the requirement EXACTLY as written. Reference specific words, phrases, actors, processes, workflows, business rules, validations, integrations and edge cases present in the text. Every ambiguity, risk, question, score deduction, user story, BRD section and process step MUST be traceable to the requirement text.

=== REQUIREMENT QUALITY SCORING (out of 100) ===
Score these 10 dimensions, each 0-10:
businessObjective, actorsStakeholders, functionalRequirements, businessRules, validations,
workflowCoverage, exceptionHandling, integrations, nonFunctionalRequirements, testability.

CRITICAL: This is BUSINESS REQUIREMENT stage, not a technical spec. A well-written enterprise requirement that contains a clear objective, actors, workflow steps, key validations, integrations and basic NFRs SHOULD score 85-95. Only deduct for information genuinely missing given typical BR maturity. Record each deduction in scoreRationale.deductions.
qualityScore = SUM of the 10 dimensions.

=== USER STORY DECOMPOSITION ===
Generate 8-20 backlog-ready user stories (only fewer for trivial single-capability requirements). Decompose every capability/step/validation/integration/notification/admin action.
Each story: storyId (US-001…), title, priority, businessValue, complexityPoints (Fibonacci 1/2/3/5/8/13), asA/iWant/soThat, and acceptanceCriteria with three Gherkin scenarios (happyPath, validation, exception) — each a single string with Given/When/Then on newlines.

=== BRD (BUSINESS REQUIREMENTS DOCUMENT) ===
Produce a complete brd object suitable for stakeholder review:
- executiveSummary (3-5 sentence paragraph, references this requirement)
- businessObjective (one paragraph)
- problemStatement (what business problem THIS requirement solves)
- currentState (today's pain points / manual processes implied)
- futureState (target state after implementation)
- inScope (5-10 bullet items)
- outOfScope (3-7 bullet items, explicit exclusions)
- constraints (3-7 bullets: regulatory, technical, time, budget)
- businessRules (5-10 explicit rules derived from the text — well-formed: "The system shall…")
- dependencies (3-7 bullets — systems, teams, data sources)
- successMetrics (3-7 measurable KPIs, e.g. "Reduce claim processing time from 5 days to 2 days")

=== PROCESS FLOW ===
Produce a processFlow object describing the end-to-end business process implied by this requirement:
- actors: array of actor names (e.g. "Customer", "Underwriter", "Core Banking System")
- activities: ordered array of activity step labels (verb phrases, e.g. "Create Claim", "Upload Documents")
- decisionPoints: array of { question, yesPath, noPath } objects for branches in the flow
- systemActions: array of automated system actions (e.g. "Generate Reference Number")
- integrations: array of external systems touched
- endStates: array of terminal outcomes (e.g. "Settlement Completed", "Claim Rejected")
- textFlow: ordered array of step strings forming a readable narrative (arrows implied)
- mermaid: a complete valid Mermaid \`flowchart TD\` diagram of the process. Use square brackets for actions, rhombus {} for decisions, rounded () for start, double-circle (()) for end states. Use --> and -->|Yes|/|No| labels on decisions. Node IDs must be short alphanumeric (A, B, C, D1…). Do NOT include the surrounding markdown code fence — only the raw mermaid source starting with "flowchart TD".

=== OTHER OUTPUTS ===
- confidence (0-100)
- ambiguities: exact substrings + why ambiguous
- missingActors / missingBusinessRules / missingValidations / missingWorkflows / missingExceptionScenarios / missingNonFunctionalRequirements — phrased specifically against THIS requirement
- 4-8 clarification questions
- 4-8 improvement suggestions
- 3-7 risks (description, impact, likelihood, mitigation)
- 3-7 assumptions
- 3-7 stakeholders
- highlights: exact substrings + category (ambiguous|missing|risk) + note

Stay grounded in the user's exact wording. Output enterprise-grade artifacts.`;

const analysisTool = {
  type: "function",
  function: {
    name: "submit_requirement_analysis",
    description: "Submit the structured BA analysis for the given requirement.",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        suggestedTitle: { type: "string" },
        qualityScore: { type: "integer", minimum: 0, maximum: 100 },
        confidence: { type: "integer", minimum: 0, maximum: 100 },
        scoreBreakdown: {
          type: "object",
          additionalProperties: false,
          properties: {
            businessObjective: { type: "integer", minimum: 0, maximum: 10 },
            actorsStakeholders: { type: "integer", minimum: 0, maximum: 10 },
            functionalRequirements: { type: "integer", minimum: 0, maximum: 10 },
            businessRules: { type: "integer", minimum: 0, maximum: 10 },
            validations: { type: "integer", minimum: 0, maximum: 10 },
            workflowCoverage: { type: "integer", minimum: 0, maximum: 10 },
            exceptionHandling: { type: "integer", minimum: 0, maximum: 10 },
            integrations: { type: "integer", minimum: 0, maximum: 10 },
            nonFunctionalRequirements: { type: "integer", minimum: 0, maximum: 10 },
            testability: { type: "integer", minimum: 0, maximum: 10 },
          },
          required: ["businessObjective","actorsStakeholders","functionalRequirements","businessRules","validations","workflowCoverage","exceptionHandling","integrations","nonFunctionalRequirements","testability"],
        },
        scoreRationale: {
          type: "object",
          additionalProperties: false,
          properties: {
            strengths: { type: "array", items: { type: "string" } },
            weaknesses: { type: "array", items: { type: "string" } },
            deductions: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  dimension: { type: "string" },
                  points: { type: "integer", minimum: 0, maximum: 10 },
                  reason: { type: "string" },
                },
                required: ["dimension", "points", "reason"],
              },
            },
          },
          required: ["strengths", "weaknesses", "deductions"],
        },
        ambiguities: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: { term: { type: "string" }, reason: { type: "string" } },
            required: ["term", "reason"],
          },
        },
        missingActors: { type: "array", items: { type: "string" } },
        missingBusinessRules: { type: "array", items: { type: "string" } },
        missingValidations: { type: "array", items: { type: "string" } },
        missingWorkflows: { type: "array", items: { type: "string" } },
        missingExceptionScenarios: { type: "array", items: { type: "string" } },
        missingNonFunctionalRequirements: { type: "array", items: { type: "string" } },
        clarificationQuestions: { type: "array", items: { type: "string" } },
        improvementSuggestions: { type: "array", items: { type: "string" } },
        userStories: {
          type: "array",
          minItems: 1,
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              storyId: { type: "string" },
              title: { type: "string" },
              priority: { type: "string", enum: ["High", "Medium", "Low"] },
              businessValue: { type: "string" },
              complexityPoints: { type: "integer", minimum: 1, maximum: 13 },
              asA: { type: "string" },
              iWant: { type: "string" },
              soThat: { type: "string" },
              acceptanceCriteria: {
                type: "object",
                additionalProperties: false,
                properties: {
                  happyPath: { type: "string" },
                  validation: { type: "string" },
                  exception: { type: "string" },
                },
                required: ["happyPath", "validation", "exception"],
              },
            },
            required: ["storyId","title","priority","businessValue","complexityPoints","asA","iWant","soThat","acceptanceCriteria"],
          },
        },
        stakeholders: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              name: { type: "string" },
              role: { type: "string" },
              interest: { type: "string", enum: ["High", "Medium", "Low"] },
              influence: { type: "string", enum: ["High", "Medium", "Low"] },
            },
            required: ["name", "role", "interest", "influence"],
          },
        },
        risks: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              description: { type: "string" },
              impact: { type: "string", enum: ["High", "Medium", "Low"] },
              likelihood: { type: "string", enum: ["High", "Medium", "Low"] },
              mitigation: { type: "string" },
            },
            required: ["description", "impact", "likelihood", "mitigation"],
          },
        },
        assumptions: { type: "array", items: { type: "string" } },
        highlights: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              text: { type: "string" },
              category: { type: "string", enum: ["ambiguous", "missing", "risk"] },
              note: { type: "string" },
            },
            required: ["text", "category", "note"],
          },
        },
        brd: {
          type: "object",
          additionalProperties: false,
          properties: {
            executiveSummary: { type: "string" },
            businessObjective: { type: "string" },
            problemStatement: { type: "string" },
            currentState: { type: "string" },
            futureState: { type: "string" },
            inScope: { type: "array", items: { type: "string" } },
            outOfScope: { type: "array", items: { type: "string" } },
            constraints: { type: "array", items: { type: "string" } },
            businessRules: { type: "array", items: { type: "string" } },
            dependencies: { type: "array", items: { type: "string" } },
            successMetrics: { type: "array", items: { type: "string" } },
          },
          required: ["executiveSummary","businessObjective","problemStatement","currentState","futureState","inScope","outOfScope","constraints","businessRules","dependencies","successMetrics"],
        },
        processFlow: {
          type: "object",
          additionalProperties: false,
          properties: {
            actors: { type: "array", items: { type: "string" } },
            activities: { type: "array", items: { type: "string" } },
            decisionPoints: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  question: { type: "string" },
                  yesPath: { type: "string" },
                  noPath: { type: "string" },
                },
                required: ["question", "yesPath", "noPath"],
              },
            },
            systemActions: { type: "array", items: { type: "string" } },
            integrations: { type: "array", items: { type: "string" } },
            endStates: { type: "array", items: { type: "string" } },
            textFlow: { type: "array", items: { type: "string" } },
            mermaid: { type: "string", description: "Raw mermaid 'flowchart TD' source, no code fences." },
          },
          required: ["actors","activities","decisionPoints","systemActions","integrations","endStates","textFlow","mermaid"],
        },
      },
      required: [
        "suggestedTitle","qualityScore","confidence","scoreBreakdown","scoreRationale",
        "ambiguities","missingActors","missingBusinessRules","missingValidations",
        "missingWorkflows","missingExceptionScenarios","missingNonFunctionalRequirements",
        "clarificationQuestions","improvementSuggestions","userStories",
        "stakeholders","risks","assumptions","highlights","brd","processFlow",
      ],
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { text, title } = await req.json();
    if (!text || typeof text !== "string" || text.trim().length < 10) {
      return new Response(JSON.stringify({ error: "Requirement text is too short." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "AI gateway not configured." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userMsg = `RAW REQUIREMENT (analyze this exact text, nothing else):\n"""\n${text.trim()}\n"""\n\n${
      title ? `Working title provided by user: "${title}"\n` : ""
    }Call submit_requirement_analysis with your full analysis: scoring, decomposed user stories (8-20), risks, stakeholders, assumptions, complete BRD sections, and a process flow (text + mermaid). Every field must reference this exact text.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMsg },
        ],
        tools: [analysisTool],
        tool_choice: { type: "function", function: { name: "submit_requirement_analysis" } },
      }),
    });

    if (aiRes.status === 429) return new Response(JSON.stringify({ error: "Rate limit reached. Please try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (aiRes.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits in workspace settings." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!aiRes.ok) {
      const body = await aiRes.text();
      console.error("AI gateway error", aiRes.status, body);
      return new Response(JSON.stringify({ error: "AI request failed.", detail: body }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await aiRes.json();
    const call = data?.choices?.[0]?.message?.tool_calls?.[0];
    if (!call?.function?.arguments) {
      return new Response(JSON.stringify({ error: "AI returned no structured analysis." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let parsed: Record<string, unknown>;
    try { parsed = JSON.parse(call.function.arguments); }
    catch { return new Response(JSON.stringify({ error: "AI returned malformed analysis." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }

    const sb = (parsed.scoreBreakdown ?? {}) as Record<string, number>;
    const sum = Object.values(sb).reduce((a, n) => a + (typeof n === "number" ? n : 0), 0);
    if (sum > 0) parsed.qualityScore = Math.max(0, Math.min(100, sum));

    return new Response(JSON.stringify({ analysis: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-requirement error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
