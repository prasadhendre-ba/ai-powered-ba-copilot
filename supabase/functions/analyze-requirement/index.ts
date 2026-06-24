// Edge function: analyze-requirement
// Calls Lovable AI Gateway with structured tool-calling to produce a real,
// requirement-specific Business Analyst analysis.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are a senior Business Analyst AI. The user gives you a RAW stakeholder requirement.
You must analyze ONLY the actual text provided. Never invent unrelated domains, never use generic boilerplate, never reuse sample answers. Every output MUST reference concrete words, entities, actors, actions, or constraints from the user's text.

Produce a rigorous, enterprise-grade BA analysis with:
- A Requirement Quality Score (0-100) decomposed into Clarity, Completeness, Consistency, Testability, Business Context, and Missing Functional Details (each 0-100).
- A Confidence score (0-100) reflecting how much signal the text gave you.
- Ambiguous terms/phrases LIFTED VERBATIM from the text (the exact substring), each with why it is ambiguous.
- Missing actors, missing business rules, missing validations, missing workflows, missing exception scenarios, missing non-functional requirements - all phrased specifically about THIS requirement.
- 4-8 clarification questions that a stakeholder of THIS requirement would actually be asked (not generic).
- 4-8 improvement suggestions naming the concrete edit to make.
- 2-5 user stories in proper format with Gherkin acceptance criteria. The stories must describe THIS feature, not a generic CRUD form.
- 3-7 risks specific to THIS requirement with impact/likelihood/mitigation.
- 3-7 assumptions that, if false, would invalidate this requirement.
- 3-7 stakeholders relevant to THIS domain (not a generic list).
- "highlights": for each ambiguous term, the exact substring as it appears in the text, plus a category ("ambiguous" | "missing" | "risk") and short note.

Stay grounded in the user's exact wording. If the requirement is one sentence, your analysis is still rigorous but acknowledges sparsity via lower Completeness and Confidence scores.`;

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
            clarity: { type: "integer", minimum: 0, maximum: 100 },
            completeness: { type: "integer", minimum: 0, maximum: 100 },
            consistency: { type: "integer", minimum: 0, maximum: 100 },
            testability: { type: "integer", minimum: 0, maximum: 100 },
            businessContext: { type: "integer", minimum: 0, maximum: 100 },
            missingFunctionalDetails: { type: "integer", minimum: 0, maximum: 100 },
          },
          required: ["clarity", "completeness", "consistency", "testability", "businessContext", "missingFunctionalDetails"],
        },
        ambiguities: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              term: { type: "string", description: "Exact substring from the text" },
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
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              asA: { type: "string" },
              iWant: { type: "string" },
              soThat: { type: "string" },
              priority: { type: "string", enum: ["High", "Medium", "Low"] },
              acceptanceCriteria: {
                type: "array",
                items: { type: "string", description: "Single Gherkin scenario with Given/When/Then lines separated by newlines" },
              },
            },
            required: ["asA", "iWant", "soThat", "priority", "acceptanceCriteria"],
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
          description: "Spans from the original text to visually annotate",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              text: { type: "string", description: "Exact substring from the requirement" },
              category: { type: "string", enum: ["ambiguous", "missing", "risk"] },
              note: { type: "string" },
            },
            required: ["text", "category", "note"],
          },
        },
      },
      required: [
        "suggestedTitle",
        "qualityScore",
        "confidence",
        "scoreBreakdown",
        "ambiguities",
        "missingActors",
        "missingBusinessRules",
        "missingValidations",
        "missingWorkflows",
        "missingExceptionScenarios",
        "missingNonFunctionalRequirements",
        "clarificationQuestions",
        "improvementSuggestions",
        "userStories",
        "stakeholders",
        "risks",
        "assumptions",
        "highlights",
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
    }Call submit_requirement_analysis with your full analysis. Every field must reference this exact text.`;

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
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiRes.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits in workspace settings." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiRes.ok) {
      const body = await aiRes.text();
      console.error("AI gateway error", aiRes.status, body);
      return new Response(JSON.stringify({ error: "AI request failed.", detail: body }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiRes.json();
    const call = data?.choices?.[0]?.message?.tool_calls?.[0];
    if (!call?.function?.arguments) {
      return new Response(JSON.stringify({ error: "AI returned no structured analysis." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(call.function.arguments);
    } catch (e) {
      return new Response(JSON.stringify({ error: "AI returned malformed analysis." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ analysis: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-requirement error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
