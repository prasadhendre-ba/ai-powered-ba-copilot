// Edge function: analyze-requirement
// Calls Lovable AI Gateway with structured tool-calling to produce a real,
// requirement-specific Senior Business Analyst analysis.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are a Senior Business Analyst with 15+ years of enterprise experience producing BRD, FRD, RTM and Agile backlog artifacts.

Analyze the requirement EXACTLY as written. Reference specific words, phrases, actors, processes, workflows, business rules, validations, integrations and edge cases present in the text. Every ambiguity, risk, question, score deduction and user story MUST be traceable to the requirement text.

=== REQUIREMENT QUALITY SCORING (out of 100) ===
Score these 10 dimensions, each 0-10:
1. businessObjective         — clear business goal/value stated
2. actorsStakeholders        — actors, roles, personas named
3. functionalRequirements    — functional behaviors described
4. businessRules             — domain rules and policies
5. validations               — field/data/process validations
6. workflowCoverage          — end-to-end workflow steps
7. exceptionHandling         — error paths, edge cases, exceptions
8. integrations              — external systems, APIs, dependencies
9. nonFunctionalRequirements — performance, security, scalability, compliance
10. testability              — measurable, verifiable acceptance criteria

CRITICAL SCORING RULES:
- This is a BUSINESS REQUIREMENT stage, NOT a technical spec. Do NOT penalize for technical detail that is not normally expected at BR stage.
- A well-written enterprise requirement that contains a clear objective, actors, workflow steps, key validations, integrations and basic NFRs SHOULD score 85-95.
- Only deduct points for information that is genuinely missing or ambiguous given typical BR maturity.
- For each dimension below 10, record an entry in scoreRationale.deductions explaining EXACTLY what is missing and how many points were taken.
- Overall qualityScore = SUM of the 10 dimensions (range 0-100).
- Populate scoreRationale.strengths (what the requirement does well) and scoreRationale.weaknesses (where it falls short) — both grounded in the actual text.

=== USER STORY DECOMPOSITION (CRITICAL) ===
Do NOT produce only 2-3 high-level stories. Decompose like a senior BA / Product Owner.
Identify EVERY business capability, workflow step, actor action, validation, system behavior, integration touchpoint, notification, and admin/review action as a separate candidate user story.

For typical enterprise requirements you MUST generate between 8 and 20 user stories. Only go below 8 if the requirement is a single trivial capability.

Each user story MUST include:
- storyId (e.g. "US-001", "US-002", sequential)
- title (short capability name, e.g. "Submit Claim", "Upload Supporting Documents")
- priority: High | Medium | Low
- businessValue (one sentence, business-outcome framed)
- complexityPoints (Fibonacci: 1, 2, 3, 5, 8, 13)
- asA / iWant / soThat
- acceptanceCriteria with THREE scenarios in proper Gherkin (Given/When/Then), each as a single string with newlines between steps:
    * happyPath  — successful primary flow
    * validation — input/business validation scenario
    * exception  — error / edge / exception scenario

=== OTHER OUTPUTS ===
- confidence (0-100): your confidence in this analysis given signal in the text.
- ambiguities: exact substrings from the text + why ambiguous in context.
- missingActors / missingBusinessRules / missingValidations / missingWorkflows / missingExceptionScenarios / missingNonFunctionalRequirements — each phrased specifically against THIS requirement, explaining why it matters.
- 4-8 clarification questions a stakeholder of THIS requirement would actually be asked.
- 4-8 improvement suggestions — concrete edits to make to THIS text.
- 3-7 risks specific to THIS requirement (description, impact, likelihood, mitigation).
- 3-7 assumptions that, if false, would invalidate THIS requirement.
- 3-7 stakeholders relevant to THIS domain.
- highlights: exact substrings from the text with category (ambiguous | missing | risk) and short note.

Stay grounded in the user's exact wording. Never reuse boilerplate. Output enterprise-grade, sprint-ready artifacts suitable for BRD, FRD, RTM and Agile Backlog creation.`;

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
        qualityScore: { type: "integer", minimum: 0, maximum: 100, description: "Sum of the 10 scoreBreakdown dimensions" },
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
          required: [
            "businessObjective", "actorsStakeholders", "functionalRequirements",
            "businessRules", "validations", "workflowCoverage",
            "exceptionHandling", "integrations", "nonFunctionalRequirements", "testability",
          ],
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
            properties: {
              term: { type: "string" },
              reason: { type: "string" },
            },
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
          description: "8-20 decomposed backlog-ready user stories for typical enterprise requirements.",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              storyId: { type: "string", description: "e.g. US-001" },
              title: { type: "string" },
              priority: { type: "string", enum: ["High", "Medium", "Low"] },
              businessValue: { type: "string" },
              complexityPoints: { type: "integer", minimum: 1, maximum: 13, description: "Fibonacci: 1, 2, 3, 5, 8, or 13" },
              asA: { type: "string" },
              iWant: { type: "string" },
              soThat: { type: "string" },
              acceptanceCriteria: {
                type: "object",
                additionalProperties: false,
                properties: {
                  happyPath: { type: "string", description: "Single Gherkin scenario, Given/When/Then on newlines" },
                  validation: { type: "string" },
                  exception: { type: "string" },
                },
                required: ["happyPath", "validation", "exception"],
              },
            },
            required: ["storyId", "title", "priority", "businessValue", "complexityPoints", "asA", "iWant", "soThat", "acceptanceCriteria"],
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
      },
      required: [
        "suggestedTitle", "qualityScore", "confidence", "scoreBreakdown", "scoreRationale",
        "ambiguities", "missingActors", "missingBusinessRules", "missingValidations",
        "missingWorkflows", "missingExceptionScenarios", "missingNonFunctionalRequirements",
        "clarificationQuestions", "improvementSuggestions", "userStories",
        "stakeholders", "risks", "assumptions", "highlights",
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
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "AI gateway not configured." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userMsg = `RAW REQUIREMENT (analyze this exact text, nothing else):\n"""\n${text.trim()}\n"""\n\n${
      title ? `Working title provided by user: "${title}"\n` : ""
    }Call submit_requirement_analysis with your full analysis. Score generously per the BR-stage rules. Decompose into 8-20 backlog-ready user stories where appropriate. Every field must reference this exact text.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
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

    if (aiRes.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit reached. Please try again shortly." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiRes.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits in workspace settings." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiRes.ok) {
      const body = await aiRes.text();
      console.error("AI gateway error", aiRes.status, body);
      return new Response(JSON.stringify({ error: "AI request failed.", detail: body }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiRes.json();
    const call = data?.choices?.[0]?.message?.tool_calls?.[0];
    if (!call?.function?.arguments) {
      return new Response(JSON.stringify({ error: "AI returned no structured analysis." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(call.function.arguments);
    } catch {
      return new Response(JSON.stringify({ error: "AI returned malformed analysis." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Recompute overall qualityScore as sum of breakdown to guarantee consistency.
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
