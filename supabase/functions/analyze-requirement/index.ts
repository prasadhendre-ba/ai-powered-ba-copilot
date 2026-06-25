// Edge function: analyze-requirement
// Calls Lovable AI Gateway to produce a real, requirement-specific Senior Business Analyst analysis.
// Keep the model contract compact; large tool schemas were causing 150s idle timeouts in production.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are a Senior Business Analyst with 15+ years of enterprise experience. You produce enterprise-grade BRD, FRD, RTM, Process Flow and Agile backlog artifacts.

Analyze the requirement EXACTLY as written. Reference specific words, phrases, actors, processes, workflows, business rules, validations, integrations and edge cases present in the text. Every ambiguity, risk, question, score deduction, user story, BRD section and process step MUST be traceable to the requirement text.

=== REQUIREMENT DECOMPOSITION (MANDATORY) ===
FIRST, decompose the stakeholder input into atomic enterprise requirements. Treat the entire input as ONE Business Requirement (BR-001) and break it into multiple Functional Requirements (FR-001, FR-002, …).

Rules:
- Identify EVERY independent capability, validation, calculation, integration, approval, notification, report, security or audit action implied by the text. Each becomes ONE Functional Requirement.
- For a typical multi-step enterprise paragraph produce 4–10 FRs (use fewer only when the input is genuinely trivial).
- Each FR must be ATOMIC — one verifiable business capability.
- Classify each FR with a category from this controlled vocabulary: Functional, Business Rule, Validation, Calculation, Integration, Security, Audit, Notification, Reporting, Compliance, Workflow, Approval, Data Requirement, Document Requirement, Performance, Availability, Usability, Accessibility, Error Handling, Logging, API Requirement, Configuration.
- Return decomposition.businessRequirement = { id: "BR-001", name, description } and decomposition.functionalRequirements = [{ id: "FR-001", name, description, category, priority, businessValue, complexity, businessOwner?, primaryStakeholder?, dependencies[], assumptions[], constraints[], sourceParagraph, status }].

=== USER STORY GROUPING ===
Generate user stories PER Functional Requirement (typically 1–2 stories per FR). Every story MUST carry functionalRequirementId equal to its parent FR id (e.g. "FR-003"). Use storyId values US-001, US-002, … sequential across the whole backlog. Do NOT generate one flat list disconnected from FRs.

=== REQUIREMENT QUALITY SCORING (out of 100) ===
Score 10 dimensions, each 0-10: businessObjective, actorsStakeholders, functionalRequirements, businessRules, validations, workflowCoverage, exceptionHandling, integrations, nonFunctionalRequirements, testability.
A well-written enterprise requirement that covers objective, actors, workflow, validations, integrations and basic NFRs SHOULD score 85-95. Only deduct for genuine omissions. Record each deduction in scoreRationale.deductions explaining WHY points were deducted. qualityScore = SUM of the 10 dimensions.

=== USER STORY DETAIL ===
Each story: storyId (US-NNN), functionalRequirementId (FR-NNN), title, priority, businessValue, complexityPoints (Fibonacci 1/2/3/5/8/13), asA/iWant/soThat, and acceptanceCriteria with three concise Gherkin scenarios (happyPath, validation, exception).

=== CLARIFICATION QUESTIONS — GROUPED ===
Provide clarificationQuestions as a flat list (4-10 items) AND clarificationGroups as an array of { functionalRequirementId, functionalRequirementName, questions[] } so questions can be displayed beneath their parent FR.

=== STAKEHOLDERS ===
Each stakeholder: name, role, interest, influence, plus optional power, communicationFrequency, communicationMethod, raci (R/A/C/I), owner.

=== RISKS ===
Each risk: description, impact, likelihood, mitigation, optional category, optional functionalRequirementId (FR-NNN it relates to), optional userStoryId, optional owner, optional status.

=== BRD ===
Produce a concise brd object: executiveSummary, businessObjective, problemStatement, currentState, futureState, inScope[3-6], outOfScope[2-4], constraints[2-4], businessRules[3-6], dependencies[2-4], successMetrics[2-4].

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

Stay grounded in the user's exact wording. Output enterprise-grade artifacts with strict traceability BR → FR → US → AC → Risk.

Return ONLY valid minified JSON matching the requested shape. No markdown. No code fences.`;

const RESPONSE_SHAPE = `{
"suggestedTitle":"string",
"qualityScore":0,
"confidence":0,
"scoreBreakdown":{"businessObjective":0,"actorsStakeholders":0,"functionalRequirements":0,"businessRules":0,"validations":0,"workflowCoverage":0,"exceptionHandling":0,"integrations":0,"nonFunctionalRequirements":0,"testability":0},
"scoreRationale":{"strengths":["string"],"weaknesses":["string"],"deductions":[{"dimension":"string","points":0,"reason":"string"}]},
"ambiguities":[{"term":"exact substring","reason":"string"}],
"missingActors":["string"],"missingBusinessRules":["string"],"missingValidations":["string"],"missingWorkflows":["string"],"missingExceptionScenarios":["string"],"missingNonFunctionalRequirements":["string"],
"clarificationQuestions":["string"],"clarificationGroups":[{"functionalRequirementId":"FR-001","functionalRequirementName":"string","questions":["string"]}],
"improvementSuggestions":["string"],
"decomposition":{"businessRequirement":{"id":"BR-001","name":"string","description":"string"},"functionalRequirements":[{"id":"FR-001","name":"string","description":"string","category":"Functional","priority":"High","businessValue":"string","complexity":"Medium","businessOwner":"string","primaryStakeholder":"string","dependencies":["string"],"assumptions":["string"],"constraints":["string"],"sourceParagraph":"string","status":"Draft"}]},
"userStories":[{"storyId":"US-001","functionalRequirementId":"FR-001","title":"string","priority":"High","businessValue":"string","complexityPoints":5,"asA":"string","iWant":"string","soThat":"string","acceptanceCriteria":{"happyPath":"Given ...\\nWhen ...\\nThen ...","validation":"Given ...\\nWhen ...\\nThen ...","exception":"Given ...\\nWhen ...\\nThen ..."}}],
"stakeholders":[{"name":"string","role":"string","interest":"High","influence":"High","power":"High","communicationFrequency":"string","communicationMethod":"string","raci":"R","owner":"string"}],
"risks":[{"description":"string","impact":"High","likelihood":"Medium","mitigation":"string","category":"string","functionalRequirementId":"FR-001","userStoryId":"US-001","owner":"string","status":"Open"}],
"assumptions":["string"],"highlights":[{"text":"exact substring","category":"ambiguous","note":"string"}],
"brd":{"executiveSummary":"string","businessObjective":"string","problemStatement":"string","currentState":"string","futureState":"string","inScope":["string"],"outOfScope":["string"],"constraints":["string"],"businessRules":["string"],"dependencies":["string"],"successMetrics":["string"]},
"processFlow":{"actors":["string"],"activities":["string"],"decisionPoints":[{"question":"string","yesPath":"string","noPath":"string"}],"systemActions":["string"],"integrations":["string"],"endStates":["string"],"textFlow":["Start","→ step","Decision:","question?","Yes","→ step","No","→ step","End"],"mermaid":"flowchart TD\\nStart((Start)) --> A[Activity]\\nA --> End((End))","activityDiagram":{"startNode":"Start","endNodes":["End"],"activities":["string"],"decisions":[{"question":"string","yesPath":"string","noPath":"string"}],"alternatePaths":["string"],"exceptionPaths":["string"],"actorActions":[{"actor":"string","action":"string"}],"systemActions":["string"],"integrationPoints":["string"],"textActivityFlow":["Start","→ step","End"],"narrative":["Start","→ step","End"],"mermaid":"flowchart TD\\nStart((Start)) --> A[Activity]\\nA --> End((End))"}}
}`;
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

    const clippedText = text.trim().slice(0, 18_000);
    const userMsg = `RAW REQUIREMENT (analyze this exact text, nothing else):\n"""\n${clippedText}\n"""\n\n${
      title ? `Working title provided by user: "${title}"\n` : ""
    }Return compact JSON only. Match this shape exactly and keep every item traceable to the provided requirement text:\n${RESPONSE_SHAPE}`;

    const ac = new AbortController();
    const timeoutMs = 85_000;
    const timer = setTimeout(() => ac.abort(), timeoutMs);
    let aiRes: Response;
    try {
      aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Lovable-API-Key": apiKey,
          "X-Lovable-AIG-SDK": "vercel-ai-sdk",
        },
        signal: ac.signal,
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userMsg },
          ],
          response_format: { type: "json_object" },
          temperature: 0.2,
        }),
      });
    } catch (err) {
      clearTimeout(timer);
      const aborted = (err as Error)?.name === "AbortError";
      return new Response(
        JSON.stringify({
          error: aborted
            ? "AI analysis timed out. Please shorten the requirement and try again."
            : "AI gateway request failed.",
          detail: (err as Error)?.message,
        }),
        { status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    clearTimeout(timer);

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
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content === "string" && content.trim()) {
      let parsed: Record<string, unknown>;
      try { parsed = JSON.parse(content); }
      catch {
        console.error("AI gateway malformed JSON content", content.slice(0, 500));
        return new Response(JSON.stringify({ error: "AI returned malformed JSON analysis." }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const sb = (parsed.scoreBreakdown ?? {}) as Record<string, number>;
      const sum = Object.values(sb).reduce((a, n) => a + (typeof n === "number" ? n : 0), 0);
      if (sum > 0) parsed.qualityScore = Math.max(0, Math.min(100, sum));

      return new Response(JSON.stringify({ analysis: parsed }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
