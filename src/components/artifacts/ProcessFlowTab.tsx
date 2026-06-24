import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Image as ImageIcon, Printer, Users, Activity, GitBranch, Cpu, Link2, Flag } from "lucide-react";
import { MermaidDiagram, renderMermaidSvg } from "@/components/MermaidDiagram";
import type { Requirement } from "@/lib/analyzer";
import { toast } from "sonner";

function downloadString(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

async function exportPng(chart: string, filename: string) {
  const svg = await renderMermaidSvg(chart);
  const img = new Image();
  const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);
  return new Promise<void>((resolve, reject) => {
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const scale = 2;
      canvas.width = (img.width || 1200) * scale;
      canvas.height = (img.height || 800) * scale;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((b) => {
        if (!b) return reject(new Error("PNG failed"));
        const a = document.createElement("a");
        a.href = URL.createObjectURL(b);
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        resolve();
      }, "image/png");
    };
    img.onerror = reject;
    img.src = url;
  });
}

async function exportPdf(chart: string, title: string) {
  const svg = await renderMermaidSvg(chart);
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title} — Process Flow</title>
  <style>body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;margin:40px;color:#1a202c}h1{color:#1e40af;border-bottom:3px solid #1e40af;padding-bottom:8px}svg{max-width:100%;height:auto}</style>
  </head><body><h1>${title} — Process Flow</h1>${svg}</body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 500);
}

function Chip({ icon: Icon, label, items, tone }: { icon: typeof Users; label: string; items: string[]; tone: string }) {
  if (!items?.length) return null;
  return (
    <div>
      <p className={`text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5 ${tone}`}>
        <Icon className="h-3.5 w-3.5" /> {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((x, i) => <Badge key={i} variant="outline" className="text-xs">{x}</Badge>)}
      </div>
    </div>
  );
}

export function ProcessFlowTab({ req }: { req: Requirement }) {
  const pf = req.analysis.processFlow;
  return (
    <div className="space-y-4">
      <Card className="shadow-soft border-border/60">
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Auto-generated Process Flow</p>
            <p className="text-xs text-muted-foreground">Derived from your requirement · Mermaid flowchart</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => exportPng(pf.mermaid, `${req.title.replace(/\s+/g,"_")}_flow.png`).then(() => toast.success("PNG downloaded")).catch((e) => toast.error(String(e)))}>
              <ImageIcon className="h-4 w-4 mr-2" /> PNG
            </Button>
            <Button size="sm" variant="outline" onClick={() => exportPdf(pf.mermaid, req.title).then(() => toast.success("PDF view opened")).catch((e) => toast.error(String(e)))}>
              <Printer className="h-4 w-4 mr-2" /> PDF
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { downloadString(pf.mermaid, `${req.title.replace(/\s+/g,"_")}_flow.mmd`, "text/plain"); toast.success("Mermaid source downloaded"); }}>
              <Download className="h-4 w-4 mr-2" /> .mmd
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-soft border-border/60">
        <CardHeader className="pb-3"><CardTitle className="text-sm">Visual Process Diagram</CardTitle></CardHeader>
        <CardContent>
          <MermaidDiagram chart={pf.mermaid} id={`flow-${req.id}`} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="shadow-soft border-border/60">
          <CardHeader className="pb-3"><CardTitle className="text-sm">Text-based Process Flow</CardTitle></CardHeader>
          <CardContent>
            {pf.textFlow?.length ? (
              <ol className="space-y-2">
                {pf.textFlow.map((step, i) => (
                  <li key={i} className="text-sm text-foreground flex gap-3">
                    <span className="font-mono text-xs text-primary shrink-0 w-6">{String(i + 1).padStart(2, "0")}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            ) : <p className="text-sm text-muted-foreground">No text flow available.</p>}
          </CardContent>
        </Card>

        <Card className="shadow-soft border-border/60">
          <CardHeader className="pb-3"><CardTitle className="text-sm">Process Elements</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Chip icon={Users} label="Actors" items={pf.actors} tone="text-primary" />
            <Chip icon={Activity} label="Activities" items={pf.activities} tone="text-foreground" />
            <Chip icon={Cpu} label="System Actions" items={pf.systemActions} tone="text-primary" />
            <Chip icon={Link2} label="Integrations" items={pf.integrations} tone="text-warning" />
            <Chip icon={Flag} label="End States" items={pf.endStates} tone="text-success" />
          </CardContent>
        </Card>
      </div>

      {pf.decisionPoints?.length > 0 && (
        <Card className="shadow-soft border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><GitBranch className="h-4 w-4 text-primary" /> Decision Points</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pf.decisionPoints.map((d, i) => (
                <div key={i} className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="text-sm font-semibold text-foreground">{d.question}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2 text-sm">
                    <div className="flex gap-2"><Badge className="bg-success/10 text-success border-success/30" variant="outline">Yes</Badge><span className="text-muted-foreground">→ {d.yesPath}</span></div>
                    <div className="flex gap-2"><Badge className="bg-destructive/10 text-destructive border-destructive/30" variant="outline">No</Badge><span className="text-muted-foreground">→ {d.noPath}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
