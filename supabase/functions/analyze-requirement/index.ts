// Edge function: analyze-requirement
// Senior Business Analyst pipeline. Splits the work into multiple smaller AI calls
// so each request stays well under the gateway timeout, while the AGGREGATED
// deliverable remains comprehensive (no artificial caps on BRs/FRs/Stories/Risks/ACs).
//
// Pipeline:
//   Stage 1 (parallel):
//     A. Decomposition + BRD + Process Flow (+ Activity Diagram)
//     B. Quality scoring + ambiguities + missing items + clarifications + improvements
//        + stakeholders + risks + assumptions + highlights
//   Stage 2 (sequential, fan-out per FR chunk):
//     C. User stories with Gherkin AC — chunked across FR groups so each call is small.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MODEL = "google/gemini-3-flash-preview";
const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const CALL_TIMEOUT_MS = 70_000;

const BASE_PERSONA = `You are a Senior Business Analyst with 15+ years of enterprise experience producing BRD, FRD, RTM, Process Flow and Agile backlog artifacts. Analyze the requirement EXACTLY as written. Reference specific words, phrases, actors, processes, workflows, business rules, validations, integrations and edge cases present in the text. Every output item MUST be traceable to the requirement text. Return ONLY valid minified JSON. No markdown. No code fences.`;

// ---------- Prompts ----------

const PROMPT_A = `${BASE_PERSONA}

TASK A — REQUIREMENT DECOMPOSITION + BRD + PROCESS FLOW.

Decompose the stakeholder input into ONE Business Requirement (BR-001) and as many atomic Functional Requirements as the text genuinely contains. Do NOT cap the count — generate as many FRs as needed (could be 3, could be 25+). Each FR = one verifiable capability / rule / validation / integration / approval / notification / report / security or audit action.

FR category vocabulary: Functional, Business Rule, Validation, Calculation, Integration, Security, Audit, Notification, Reporting, Compliance, Workflow, Approval, Data Requirement, Document Requirement, Performance, Availability, Usability, Accessibility, Error Handling, Logging, API Requirement, Configuration.

Also produce:
- brd: executiveSummary, businessObjective, problemStatement, currentState, futureState, inScope[], outOfScope[], constraints[], businessRules[], dependencies[], successMetrics[] — sized to the requirement (no artificial caps).
- processFlow with both a business view and a UML activity diagram view. Narrative format: ["Start","→ <step>","Decision:","<question?>","Yes","→ ...","No","→ ...","End"]. Provide a simple mermaid flowchart TD as fallback.

Return JSON exactly in this shape (minified):
{"suggestedTitle":"string","decomposition":{"businessRequirement":{"id":"BR-001","name":"string","description":"string"},"functionalRequirements":[{"id":"FR-001","name":"string","description":"string","category":"Functional","priority":"High","businessValue":"string","complexity":"Medium","businessOwner":"string","primaryStakeholder":"string","dependencies":["string"],"assumptions":["string"],"constraints":["string"],"sourceParagraph":"string","status":"Draft"}]},"brd":{"executiveSummary":"string","businessObjective":"string","problemStatement":"string","currentState":"string","futureState":"string","inScope":["string"],"outOfScope":["string"],"constraints":["string"],"businessRules":["string"],"dependencies":["string"],"successMetrics":["string"]},"processFlow":{"actors":["string"],"activities":["string"],"decisionPoints":[{"question":"string","yesPath":"string","noPath":"string"}],"systemActions":["string"],"integrations":["string"],"endStates":["string"],"textFlow":["Start","→ step","End"],"mermaid":"flowchart TD\\nStart((Start)) --> A[Activity]\\nA --> End((End))","activityDiagram":{"startNode":"Start","endNodes":["End"],"activities":["string"],"decisions":[{"question":"string","yesPath":"string","noPath":"string"}],"alternatePaths":["string"],"exceptionPaths":["string"],"actorActions":[{"actor":"string","action":"string"}],"systemActions":["string"],"integrationPoints":["string"],"textActivityFlow":["Start","→ step","End"],"narrative":["Start","→ step","End"],"mermaid":"flowchart TD\\nStart((Start)) --> A[Activity]\\nA --> End((End))"}}}`;

const PROMPT_B = `${BASE_PERSONA}

TASK B — QUALITY ANALYSIS + GAP ANALYSIS + STAKEHOLDERS + RISKS.

Score 10 dimensions, each 0-10: businessObjective, actorsStakeholders, functionalRequirements, businessRules, validations, workflowCoverage, exceptionHandling, integrations, nonFunctionalRequirements, testability. A well-written enterprise requirement covering objective, actors, workflow, validations, integrations and basic NFRs SHOULD score 85-95. Deduct ONLY for genuine omissions; record each deduction with WHY.

Generate as many items as the requirement genuinely warrants — DO NOT cap counts artificially:
- ambiguities (exact substring + reason)
- missingActors, missingBusinessRules, missingValidations, missingWorkflows, missingExceptionScenarios, missingNonFunctionalRequirements
- clarificationQuestions (flat list) AND clarificationGroups grouped by FR name (use the FR names you infer from the text)
- improvementSuggestions
- assumptions
- stakeholders (name, role, interest, influence, power, communicationFrequency, communicationMethod, raci, owner)
- risks (description, impact, likelihood, mitigation, category, owner, status — and a functionalRequirementName if you can name the FR it relates to)
- highlights (exact substring + category ambiguous|missing|risk + note)

Return JSON exactly in this shape (minified):
{"qualityScore":0,"confidence":0,"scoreBreakdown":{"businessObjective":0,"actorsStakeholders":0,"functionalRequirements":0,"businessRules":0,"validations":0,"workflowCoverage":0,"exceptionHandling":0,"integrations":0,"nonFunctionalRequirements":0,"testability":0},"scoreRationale":{"strengths":["string"],"weaknesses":["string"],"deductions":[{"dimension":"string","points":0,"reason":"string"}]},"ambiguities":[{"term":"string","reason":"string"}],"missingActors":["string"],"missingBusinessRules":["string"],"missingValidations":["string"],"missingWorkflows":["string"],"missingExceptionScenarios":["string"],"missingNonFunctionalRequirements":["string"],"clarificationQuestions":["string"],"clarificationGroups":[{"functionalRequirementName":"string","questions":["string"]}],"improvementSuggestions":["string"],"assumptions":["string"],"stakeholders":[{"name":"string","role":"string","interest":"High","influence":"High","power":"High","communicationFrequency":"string","communicationMethod":"string","raci":"R","owner":"string"}],"risks":[{"description":"string","impact":"High","likelihood":"Medium","mitigation":"string","category":"string","functionalRequirementName":"string","owner":"string","status":"Open"}],"highlights":[{"text":"string","category":"ambiguous","note":"string"}]}`;

const PROMPT_C = `${BASE_PERSONA}

TASK C — USER STORY GENERATION FOR A SUBSET OF FRs.

For EACH provided Functional Requirement, generate 1–3 atomic user stories (more if the FR genuinely needs decomposition; fewer only if trivial). Do NOT cap the count artificially. Every story MUST carry functionalRequirementId equal to its parent FR id (exactly as given). Each story includes: storyId (use the starting index hint provided to make them sequential US-NNN), title, priority, businessValue, complexityPoints (Fibonacci 1/2/3/5/8/13), asA / iWant / soThat, and acceptanceCriteria with three Gherkin scenarios: happyPath, validation, exception.

Return JSON exactly in this shape (minified):
{"userStories":[{"storyId":"US-001","functionalRequirementId":"FR-001","title":"string","priority":"High","businessValue":"string","complexityPoints":5,"asA":"string","iWant":"string","soThat":"string","acceptanceCriteria":{"happyPath":"Given ...\\nWhen ...\\nThen ...","validation":"Given ...\\nWhen ...\\nThen ...","exception":"Given ...\\nWhen ...\\nThen ..."}}]}`;

// ---------- AI call helper ----------

async function callAI(apiKey: string, systemPrompt: string, userMsg: string): Promise<any> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), CALL_TIMEOUT_MS);
  try {
    const res = await fetch(AI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "vercel-ai-sdk",
      },
      signal: ac.signal,
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMsg },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
      }),
    });
    if (res.status === 429) throw new Error("RATE_LIMIT");
    if (res.status === 402) throw new Error("CREDITS_EXHAUSTED");
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`AI_HTTP_${res.status}: ${body.slice(0, 300)}`);
    }
    const raw = await res.text();
    if (!raw) throw new Error("AI gateway returned an empty response.");
    const data = JSON.parse(raw);
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      throw new Error(`AI returned no content (finish_reason: ${data?.choices?.[0]?.finish_reason ?? "unknown"}).`);
    }
    return JSON.parse(content);
  } finally {
    clearTimeout(timer);
  }
}

// ---------- Stage runners ----------

function buildUserMsg(label: string, text: string, title?: string, extra?: string) {
  return `RAW REQUIREMENT (analyze this exact text only):\n"""\n${text}\n"""${
    title ? `\nWorking title: "${title}"` : ""
  }\n\n${label}${extra ? `\n\n${extra}` : ""}`;
}

async function runStageC(apiKey: string, text: string, title: string | undefined, frs: any[]) {
  if (!Array.isArray(frs) || frs.length === 0) return [];
  // Chunk FRs so each story-generation call stays small/fast.
  const CHUNK = 5;
  const chunks: any[][] = [];
  for (let i = 0; i < frs.length; i += CHUNK) chunks.push(frs.slice(i, i + CHUNK));

  let storyCursor = 1;
  const results = await Promise.all(
    chunks.map(async (chunk) => {
      const startIdx = storyCursor;
      storyCursor += chunk.length * 3; // reserve a generous range; we re-id at the end
      const frList = chunk
        .map((fr) => `- ${fr.id} | ${fr.name} | category=${fr.category ?? ""} | priority=${fr.priority ?? ""}\n  ${fr.description ?? ""}`)
        .join("\n");
      const extra = `Functional Requirements to cover in THIS batch (generate stories ONLY for these — every story.functionalRequirementId MUST match one of these IDs exactly):\n${frList}\n\nStart numbering storyId at US-${String(startIdx).padStart(3, "0")} (we'll re-sequence later — just keep them unique within this batch).`;
      const out = await callAI(apiKey, PROMPT_C, buildUserMsg("TASK C INPUT", text, title, extra));
      return Array.isArray(out?.userStories) ? out.userStories : [];
    }),
  );

  // Flatten + re-sequence storyIds across all chunks for global uniqueness.
  const flat = results.flat();
  return flat.map((s: any, i: number) => ({
    ...s,
    storyId: `US-${String(i + 1).padStart(3, "0")}`,
  }));
}

// ---------- Merging / post-processing ----------

function mapClarificationGroupsToFRIds(groups: any[], frs: any[]) {
  if (!Array.isArray(groups)) return [];
  return groups.map((g) => {
    const match = frs.find(
      (fr) => fr.name && g.functionalRequirementName &&
        fr.name.toLowerCase().trim() === String(g.functionalRequirementName).toLowerCase().trim(),
    );
    return {
      functionalRequirementId: match?.id ?? "",
      functionalRequirementName: g.functionalRequirementName ?? match?.name ?? "",
      questions: Array.isArray(g.questions) ? g.questions : [],
    };
  });
}

function mapRisksToFRIds(risks: any[], frs: any[]) {
  if (!Array.isArray(risks)) return [];
  return risks.map((r) => {
    if (r.functionalRequirementId) return r;
    const match = frs.find(
      (fr) => fr.name && r.functionalRequirementName &&
        fr.name.toLowerCase().trim() === String(r.functionalRequirementName).toLowerCase().trim(),
    );
    return { ...r, functionalRequirementId: match?.id ?? "" };
  });
}

// ---------- Handler ----------

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

    const clippedText = text.trim().slice(0, 24_000);

    // --- Stage 1: parallel A + B ---
    let stageA: any, stageB: any;
    try {
      [stageA, stageB] = await Promise.all([
        callAI(apiKey, PROMPT_A, buildUserMsg("TASK A INPUT", clippedText, title)),
        callAI(apiKey, PROMPT_B, buildUserMsg("TASK B INPUT", clippedText, title)),
      ]);
    } catch (err) {
      const msg = (err as Error).message ?? "AI request failed.";
      if (msg === "RATE_LIMIT") {
        return new Response(JSON.stringify({ error: "Rate limit reached. Please try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (msg === "CREDITS_EXHAUSTED") {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits in workspace settings." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const aborted = (err as Error)?.name === "AbortError";
      return new Response(JSON.stringify({
        error: aborted ? "AI analysis timed out. Please shorten the requirement and try again." : "Stage 1 AI request failed.",
        detail: msg,
      }), { status: aborted ? 504 : 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const frs: any[] = stageA?.decomposition?.functionalRequirements ?? [];

    // --- Stage 2: stories (chunked, parallel within stage) ---
    let userStories: any[] = [];
    try {
      userStories = await runStageC(apiKey, clippedText, title, frs);
    } catch (err) {
      console.error("Stage C failed; returning partial analysis", err);
      userStories = [];
    }

    // --- Merge ---
    const clarificationGroups = mapClarificationGroupsToFRIds(stageB?.clarificationGroups ?? [], frs);
    const risks = mapRisksToFRIds(stageB?.risks ?? [], frs);

    const sb = (stageB?.scoreBreakdown ?? {}) as Record<string, number>;
    const sum = Object.values(sb).reduce((a, n) => a + (typeof n === "number" ? n : 0), 0);
    const qualityScore = sum > 0 ? Math.max(0, Math.min(100, sum)) : (stageB?.qualityScore ?? 0);

    const analysis = {
      suggestedTitle: stageA?.suggestedTitle ?? title ?? "",
      qualityScore,
      confidence: stageB?.confidence ?? 0,
      scoreBreakdown: stageB?.scoreBreakdown ?? {},
      scoreRationale: stageB?.scoreRationale ?? { strengths: [], weaknesses: [], deductions: [] },
      ambiguities: stageB?.ambiguities ?? [],
      missingActors: stageB?.missingActors ?? [],
      missingBusinessRules: stageB?.missingBusinessRules ?? [],
      missingValidations: stageB?.missingValidations ?? [],
      missingWorkflows: stageB?.missingWorkflows ?? [],
      missingExceptionScenarios: stageB?.missingExceptionScenarios ?? [],
      missingNonFunctionalRequirements: stageB?.missingNonFunctionalRequirements ?? [],
      clarificationQuestions: stageB?.clarificationQuestions ?? [],
      clarificationGroups,
      improvementSuggestions: stageB?.improvementSuggestions ?? [],
      decomposition: stageA?.decomposition ?? { businessRequirement: { id: "BR-001", name: "", description: "" }, functionalRequirements: [] },
      userStories,
      stakeholders: stageB?.stakeholders ?? [],
      risks,
      assumptions: stageB?.assumptions ?? [],
      highlights: stageB?.highlights ?? [],
      brd: stageA?.brd ?? {},
      processFlow: stageA?.processFlow ?? {},
    };

    return new Response(JSON.stringify({ analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-requirement error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
