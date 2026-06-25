// Edge function: analyze-requirement
// Senior Business Analyst pipeline. Orchestrates MANY small AI calls in parallel so
// each individual gateway request stays well under the timeout, while the merged
// deliverable remains comprehensive. NO artificial caps on BRs / FRs / Stories /
// ACs / Risks / Stakeholders / BRD sections / RTM rows / Activity Diagram nodes.
//
// Pipeline (all of Stage 1 runs in parallel):
//   Stage 1:
//     A1  Decomposition  (BR + as many FRs as the text warrants)
//     A2  BRD            (15-section enterprise BRD)
//     A3  Process Flow + UML Activity Diagram
//     B1  Quality scoring + gap analysis + clarifications + improvements + highlights + assumptions
//     B2  Stakeholders + Risks
//   Stage 2 (after A1):
//     C   User Stories with full Gherkin AC, chunked across FR groups in parallel.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MODEL = "google/gemini-3-flash-preview";
const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const CALL_TIMEOUT_MS = 75_000;
const STORY_CHUNK_SIZE = 4; // small chunks → fast + richer per-FR stories

const BASE_PERSONA = `You are a Senior Business Analyst with 15+ years of enterprise experience producing BRD, FRD, RTM, Process Flow and Agile backlog artifacts. Analyze the requirement EXACTLY as written. Reference specific words, phrases, actors, processes, workflows, business rules, validations, integrations and edge cases present in the text. Every output item MUST be traceable to the requirement text. Generate AS MANY items as the requirement genuinely warrants — never truncate, never cap, never summarize away detail. Return ONLY valid minified JSON. No markdown. No code fences.`;

// ---------- Prompts (each focused → faster + richer) ----------

const PROMPT_A1 = `${BASE_PERSONA}

TASK A1 — REQUIREMENT DECOMPOSITION.

Decompose into ONE Business Requirement (BR-001) and a COMPREHENSIVE set of atomic Functional Requirements. Generate every FR the text genuinely supports — for a medium-to-large enterprise input expect 30-60+ FRs; for smaller ones fewer. Never cap. Each FR = ONE verifiable capability / rule / validation / integration / approval / notification / report / security or audit action.

FR categories: Functional, Business Rule, Validation, Calculation, Integration, Security, Audit, Notification, Reporting, Compliance, Workflow, Approval, Data Requirement, Document Requirement, Performance, Availability, Usability, Accessibility, Error Handling, Logging, API Requirement, Configuration.

Return JSON (minified):
{"suggestedTitle":"string","decomposition":{"businessRequirement":{"id":"BR-001","name":"string","description":"string"},"functionalRequirements":[{"id":"FR-001","name":"string","description":"string","category":"Functional","priority":"High","businessValue":"string","complexity":"Medium","businessOwner":"string","primaryStakeholder":"string","dependencies":["string"],"assumptions":["string"],"constraints":["string"],"sourceParagraph":"string","status":"Draft"}]}}`;

const PROMPT_A2 = `${BASE_PERSONA}

TASK A2 — BUSINESS REQUIREMENTS DOCUMENT (BRD).

Produce a full enterprise BRD. Each list section MUST be exhaustive (no caps): include every in-scope / out-of-scope item, every constraint, every business rule, every dependency, every success metric the requirement text supports or reasonably implies. Write executive-grade prose for the narrative fields.

Return JSON (minified):
{"brd":{"executiveSummary":"string","businessObjective":"string","problemStatement":"string","currentState":"string","futureState":"string","inScope":["string"],"outOfScope":["string"],"constraints":["string"],"businessRules":["string"],"dependencies":["string"],"successMetrics":["string"]}}`;

const PROMPT_A3 = `${BASE_PERSONA}

TASK A3 — PROCESS FLOW + UML ACTIVITY DIAGRAM.

Model the end-to-end process. Include EVERY actor, activity, decision, alternate path, exception path, integration point and system action the text implies — never cap.

Narrative format (textFlow / textActivityFlow / narrative): ["Start","→ <step>","Decision:","<question?>","Yes","→ ...","No","→ ...","End"]. Provide a clean mermaid 'flowchart TD' as a secondary visualization.

Return JSON (minified):
{"processFlow":{"actors":["string"],"activities":["string"],"decisionPoints":[{"question":"string","yesPath":"string","noPath":"string"}],"systemActions":["string"],"integrations":["string"],"endStates":["string"],"textFlow":["Start","→ step","End"],"mermaid":"flowchart TD\\nStart((Start)) --> A[Activity]\\nA --> End((End))","activityDiagram":{"startNode":"Start","endNodes":["End"],"activities":["string"],"decisions":[{"question":"string","yesPath":"string","noPath":"string"}],"alternatePaths":["string"],"exceptionPaths":["string"],"actorActions":[{"actor":"string","action":"string"}],"systemActions":["string"],"integrationPoints":["string"],"textActivityFlow":["Start","→ step","End"],"narrative":["Start","→ step","End"],"mermaid":"flowchart TD\\nStart((Start)) --> A[Activity]\\nA --> End((End))"}}}`;

const PROMPT_B1 = `${BASE_PERSONA}

TASK B1 — QUALITY SCORING + GAP ANALYSIS.

Score 10 dimensions, each 0-10: businessObjective, actorsStakeholders, functionalRequirements, businessRules, validations, workflowCoverage, exceptionHandling, integrations, nonFunctionalRequirements, testability. Well-written enterprise requirements should score 85-95. Deduct ONLY for genuine omissions; record each deduction with WHY.

Generate every item the requirement genuinely supports — NEVER cap:
- ambiguities (exact substring + reason)
- missingActors, missingBusinessRules, missingValidations, missingWorkflows, missingExceptionScenarios, missingNonFunctionalRequirements
- clarificationQuestions (flat) AND clarificationGroups grouped by inferred FR name
- improvementSuggestions
- assumptions
- highlights (exact substring + category ambiguous|missing|risk + note)

Return JSON (minified):
{"qualityScore":0,"confidence":0,"scoreBreakdown":{"businessObjective":0,"actorsStakeholders":0,"functionalRequirements":0,"businessRules":0,"validations":0,"workflowCoverage":0,"exceptionHandling":0,"integrations":0,"nonFunctionalRequirements":0,"testability":0},"scoreRationale":{"strengths":["string"],"weaknesses":["string"],"deductions":[{"dimension":"string","points":0,"reason":"string"}]},"ambiguities":[{"term":"string","reason":"string"}],"missingActors":["string"],"missingBusinessRules":["string"],"missingValidations":["string"],"missingWorkflows":["string"],"missingExceptionScenarios":["string"],"missingNonFunctionalRequirements":["string"],"clarificationQuestions":["string"],"clarificationGroups":[{"functionalRequirementName":"string","questions":["string"]}],"improvementSuggestions":["string"],"assumptions":["string"],"highlights":[{"text":"string","category":"ambiguous","note":"string"}]}`;

const PROMPT_B2 = `${BASE_PERSONA}

TASK B2 — STAKEHOLDERS + RISKS.

Identify EVERY stakeholder (internal, external, regulatory, system owners, end users, support, ops) and EVERY risk (business, technical, compliance, security, operational, integration, data, schedule, change-management) the requirement implies. Never cap. For each risk, name the functional requirement it relates to when possible.

Return JSON (minified):
{"stakeholders":[{"name":"string","role":"string","interest":"High","influence":"High","power":"High","communicationFrequency":"string","communicationMethod":"string","raci":"R","owner":"string"}],"risks":[{"description":"string","impact":"High","likelihood":"Medium","mitigation":"string","category":"string","functionalRequirementName":"string","owner":"string","status":"Open"}]}`;

const PROMPT_C = `${BASE_PERSONA}

TASK C — USER STORY GENERATION FOR A BATCH OF FRs.

For EACH provided FR, generate 1-4 atomic user stories (more if the FR genuinely needs further decomposition). Never cap. Every story MUST carry functionalRequirementId equal to its parent FR id (exactly as given). Each story includes: storyId, title, priority, businessValue, complexityPoints (Fibonacci 1/2/3/5/8/13), asA / iWant / soThat, and acceptanceCriteria with three full Gherkin scenarios (happyPath, validation, exception) — each scenario MUST contain Given / When / Then lines.

Return JSON (minified):
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

function buildUserMsg(label: string, text: string, title?: string, extra?: string) {
  return `RAW REQUIREMENT (analyze this exact text only):\n"""\n${text}\n"""${
    title ? `\nWorking title: "${title}"` : ""
  }\n\n${label}${extra ? `\n\n${extra}` : ""}`;
}

// ---------- Stage runners ----------

async function safeCall(apiKey: string, prompt: string, msg: string, label: string) {
  try { return await callAI(apiKey, prompt, msg); }
  catch (e) { console.error(`${label} failed:`, (e as Error).message); return null; }
}

async function runStageC(apiKey: string, text: string, title: string | undefined, frs: any[]) {
  if (!Array.isArray(frs) || frs.length === 0) return [];
  const chunks: any[][] = [];
  for (let i = 0; i < frs.length; i += STORY_CHUNK_SIZE) chunks.push(frs.slice(i, i + STORY_CHUNK_SIZE));

  const results = await Promise.all(
    chunks.map(async (chunk, idx) => {
      const frList = chunk
        .map((fr) => `- ${fr.id} | ${fr.name} | category=${fr.category ?? ""} | priority=${fr.priority ?? ""}\n  ${fr.description ?? ""}`)
        .join("\n");
      const startIdx = idx * STORY_CHUNK_SIZE * 4 + 1;
      const extra = `Functional Requirements to cover in THIS batch (every story.functionalRequirementId MUST match one of these IDs exactly):\n${frList}\n\nStart storyId numbering at US-${String(startIdx).padStart(3, "0")} (we'll re-sequence later — just keep unique within this batch).`;
      const out = await safeCall(apiKey, PROMPT_C, buildUserMsg("TASK C INPUT", text, title, extra), `Stage C chunk ${idx}`);
      return Array.isArray(out?.userStories) ? out.userStories : [];
    }),
  );

  const flat = results.flat();
  return flat.map((s: any, i: number) => ({ ...s, storyId: `US-${String(i + 1).padStart(3, "0")}` }));
}

// ---------- Merging helpers ----------

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

    const clippedText = text.trim().slice(0, 32_000);
    const baseMsg = (label: string) => buildUserMsg(label, clippedText, title);

    // --- Stage 1: 5 calls in parallel. A1 is the only one Stage C depends on. ---
    const a1Promise = callAI(apiKey, PROMPT_A1, baseMsg("TASK A1 INPUT"));
    const a2Promise = safeCall(apiKey, PROMPT_A2, baseMsg("TASK A2 INPUT"), "A2 BRD");
    const a3Promise = safeCall(apiKey, PROMPT_A3, baseMsg("TASK A3 INPUT"), "A3 Process Flow");
    const b1Promise = safeCall(apiKey, PROMPT_B1, baseMsg("TASK B1 INPUT"), "B1 Quality/Gaps");
    const b2Promise = safeCall(apiKey, PROMPT_B2, baseMsg("TASK B2 INPUT"), "B2 Stakeholders/Risks");

    let stageA1: any;
    try {
      stageA1 = await a1Promise;
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
        error: aborted ? "AI decomposition timed out. Please shorten the requirement and try again." : "Decomposition AI call failed.",
        detail: msg,
      }), { status: aborted ? 504 : 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const frs: any[] = stageA1?.decomposition?.functionalRequirements ?? [];

    // Kick off Stage C as soon as we have FRs — runs in parallel with the rest of Stage 1.
    const cPromise = runStageC(apiKey, clippedText, title, frs).catch((e) => {
      console.error("Stage C failed:", e);
      return [] as any[];
    });

    // Await the remaining Stage 1 + Stage C concurrently.
    const [stageA2, stageA3, stageB1, stageB2, userStories] = await Promise.all([
      a2Promise, a3Promise, b1Promise, b2Promise, cPromise,
    ]);

    // --- Merge ---
    const clarificationGroups = mapClarificationGroupsToFRIds(stageB1?.clarificationGroups ?? [], frs);
    const risks = mapRisksToFRIds(stageB2?.risks ?? [], frs);

    const sb = (stageB1?.scoreBreakdown ?? {}) as Record<string, number>;
    const sum = Object.values(sb).reduce((a, n) => a + (typeof n === "number" ? n : 0), 0);
    const qualityScore = sum > 0 ? Math.max(0, Math.min(100, sum)) : (stageB1?.qualityScore ?? 0);

    const analysis = {
      suggestedTitle: stageA1?.suggestedTitle ?? title ?? "",
      qualityScore,
      confidence: stageB1?.confidence ?? 0,
      scoreBreakdown: stageB1?.scoreBreakdown ?? {},
      scoreRationale: stageB1?.scoreRationale ?? { strengths: [], weaknesses: [], deductions: [] },
      ambiguities: stageB1?.ambiguities ?? [],
      missingActors: stageB1?.missingActors ?? [],
      missingBusinessRules: stageB1?.missingBusinessRules ?? [],
      missingValidations: stageB1?.missingValidations ?? [],
      missingWorkflows: stageB1?.missingWorkflows ?? [],
      missingExceptionScenarios: stageB1?.missingExceptionScenarios ?? [],
      missingNonFunctionalRequirements: stageB1?.missingNonFunctionalRequirements ?? [],
      clarificationQuestions: stageB1?.clarificationQuestions ?? [],
      clarificationGroups,
      improvementSuggestions: stageB1?.improvementSuggestions ?? [],
      decomposition: stageA1?.decomposition ?? { businessRequirement: { id: "BR-001", name: "", description: "" }, functionalRequirements: [] },
      userStories,
      stakeholders: stageB2?.stakeholders ?? [],
      risks,
      assumptions: stageB1?.assumptions ?? [],
      highlights: stageB1?.highlights ?? [],
      brd: stageA2?.brd ?? {},
      processFlow: stageA3?.processFlow ?? {},
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
