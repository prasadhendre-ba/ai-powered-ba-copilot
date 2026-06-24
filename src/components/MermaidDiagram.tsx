import { ReactNode, useEffect, useRef, useState } from "react";
import mermaid from "mermaid";

mermaid.initialize({
  startOnLoad: false,
  theme: "default",
  securityLevel: "loose",
  flowchart: { htmlLabels: true, curve: "basis" },
  themeVariables: {
    primaryColor: "#dbeafe",
    primaryTextColor: "#1e3a8a",
    primaryBorderColor: "#1e40af",
    lineColor: "#475569",
    secondaryColor: "#f1f5f9",
    tertiaryColor: "#ffffff",
  },
});

interface Props { chart: string; id?: string; fallback?: ReactNode; }

export function MermaidDiagram({ chart, id = "mermaid", fallback }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    const renderId = `${id}-${Math.random().toString(36).slice(2, 8)}`;
    mermaid
      .render(renderId, chart)
      .then(({ svg }) => { if (!cancelled) { setSvg(svg); setError(""); } })
      .catch((e) => { if (!cancelled) setError(String(e?.message ?? e)); });
    return () => { cancelled = true; };
  }, [chart, id]);

  if (error) {
    if (fallback !== undefined) {
      return (
        <div className="space-y-3">
          <div className="p-3 rounded-lg border border-warning/30 bg-warning/5 text-xs text-warning-foreground/80">
            Diagram could not be rendered — showing the textual activity flow instead.
          </div>
          {fallback}
        </div>
      );
    }
    return (
      <div className="p-4 rounded-lg border border-destructive/30 bg-destructive/5 text-sm text-destructive">
        Diagram could not be rendered. <pre className="mt-2 text-xs whitespace-pre-wrap font-mono opacity-80">{error}</pre>
      </div>
    );
  }
  return <div ref={ref} className="overflow-auto p-4 rounded-lg border border-border bg-card" dangerouslySetInnerHTML={{ __html: svg }} />;
}


export async function renderMermaidSvg(chart: string): Promise<string> {
  const renderId = `export-${Math.random().toString(36).slice(2, 8)}`;
  const { svg } = await mermaid.render(renderId, chart);
  return svg;
}
