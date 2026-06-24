import { type Requirement } from "./analyzer";

function downloadBlob(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportCSV(req: Requirement) {
  const rows: string[][] = [];
  rows.push(["Section", "Field", "Value"]);
  rows.push(["Requirement", "Title", req.title]);
  rows.push(["Requirement", "Quality Score", String(req.analysis.qualityScore)]);
  rows.push(["Requirement", "Raw Text", req.rawText]);
  req.analysis.ambiguities.forEach((a, i) => rows.push(["Ambiguity", `#${i + 1}`, `${a.term} — ${a.reason}`]));
  req.analysis.missingInfo.forEach((a, i) => rows.push(["Missing Info", `#${i + 1}`, a]));
  req.analysis.userStories.forEach((s, i) => {
    rows.push(["User Story", `#${i + 1} As a`, s.asA]);
    rows.push(["User Story", `#${i + 1} I want`, s.iWant]);
    rows.push(["User Story", `#${i + 1} So that`, s.soThat]);
    s.acceptanceCriteria.forEach((ac, j) =>
      rows.push(["Acceptance Criteria", `Story ${i + 1} AC ${j + 1}`, ac.replace(/\n/g, " | ")])
    );
  });
  req.analysis.risks.forEach((r, i) =>
    rows.push(["Risk", `#${i + 1}`, `${r.description} | Impact: ${r.impact} | Likelihood: ${r.likelihood} | Mitigation: ${r.mitigation}`])
  );
  req.analysis.stakeholders.forEach((s, i) =>
    rows.push(["Stakeholder", `#${i + 1}`, `${s.name} (${s.role}) - Interest: ${s.interest}, Influence: ${s.influence}`])
  );
  req.analysis.assumptions.forEach((a, i) => rows.push(["Assumption", `#${i + 1}`, a]));

  const csv = rows
    .map((r) => r.map((c) => `"${(c ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
  downloadBlob(csv, `${req.title.replace(/\s+/g, "_")}.csv`, "text/csv");
}

function renderHTML(req: Requirement) {
  const a = req.analysis;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${req.title}</title>
<style>
  body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:780px;margin:40px auto;padding:0 24px;color:#1a202c;line-height:1.6}
  h1{color:#1e40af;border-bottom:3px solid #1e40af;padding-bottom:8px}
  h2{color:#1e40af;margin-top:32px;border-bottom:1px solid #cbd5e1;padding-bottom:4px}
  .score{display:inline-block;background:#1e40af;color:#fff;padding:8px 16px;border-radius:6px;font-size:24px;font-weight:700}
  ul{padding-left:20px} li{margin:6px 0}
  .story{background:#f1f5f9;padding:16px;border-radius:8px;margin:12px 0;border-left:4px solid #1e40af}
  pre{background:#0f172a;color:#e2e8f0;padding:12px;border-radius:6px;overflow-x:auto;font-size:13px;white-space:pre-wrap}
  table{width:100%;border-collapse:collapse;margin:12px 0}
  th,td{border:1px solid #cbd5e1;padding:8px;text-align:left;font-size:14px}
  th{background:#e0e7ff}
</style></head><body>
<h1>${req.title}</h1>
<p>Generated ${new Date(req.createdAt).toLocaleDateString()}</p>
<div class="score">Quality Score: ${a.qualityScore}/100</div>

<h2>Original Requirement</h2>
<p>${req.rawText}</p>

<h2>Ambiguities</h2>
<ul>${a.ambiguities.map((x) => `<li><strong>"${escapeHtml(x.term)}"</strong> — ${escapeHtml(x.reason)}</li>`).join("") || "<li>None detected</li>"}</ul>

<h2>Missing Information</h2>
<ul>${a.missingInfo.map((x) => `<li>${x}</li>`).join("") || "<li>None detected</li>"}</ul>

<h2>Clarification Questions</h2>
<ul>${a.clarificationQuestions.map((x) => `<li>${x}</li>`).join("")}</ul>

<h2>Improvement Suggestions</h2>
<ul>${a.improvementSuggestions.map((x) => `<li>${x}</li>`).join("")}</ul>

<h2>User Stories</h2>
${a.userStories
  .map(
    (s, i) => `<div class="story">
  <strong>Story ${i + 1} · Priority: ${s.priority}</strong><br/>
  <strong>As a</strong> ${s.asA}<br/>
  <strong>I want</strong> ${s.iWant}<br/>
  <strong>So that</strong> ${s.soThat}<br/>
  <strong>Acceptance Criteria (Gherkin):</strong>
  ${s.acceptanceCriteria.map((ac) => `<pre>${ac}</pre>`).join("")}
</div>`
  )
  .join("")}

<h2>Stakeholders</h2>
<table><tr><th>Name</th><th>Role</th><th>Interest</th><th>Influence</th></tr>
${a.stakeholders.map((s) => `<tr><td>${s.name}</td><td>${s.role}</td><td>${s.interest}</td><td>${s.influence}</td></tr>`).join("")}
</table>

<h2>Risks</h2>
<table><tr><th>Description</th><th>Impact</th><th>Likelihood</th><th>Mitigation</th></tr>
${a.risks.map((r) => `<tr><td>${r.description}</td><td>${r.impact}</td><td>${r.likelihood}</td><td>${r.mitigation}</td></tr>`).join("")}
</table>

<h2>Assumptions</h2>
<ul>${a.assumptions.map((x) => `<li>${x}</li>`).join("")}</ul>
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
  // Word opens HTML files with .doc extension and proper MIME
  const html = renderHTML(req);
  const docxContent = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>${html}</html>`;
  downloadBlob(docxContent, `${req.title.replace(/\s+/g, "_")}.doc`, "application/msword");
}
