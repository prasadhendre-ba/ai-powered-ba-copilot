import { useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertTriangle,
  HelpCircle,
  Lightbulb,
  FileText,
  Users,
  ShieldAlert,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileType2,
  Printer,
  Trash2,
  Plus,
  Gauge,
} from "lucide-react";
import { exportCSV, exportDOCX, exportPDF } from "@/lib/exporters";
import { toast } from "sonner";
import { SCORE_DIMENSIONS, type Highlight, type Requirement } from "@/lib/analyzer";

const CATEGORY_STYLE: Record<Highlight["category"], string> = {
  ambiguous: "bg-warning/25 text-warning-foreground underline decoration-warning decoration-wavy",
  missing: "bg-primary/15 text-primary underline decoration-primary decoration-dotted",
  risk: "bg-destructive/15 text-destructive underline decoration-destructive decoration-wavy",
};

function HighlightedText({ req }: { req: Requirement }) {
  const text = req.rawText;
  const highlights = req.analysis.highlights ?? [];

  // Build a sorted, non-overlapping span list.
  type Span = { start: number; end: number; h: Highlight };
  const spans: Span[] = [];
  const lower = text.toLowerCase();
  for (const h of highlights) {
    if (!h.text) continue;
    const needle = h.text.toLowerCase();
    let from = 0;
    while (true) {
      const idx = lower.indexOf(needle, from);
      if (idx === -1) break;
      spans.push({ start: idx, end: idx + h.text.length, h });
      from = idx + h.text.length;
      break; // only first occurrence per highlight
    }
  }
  spans.sort((a, b) => a.start - b.start || b.end - a.end);
  const merged: Span[] = [];
  for (const s of spans) {
    const last = merged[merged.length - 1];
    if (last && s.start < last.end) continue;
    merged.push(s);
  }

  if (!merged.length) {
    return (
      <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed bg-muted/40 p-4 rounded-lg border border-border">
        {text}
      </p>
    );
  }

  const parts: React.ReactNode[] = [];
  let cursor = 0;
  merged.forEach((s, i) => {
    if (s.start > cursor) parts.push(<span key={`t-${i}`}>{text.slice(cursor, s.start)}</span>);
    parts.push(
      <span
        key={`h-${i}`}
        title={`${s.h.category.toUpperCase()}: ${s.h.note}`}
        className={`rounded px-0.5 ${CATEGORY_STYLE[s.h.category]}`}
      >
        {text.slice(s.start, s.end)}
      </span>
    );
    cursor = s.end;
  });
  if (cursor < text.length) parts.push(<span key="tail">{text.slice(cursor)}</span>);

  return (
    <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed bg-muted/40 p-4 rounded-lg border border-border">
      {parts}
    </div>
  );
}

function ScoreBar({ label, value, max = 100 }: { label: string; value: number; max?: number }) {
  const pct = max === 10 ? value * 10 : value;
  const tone = pct >= 75 ? "text-success" : pct >= 50 ? "text-warning" : "text-destructive";
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className={`font-semibold ${tone}`}>{value}/{max}</span>
      </div>
      <Progress value={pct} className="h-1.5" />
    </div>
  );
}

function MissingBlock({ title, items }: { title: string; items: string[] }) {
  if (!items?.length) return null;
  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{title}</p>
      <ul className="space-y-1.5">
        {items.map((x, i) => (
          <li key={i} className="text-sm text-foreground flex gap-2">
            <span className="text-primary shrink-0">•</span>
            <span>{x}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Artifacts() {
  const [params, setParams] = useSearchParams();
  const requirements = useStore((s) => s.requirements);
  const deleteRequirement = useStore((s) => s.deleteRequirement);
  const selectedId = params.get("id") ?? requirements[0]?.id;
  const req = useMemo(() => requirements.find((r) => r.id === selectedId), [requirements, selectedId]);
  const [tab, setTab] = useState("analysis");

  if (!req) {
    return (
      <Card className="max-w-md mx-auto mt-12 shadow-soft">
        <CardContent className="p-8 text-center space-y-4">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">No requirements yet. Analyze your first one.</p>
          <Button asChild className="bg-gradient-primary">
            <Link to="/analyzer">
              <Plus className="h-4 w-4 mr-2" /> New Analysis
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const a = req.analysis;
  const scoreTone =
    a.qualityScore >= 80 ? "text-success" : a.qualityScore >= 60 ? "text-warning" : "text-destructive";
  const scoreLabel =
    a.qualityScore >= 80 ? "Excellent" : a.qualityScore >= 60 ? "Good" : a.qualityScore >= 40 ? "Needs Work" : "Poor";
  const priorityColor: Record<string, string> = {
    High: "bg-destructive/10 text-destructive border-destructive/20",
    Medium: "bg-warning/10 text-warning border-warning/20",
    Low: "bg-muted text-muted-foreground border-border",
  };

  return (
    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
      {/* Sidebar list */}
      <aside className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">All Requirements</h3>
          <Badge variant="secondary">{requirements.length}</Badge>
        </div>
        <Button asChild size="sm" variant="outline" className="w-full">
          <Link to="/analyzer">
            <Plus className="h-4 w-4 mr-2" /> New
          </Link>
        </Button>
        <div className="space-y-2 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
          {requirements.map((r) => (
            <button
              key={r.id}
              onClick={() => setParams({ id: r.id })}
              className={`w-full text-left p-3 rounded-lg border transition-all ${
                r.id === selectedId
                  ? "border-primary bg-accent shadow-soft"
                  : "border-border hover:border-primary/40 bg-card"
              }`}
            >
              <p className="text-sm font-medium text-foreground truncate">{r.title}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <Progress value={r.analysis.qualityScore} className="h-1 flex-1" />
                <span className="text-[11px] font-semibold text-muted-foreground">{r.analysis.qualityScore}</span>
              </div>
            </button>
          ))}
        </div>
      </aside>

      {/* Main */}
      <div className="space-y-6 min-w-0">
        {/* Header */}
        <Card className="shadow-soft border-border/60">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h2 className="text-2xl font-bold text-foreground truncate">{req.title}</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Analyzed {new Date(req.createdAt).toLocaleString()}
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Badge variant="secondary">
                    <FileText className="h-3 w-3 mr-1" />
                    {a.userStories.length} stories
                  </Badge>
                  <Badge variant="secondary">
                    <ShieldAlert className="h-3 w-3 mr-1" />
                    {a.risks.length} risks
                  </Badge>
                  <Badge variant="secondary">
                    <Users className="h-3 w-3 mr-1" />
                    {a.stakeholders.length} stakeholders
                  </Badge>
                  <Badge variant="secondary">
                    <Gauge className="h-3 w-3 mr-1" />
                    Confidence {a.confidence}%
                  </Badge>
                </div>
              </div>
              <div className="flex flex-col items-center justify-center min-w-[140px] p-4 rounded-xl bg-gradient-subtle border border-border">
                <p className={`text-4xl font-bold ${scoreTone}`}>{a.qualityScore}</p>
                <p className="text-xs text-muted-foreground">Quality Score</p>
                <Badge variant="outline" className={`mt-2 ${scoreTone} border-current`}>
                  {scoreLabel}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Score breakdown + highlighted text */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="shadow-soft border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Gauge className="h-4 w-4 text-primary" /> Quality Breakdown
                <Badge variant="secondary" className="ml-auto text-[11px]">{a.qualityScore}/100</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
              {SCORE_DIMENSIONS.map((d) => (
                <ScoreBar key={d.key} label={d.label} value={a.scoreBreakdown[d.key]} max={10} />
              ))}
            </CardContent>
          </Card>

          <Card className="shadow-soft border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Highlighted Requirement</CardTitle>
              <div className="flex flex-wrap gap-2 pt-1 text-[11px]">
                <span className="px-2 py-0.5 rounded bg-warning/25 text-warning-foreground">ambiguous</span>
                <span className="px-2 py-0.5 rounded bg-primary/15 text-primary">missing</span>
                <span className="px-2 py-0.5 rounded bg-destructive/15 text-destructive">risk</span>
              </div>
            </CardHeader>
            <CardContent>
              <HighlightedText req={req} />
            </CardContent>
          </Card>
        </div>

        {/* Score rationale */}
        <Card className="shadow-soft border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Score Rationale</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-xs font-semibold text-success uppercase tracking-wider mb-2 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> Strengths
              </p>
              <ul className="space-y-1.5">
                {a.scoreRationale.strengths.length ? a.scoreRationale.strengths.map((x, i) => (
                  <li key={i} className="text-sm text-foreground flex gap-2"><span className="text-success shrink-0">+</span><span>{x}</span></li>
                )) : <li className="text-xs text-muted-foreground">—</li>}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold text-warning uppercase tracking-wider mb-2 flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" /> Weaknesses
              </p>
              <ul className="space-y-1.5">
                {a.scoreRationale.weaknesses.length ? a.scoreRationale.weaknesses.map((x, i) => (
                  <li key={i} className="text-sm text-foreground flex gap-2"><span className="text-warning shrink-0">−</span><span>{x}</span></li>
                )) : <li className="text-xs text-muted-foreground">—</li>}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold text-destructive uppercase tracking-wider mb-2">Deductions</p>
              <ul className="space-y-1.5">
                {a.scoreRationale.deductions.length ? a.scoreRationale.deductions.map((d, i) => (
                  <li key={i} className="text-sm text-foreground">
                    <span className="font-semibold">{d.dimension}</span>{" "}
                    <span className="text-xs font-mono text-muted-foreground">({d.points}/10)</span>
                    <p className="text-xs text-muted-foreground mt-0.5">{d.reason}</p>
                  </li>
                )) : <li className="text-xs text-muted-foreground">—</li>}
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Export Panel */}
        <Card className="shadow-soft border-border/60">
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
            <div className="flex items-center gap-2">
              <Download className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Export this analysis</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  exportPDF(req);
                  toast.success("PDF print dialog opened");
                }}
              >
                <Printer className="h-4 w-4 mr-2" /> PDF
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  exportDOCX(req);
                  toast.success("DOCX downloaded");
                }}
              >
                <FileType2 className="h-4 w-4 mr-2" /> DOCX
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  exportCSV(req);
                  toast.success("CSV downloaded");
                }}
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" /> CSV
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => {
                  deleteRequirement(req.id);
                  setParams({});
                  toast.success("Requirement deleted");
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid grid-cols-4 w-full max-w-2xl">
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
            <TabsTrigger value="stories">User Stories</TabsTrigger>
            <TabsTrigger value="people">Stakeholders</TabsTrigger>
            <TabsTrigger value="risks">Risks</TabsTrigger>
          </TabsList>

          <TabsContent value="analysis" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="shadow-soft border-border/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-warning" /> Ambiguities ({a.ambiguities.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {a.ambiguities.length ? (
                    <ul className="space-y-2">
                      {a.ambiguities.map((x, i) => (
                        <li key={i} className="text-sm text-foreground flex gap-2">
                          <span className="text-warning shrink-0">•</span>
                          <span>
                            <span className="font-semibold bg-warning/20 px-1 rounded">"{x.term}"</span> — {x.reason}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success" /> No ambiguities detected
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card className="shadow-soft border-border/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 text-primary" /> Missing Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <MissingBlock title="Missing Actors" items={a.missingActors} />
                  <MissingBlock title="Missing Business Rules" items={a.missingBusinessRules} />
                  <MissingBlock title="Missing Validations" items={a.missingValidations} />
                  <MissingBlock title="Missing Workflows" items={a.missingWorkflows} />
                  <MissingBlock title="Missing Exception Scenarios" items={a.missingExceptionScenarios} />
                  <MissingBlock
                    title="Missing Non-Functional Requirements"
                    items={a.missingNonFunctionalRequirements}
                  />
                  {!a.missingInfo.length && (
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success" /> Nothing critical missing
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card className="shadow-soft border-border/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 text-accent-foreground" /> Clarification Questions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-2 list-decimal list-inside">
                    {a.clarificationQuestions.map((x, i) => (
                      <li key={i} className="text-sm text-foreground">
                        {x}
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>

              <Card className="shadow-soft border-border/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-warning" /> Improvement Suggestions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {a.improvementSuggestions.map((x, i) => (
                      <li key={i} className="text-sm text-foreground flex gap-2">
                        <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                        <span>{x}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            <Card className="shadow-soft border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Assumptions</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5">
                  {a.assumptions.map((x, i) => (
                    <li key={i} className="text-sm text-muted-foreground">
                      — {x}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stories" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {a.userStories.length} backlog-ready stories ·{" "}
                {a.userStories.reduce((sum, s) => sum + (s.complexityPoints ?? 0), 0)} total story points
              </p>
            </div>
            {a.userStories.map((s) => {
              const acRows: { label: string; gherkin: string }[] = [
                { label: "Happy Path", gherkin: s.acceptanceCriteria?.happyPath ?? "" },
                { label: "Validation Scenario", gherkin: s.acceptanceCriteria?.validation ?? "" },
                { label: "Exception Scenario", gherkin: s.acceptanceCriteria?.exception ?? "" },
              ];
              return (
                <Card key={s.id} className="shadow-soft border-border/60">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <CardTitle className="text-sm flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs px-2 py-0.5 rounded bg-primary/10 text-primary">{s.storyId}</span>
                          <span>{s.title}</span>
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mt-1.5">{s.businessValue}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={priorityColor[s.priority]}>{s.priority}</Badge>
                        <Badge variant="secondary" className="font-mono">{s.complexityPoints} pts</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 rounded-lg bg-accent/40 border border-border space-y-1 text-sm">
                      <p><span className="font-semibold text-primary">As a</span> {s.asA},</p>
                      <p><span className="font-semibold text-primary">I want</span> {s.iWant},</p>
                      <p><span className="font-semibold text-primary">so that</span> {s.soThat}.</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Acceptance Criteria (Gherkin)
                      </p>
                      <div className="space-y-3">
                        {acRows.map((r) => (
                          <div key={r.label}>
                            <p className="text-[11px] font-semibold text-primary mb-1">{r.label}</p>
                            <pre className="text-xs bg-foreground/95 text-background p-3 rounded-lg overflow-x-auto font-mono leading-relaxed whitespace-pre-wrap">
{r.gherkin}
                            </pre>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="people" className="mt-4">
            <Card className="shadow-soft border-border/60">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Stakeholder</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Interest</TableHead>
                      <TableHead>Influence</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {a.stakeholders.map((s, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell className="text-muted-foreground">{s.role}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{s.interest}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{s.influence}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="risks" className="mt-4">
            <Card className="shadow-soft border-border/60">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Risk</TableHead>
                      <TableHead className="w-24">Impact</TableHead>
                      <TableHead className="w-28">Likelihood</TableHead>
                      <TableHead>Mitigation</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {a.risks.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.description}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              r.impact === "High"
                                ? "bg-destructive/10 text-destructive border-destructive/30"
                                : r.impact === "Medium"
                                ? "bg-warning/10 text-warning border-warning/30"
                                : "bg-muted"
                            }
                          >
                            {r.impact}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{r.likelihood}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">{r.mitigation}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
