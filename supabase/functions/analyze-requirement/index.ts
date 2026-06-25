// Edge function: analyze-requirement
// Calls Lovable AI Gateway with structured tool-calling to produce a real,
// requirement-specific Senior Business Analyst analysis including RTM, BRD and Process Flow inputs.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are a Senior Business Analyst with 15+ years of enterprise experience in Banking, Insurance and Financial Services. You produce BRD, FRD, RTM, Process Flow and Agile backlog artifacts.

Analyze the requirement EXACTLY as written. Reference specific words, phrases, actors, processes, workflows, business rules, validations, integrations and edge cases present in the text. Every ambiguity, risk, question, score deduction, user story, BRD section and process step MUST be traceable to the requirement text.

=== REQUIREMENT DECOMPOSITION (MANDATORY) ===
FIRST, decompose the stakeholder input into atomic enterprise requirements. Treat the entire input as ONE Business Requirement (BR-001) and break it into multiple Functional Requirements (FR-001, FR-002, …).

Rules:
- Identify EVERY independent capability, validation, calculation, integration, approval, notification, report, security or audit action implied by the text. Each becomes ONE Functional Requirement.
- For a typical multi-step enterprise paragraph you should produce 5–15 FRs (use fewer only when the input is genuinely trivial).
- Each FR must be ATOMIC — one verifiable business capability.
- Classify each FR with a category from this controlled vocabulary: Functional, Business Rule, Validation, Calculation, Integration, Security, Audit, Notification, Reporting, Compliance, Workflow, Approval, Data Requirement, Document Requirement, Performance, Availability, Usability, Accessibility, Error Handling, Logging, API Requirement, Configuration.
- Return decomposition.businessRequirement = { id: "BR-001", name, description } and decomposition.functionalRequirements = [{ id: "FR-001", name, description, category, priority, businessValue, complexity, businessOwner?, primaryStakeholder?, dependencies[], assumptions[], constraints[], sourceParagraph, status }].

=== USER STORY GROUPING ===
Generate user stories PER Functional Requirement (typically 1–3 stories per FR; complex FRs may have more). Every story MUST carry functionalRequirementId equal to its parent FR id (e.g. "FR-003"). Use storyId values US-001, US-002, … sequential across the whole backlog. Do NOT generate one flat list disconnected from FRs.

=== REQUIREMENT QUALITY SCORING (out of 100) ===
Score 10 dimensions, each 0-10: businessObjective, actorsStakeholders, functionalRequirements, businessRules, validations, workflowCoverage, exceptionHandling, integrations, nonFunctionalRequirements, testability.
A well-written enterprise requirement that covers objective, actors, workflow, validations, integrations and basic NFRs SHOULD score 85-95. Only deduct for genuine omissions. Record each deduction in scoreRationale.deductions explaining WHY points were deducted. qualityScore = SUM of the 10 dimensions.

=== USER STORY DETAIL ===
Each story: storyId (US-NNN), functionalRequirementId (FR-NNN), title, priority, businessValue, complexityPoints (Fibonacci 1/2/3/5/8/13), asA/iWant/soThat, and acceptanceCriteria with three Gherkin scenarios (happyPath, validation, exception) — each a single string with Given/When/Then on newlines.

=== CLARIFICATION QUESTIONS — GROUPED ===
Provide clarificationQuestions as a flat list (4-10 items) AND clarificationGroups as an array of { functionalRequirementId, functionalRequirementName, questions[] } so questions can be displayed beneath their parent FR.

=== STAKEHOLDERS ===
Each stakeholder: name, role, interest, influence, plus optional power, communicationFrequency, communicationMethod, raci (R/A/C/I), owner.

=== RISKS ===
Each risk: description, impact, likelihood, mitigation, optional category, optional functionalRequirementId (FR-NNN it relates to), optional userStoryId, optional owner, optional status.

=== BRD ===
Produce a complete brd object: executiveSummary, businessObjective, problemStatement, currentState, futureState, inScope[5-10], outOfScope[3-7], constraints[3-7], businessRules[5-10], dependencies[3-7], successMetrics[3-7].

=== PROCESS FLOW + UML ACTIVITY DIAGRAM ===
Produce processFlow with both a business process flow view and an activityDiagram view. Each activity step should, where possible, trace to an FR. Use the narrative format: ["Start", "→ <step>", "Decision:", "<question?>", "Yes", "→ ...", "No", "→ ...", "End"]. Provide a syntactically simple mermaid flowchart TD as a fallback.

=== OTHER OUTPUTS ===
- confidence (0-100)
- ambiguities: exact substrings + why
- missingActors / missingBusinessRules / missingValidations / missingWorkflows / missingExceptionScenarios / missingNonFunctionalRequirements — specific to THIS requirement
- 4-8 improvement suggestions
- 3-7 assumptions
- 3-7 stakeholders
- highlights: exact substrings + category (ambiguous|missing|risk) + note

Stay grounded in the user's exact wording. Output enterprise-grade artifacts with strict traceability BR → FR → US → AC → Risk.`;

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
        clarificationGroups: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              functionalRequirementId: { type: "string" },
              functionalRequirementName: { type: "string" },
              questions: { type: "array", items: { type: "string" } },
            },
            required: ["functionalRequirementId", "functionalRequirementName", "questions"],
          },
        },
        improvementSuggestions: { type: "array", items: { type: "string" } },
        decomposition: {
          type: "object",
          additionalProperties: false,
          properties: {
            businessRequirement: {
              type: "object",
              additionalProperties: false,
              properties: {
                id: { type: "string" },
                name: { type: "string" },
                description: { type: "string" },
              },
              required: ["id", "name", "description"],
            },
            functionalRequirements: {
              type: "array",
              minItems: 1,
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  id: { type: "string" },
                  name: { type: "string" },
                  description: { type: "string" },
                  category: { type: "string" },
                  type: { type: "string" },
                  priority: { type: "string", enum: ["High", "Medium", "Low"] },
                  businessValue: { type: "string" },
                  complexity: { type: "string", enum: ["High", "Medium", "Low"] },
                  businessOwner: { type: "string" },
                  primaryStakeholder: { type: "string" },
                  dependencies: { type: "array", items: { type: "string" } },
                  assumptions: { type: "array", items: { type: "string" } },
                  constraints: { type: "array", items: { type: "string" } },
                  sourceParagraph: { type: "string" },
                  status: { type: "string" },
                },
                required: ["id", "name", "description", "category", "priority", "businessValue", "complexity"],
              },
            },
          },
          required: ["businessRequirement", "functionalRequirements"],
        },
        userStories: {
          type: "array",
          minItems: 1,
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              storyId: { type: "string" },
              functionalRequirementId: { type: "string" },
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
            required: ["storyId","functionalRequirementId","title","priority","businessValue","complexityPoints","asA","iWant","soThat","acceptanceCriteria"],
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
              power: { type: "string", enum: ["High", "Medium", "Low"] },
              communicationFrequency: { type: "string" },
              communicationMethod: { type: "string" },
              raci: { type: "string" },
              owner: { type: "string" },
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
              category: { type: "string" },
              functionalRequirementId: { type: "string" },
              userStoryId: { type: "string" },
              owner: { type: "string" },
              status: { type: "string" },
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
            activityDiagram: {
              type: "object",
              additionalProperties: false,
              properties: {
                startNode: { type: "string" },
                endNodes: { type: "array", items: { type: "string" } },
                activities: { type: "array", items: { type: "string" } },
                decisions: {
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
                alternatePaths: { type: "array", items: { type: "string" } },
                exceptionPaths: { type: "array", items: { type: "string" } },
                actorActions: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      actor: { type: "string" },
                      action: { type: "string" },
                    },
                    required: ["actor", "action"],
                  },
                },
                systemActions: { type: "array", items: { type: "string" } },
                integrationPoints: { type: "array", items: { type: "string" } },
                textActivityFlow: { type: "array", items: { type: "string" } },
                narrative: { type: "array", items: { type: "string" }, description: "Ordered narrative using Start / → step / Decision: / question / Yes|No / End line types." },
                mermaid: { type: "string", description: "Raw mermaid 'flowchart TD' source, no code fences. Must be syntactically valid." },
              },
              required: ["startNode","endNodes","activities","decisions","alternatePaths","exceptionPaths","actorActions","systemActions","integrationPoints","textActivityFlow","narrative","mermaid"],
            },
          },
          required: ["actors","activities","decisionPoints","systemActions","integrations","endStates","textFlow","mermaid","activityDiagram"],
        },
      },
      required: [
        "suggestedTitle","qualityScore","confidence","scoreBreakdown","scoreRationale",
        "ambiguities","missingActors","missingBusinessRules","missingValidations",
        "missingWorkflows","missingExceptionScenarios","missingNonFunctionalRequirements",
        "clarificationQuestions","improvementSuggestions","decomposition","userStories",
        "stakeholders","risks","assumptions","highlights","brd","processFlow",
      ],
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const rawBody = await req.text();
    if (!rawBody) {
      return new Response(JSON.stringify({ error: "Empty request body." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    let payload: { text?: string; title?: string };
    try { payload = JSON.parse(rawBody); }
    catch {
      return new Response(JSON.stringify({ error: "Invalid JSON in request body." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { text, title } = payload;
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

    const aiRaw = await aiRes.text();
    if (!aiRaw) {
      return new Response(JSON.stringify({ error: "AI gateway returned an empty response. The model output may have been truncated — please retry." }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    let data: any;
    try { data = JSON.parse(aiRaw); }
    catch {
      console.error("AI gateway non-JSON response", aiRaw.slice(0, 500));
      return new Response(JSON.stringify({ error: "AI gateway returned a non-JSON response." }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const call = data?.choices?.[0]?.message?.tool_calls?.[0];
    const finishReason = data?.choices?.[0]?.finish_reason;
    if (!call?.function?.arguments) {
      return new Response(JSON.stringify({ error: `AI returned no structured analysis (finish_reason: ${finishReason ?? "unknown"}). Try shortening the requirement and retry.` }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
