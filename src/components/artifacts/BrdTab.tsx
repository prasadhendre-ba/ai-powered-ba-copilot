import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileType2, Printer } from "lucide-react";
import type { Requirement } from "@/lib/analyzer";
import { exportBrdDocx, exportBrdPdf } from "@/lib/exporters";
import { toast } from "sonner";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-base font-bold text-primary border-b border-border pb-1 mb-3">{title}</h3>
      <div className="text-sm text-foreground leading-relaxed space-y-2">{children}</div>
    </section>
  );
}

function Bullets({ items }: { items: string[] }) {
  if (!items?.length) return <p className="text-muted-foreground italic">Not specified.</p>;
  return (
    <ul className="space-y-1.5 pl-4">
      {items.map((x, i) => <li key={i} className="list-disc">{x}</li>)}
    </ul>
  );
}

export function BrdTab({ req }: { req: Requirement }) {
  const a = req.analysis;
  const b = a.brd;
  return (
    <div className="space-y-4">
      <Card className="shadow-soft border-border/60">
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Business Requirements Document</p>
            <p className="text-xs text-muted-foreground">Auto-generated · Suitable for stakeholder review</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => { exportBrdPdf(req); toast.success("Print view opened"); }}>
              <Printer className="h-4 w-4 mr-2" /> Print / PDF
            </Button>
            <Button size="sm" variant="outline" onClick={() => { exportBrdDocx(req); toast.success("DOCX downloaded"); }}>
              <FileType2 className="h-4 w-4 mr-2" /> DOCX
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-soft border-border/60">
        <CardContent className="p-8 space-y-7 bg-card max-w-4xl mx-auto">
          <header className="text-center border-b-2 border-primary pb-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Business Requirements Document</p>
            <h2 className="text-3xl font-bold text-foreground mt-2">{req.title}</h2>
            <div className="flex justify-center gap-3 mt-3 text-xs text-muted-foreground">
              <span>Doc ID: BRD-{req.id.toUpperCase()}</span>
              <span>·</span>
              <span>{new Date(req.createdAt).toLocaleDateString()}</span>
              <span>·</span>
              <span>Confidence {a.confidence}%</span>
            </div>
          </header>

          <Section title="1. Executive Summary"><p>{b.executiveSummary || "—"}</p></Section>
          <Section title="2. Business Objective"><p>{b.businessObjective || "—"}</p></Section>
          <Section title="3. Problem Statement"><p>{b.problemStatement || "—"}</p></Section>
          <Section title="4. Current State"><p>{b.currentState || "—"}</p></Section>
          <Section title="5. Future State"><p>{b.futureState || "—"}</p></Section>
          <Section title="6. In Scope"><Bullets items={b.inScope} /></Section>
          <Section title="7. Out of Scope"><Bullets items={b.outOfScope} /></Section>

          <Section title="8. Stakeholders">
            <table className="w-full text-sm border border-border">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-2 border border-border">Name</th>
                  <th className="text-left p-2 border border-border">Role</th>
                  <th className="text-left p-2 border border-border">Interest</th>
                  <th className="text-left p-2 border border-border">Influence</th>
                </tr>
              </thead>
              <tbody>
                {a.stakeholders.map((s, i) => (
                  <tr key={i}>
                    <td className="p-2 border border-border font-medium">{s.name}</td>
                    <td className="p-2 border border-border">{s.role}</td>
                    <td className="p-2 border border-border"><Badge variant="outline">{s.interest}</Badge></td>
                    <td className="p-2 border border-border"><Badge variant="outline">{s.influence}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          <Section title="9. Assumptions"><Bullets items={a.assumptions} /></Section>
          <Section title="10. Constraints"><Bullets items={b.constraints} /></Section>

          <Section title="11. Business Requirements">
            <table className="w-full text-sm border border-border">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-2 border border-border w-24">ID</th>
                  <th className="text-left p-2 border border-border">Requirement</th>
                  <th className="text-left p-2 border border-border w-24">Priority</th>
                </tr>
              </thead>
              <tbody>
                {a.userStories.map((s) => (
                  <tr key={s.id}>
                    <td className="p-2 border border-border font-mono text-xs">BR-{s.storyId.replace("US-", "")}</td>
                    <td className="p-2 border border-border">
                      <p className="font-medium">{s.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">As a {s.asA}, I want {s.iWant}, so that {s.soThat}.</p>
                    </td>
                    <td className="p-2 border border-border"><Badge variant="outline">{s.priority}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          <Section title="12. Business Rules"><Bullets items={b.businessRules} /></Section>

          <Section title="13. Risks">
            <table className="w-full text-sm border border-border">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-2 border border-border w-24">ID</th>
                  <th className="text-left p-2 border border-border">Description</th>
                  <th className="text-left p-2 border border-border w-20">Impact</th>
                  <th className="text-left p-2 border border-border w-24">Likelihood</th>
                  <th className="text-left p-2 border border-border">Mitigation</th>
                </tr>
              </thead>
              <tbody>
                {a.risks.map((r, i) => (
                  <tr key={r.id}>
                    <td className="p-2 border border-border font-mono text-xs">RISK-{String(i + 1).padStart(3, "0")}</td>
                    <td className="p-2 border border-border">{r.description}</td>
                    <td className="p-2 border border-border">{r.impact}</td>
                    <td className="p-2 border border-border">{r.likelihood}</td>
                    <td className="p-2 border border-border text-muted-foreground">{r.mitigation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          <Section title="14. Dependencies"><Bullets items={b.dependencies} /></Section>
          <Section title="15. Success Metrics"><Bullets items={b.successMetrics} /></Section>
        </CardContent>
      </Card>
    </div>
  );
}
