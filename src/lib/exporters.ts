import { type Requirement } from "./analyzer";

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function downloadBlob(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const AC_LABELS: { key: "happyPath" | "validation" | "exception"; label: string }[] = [
  { key: "happyPath", label: "Happy Path" },
  { key: "validation", label: "Validation" },
  { key: "exception", label: "Exception" },
];

export function exportCSV(req: Requirement) {
  const rows: string[][] = [];
  rows.push(["Section", "Field", "Value"]);
  rows.push(["Requirement", "Title", req.title]);
  rows.push(["Requirement", "Quality Score", String(req.analysis.qualityScore)]);
  rows.push(["Requirement", "Confidence", String(req.analysis.confidence)]);
  rows.push(["Requirement", "Raw Text", req.rawText]);

  const sb = req.analysis.scoreBreakdown;
  Object.entries(sb).forEach(([k, v]) => rows.push(["Score Breakdown", k, `${v}/10`]));

  req.analysis.ambiguities.forEach((a, i) => rows.push(["Ambiguity", `#${i + 1}`, `${a.term} — ${a.reason}`]));
  req.analysis.missingInfo.forEach((a, i) => rows.push(["Missing Info", `#${i + 1}`, a]));

  req.analysis.userStories.forEach((s) => {
    rows.push(["User Story", `${s.storyId} Title`, s.title]);
    rows.push(["User Story", `${s.storyId} Priority`, s.priority]);
    rows.push(["User Story", `${s.storyId} Points`, String(s.complexityPoints)]);
    rows.push(["User Story", `${s.storyId} Business Value`, s.businessValue]);
    rows.push(["User Story", `${s.storyId} As a`, s.asA]);
    rows.push(["User Story", `${s.storyId} I want`, s.iWant]);
    rows.push(["User Story", `${s.storyId} So that`, s.soThat]);
    AC_LABELS.forEach(({ key, label }) =>
      rows.push(["Acceptance Criteria", `${s.storyId} ${label}`, (s.acceptanceCriteria[key] ?? "").replace(/\n/g, " | ")])
    );
  });

  req.analysis.risks.forEach((r, i) =>
    rows.push(["Risk", `#${i + 1}`, `${r.description} | Impact: ${r.impact} | Likelihood: ${r.likelihood} | Mitigation: ${r.mitigation}`])
  );
  req.analysis.stakeholders.forEach((s, i) =>
    rows.push(["Stakeholder", `#${i + 1}`, `${s.name} (${s.role}) - Interest: ${s.interest}, Influence: ${s.influence}`])
  );
  req.analysis.assumptions.forEach((a, i) => rows.push(["Assumption", `#${i + 1}`, a]));

  const csv = rows.map((r) => r.map((c) => `"${(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  downloadBlob(csv, `${req.title.replace(/\s+/g, "_")}.csv`, "text/csv");
}

function renderHTML(req: Requirement) {
  const a = req.analysis;
  const sbRows = Object.entries(a.scoreBreakdown)
    .map(([k, v]) => `<tr><td>${k}</td><td>${v}/10</td></tr>`)
    .join("");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(req.title)}</title>
<style>
  body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:820px;margin:40px auto;padding:0 24px;color:#1a202c;line-height:1.6}
  h1{color:#1e40af;border-bottom:3px solid #1e40af;padding-bottom:8px}
  h2{color:#1e40af;margin-top:32px;border-bottom:1px solid #cbd5e1;padding-bottom:4px}
  h3{color:#1e40af;margin-top:18px}
  .score{display:inline-block;background:#1e40af;color:#fff;padding:8px 16px;border-radius:6px;font-size:24px;font-weight:700}
  ul{padding-left:20px} li{margin:6px 0}
  .story{background:#f1f5f9;padding:16px;border-radius:8px;margin:12px 0;border-left:4px solid #1e40af}
  .meta{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0}
  .meta span{background:#e0e7ff;color:#1e40af;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:600}
  pre{background:#0f172a;color:#e2e8f0;padding:12px;border-radius:6px;overflow-x:auto;font-size:13px;white-space:pre-wrap}
  table{width:100%;border-collapse:collapse;margin:12px 0}
  th,td{border:1px solid #cbd5e1;padding:8px;text-align:left;font-size:14px}
  th{background:#e0e7ff}
</style></head><body>
<h1>${escapeHtml(req.title)}</h1>
<p>Generated ${new Date(req.createdAt).toLocaleDateString()} · Confidence ${a.confidence}%</p>
<div class="score">Quality Score: ${a.qualityScore}/100</div>

<h2>Score Breakdown</h2>
<table><tr><th>Dimension</th><th>Score</th></tr>${sbRows}</table>

<h3>Strengths</h3>
<ul>${a.scoreRationale.strengths.map((x) => `<li>${escapeHtml(x)}</li>`).join("") || "<li>—</li>"}</ul>
<h3>Weaknesses</h3>
<ul>${a.scoreRationale.weaknesses.map((x) => `<li>${escapeHtml(x)}</li>`).join("") || "<li>—</li>"}</ul>
<h3>Deductions</h3>
<ul>${a.scoreRationale.deductions.map((d) => `<li><strong>${escapeHtml(d.dimension)}</strong> (${d.points}/10) — ${escapeHtml(d.reason)}</li>`).join("") || "<li>—</li>"}</ul>

<h2>Original Requirement</h2>
<p>${escapeHtml(req.rawText)}</p>

<h2>Ambiguities</h2>
<ul>${a.ambiguities.map((x) => `<li><strong>"${escapeHtml(x.term)}"</strong> — ${escapeHtml(x.reason)}</li>`).join("") || "<li>None detected</li>"}</ul>

<h2>Missing Information</h2>
<ul>${a.missingInfo.map((x) => `<li>${escapeHtml(x)}</li>`).join("") || "<li>None detected</li>"}</ul>

<h2>Clarification Questions</h2>
<ul>${a.clarificationQuestions.map((x) => `<li>${escapeHtml(x)}</li>`).join("")}</ul>

<h2>Improvement Suggestions</h2>
<ul>${a.improvementSuggestions.map((x) => `<li>${escapeHtml(x)}</li>`).join("")}</ul>

<h2>User Stories (${a.userStories.length})</h2>
${a.userStories
  .map(
    (s) => `<div class="story">
  <strong>${escapeHtml(s.storyId)} · ${escapeHtml(s.title)}</strong>
  <div class="meta"><span>${s.priority}</span><span>${s.complexityPoints} pts</span></div>
  <em>${escapeHtml(s.businessValue)}</em><br/><br/>
  <strong>As a</strong> ${escapeHtml(s.asA)}<br/>
  <strong>I want</strong> ${escapeHtml(s.iWant)}<br/>
  <strong>So that</strong> ${escapeHtml(s.soThat)}<br/>
  <strong>Acceptance Criteria:</strong>
  ${AC_LABELS.map(({ key, label }) => `<div><em>${label}</em><pre>${escapeHtml(s.acceptanceCriteria[key] ?? "")}</pre></div>`).join("")}
</div>`
  )
  .join("")}

<h2>Stakeholders</h2>
<table><tr><th>Name</th><th>Role</th><th>Interest</th><th>Influence</th></tr>
${a.stakeholders.map((s) => `<tr><td>${escapeHtml(s.name)}</td><td>${escapeHtml(s.role)}</td><td>${s.interest}</td><td>${s.influence}</td></tr>`).join("")}
</table>

<h2>Risks</h2>
<table><tr><th>Description</th><th>Impact</th><th>Likelihood</th><th>Mitigation</th></tr>
${a.risks.map((r) => `<tr><td>${escapeHtml(r.description)}</td><td>${r.impact}</td><td>${r.likelihood}</td><td>${escapeHtml(r.mitigation)}</td></tr>`).join("")}
</table>

<h2>Assumptions</h2>
<ul>${a.assumptions.map((x) => `<li>${escapeHtml(x)}</li>`).join("")}</ul>
</body></html>`;
}

export function exportPDF(req: Requirement) {
  const html = renderHTML(req);
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  setTimeout(() => w.print(), 400);
}

export function exportDOCX(req: Requirement) {
  const html = renderHTML(req);
  const docxContent = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>${html}</html>`;
  downloadBlob(docxContent, `${req.title.replace(/\s+/g, "_")}.doc`, "application/msword");
}
