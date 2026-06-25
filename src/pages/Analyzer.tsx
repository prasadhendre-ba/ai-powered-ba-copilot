import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, Loader2, Lightbulb, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import type { RawAiAnalysis } from "@/lib/analyzer";

const LOADING_STAGES = [
  "Analyzing stakeholder requirements…",
  "Generating Business Requirements…",
  "Generating Functional Requirements…",
  "Generating User Stories…",
  "Building Acceptance Criteria…",
  "Identifying Stakeholders & Risks…",
  "Generating BRD…",
  "Building RTM…",
  "Generating UML Activity Diagram…",
  "Finalizing artifacts…",
];

function friendlyError(raw: string): string {
  const m = (raw || "").toLowerCase();
  if (m.includes("rate") || m.includes("429") || m.includes("quota")) {
    return "The AI service is temporarily busy. Please try again in a moment.";
  }
  if (m.includes("network") || m.includes("fetch") || m.includes("timeout")) {
    return "Network connection interrupted. Please check your connection and try again.";
  }
  if (m.includes("unavailable") || m.includes("503") || m.includes("500")) {
    return "The AI service is temporarily unavailable. Please try again.";
  }
  return "Analysis could not be completed. Please try again.";
}

export default function Analyzer() {
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [stageIdx, setStageIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const addRequirementFromAi = useStore((s) => s.addRequirementFromAi);
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) return;
    setStageIdx(0);
    const id = setInterval(() => {
      setStageIdx((i) => Math.min(i + 1, LOADING_STAGES.length - 1));
    }, 2200);
    return () => clearInterval(id);
  }, [loading]);

  const handleAnalyze = async () => {
    setError(null);
    const trimmed = text.trim();
    if (trimmed.length < 20) {
      toast.error("Please enter at least 20 characters of requirement text.");
      return;
    }
    setLoading(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("analyze-requirement", {
        body: { text: trimmed, title: title.trim() || undefined },
      });
      if (fnError) throw new Error(fnError.message);
      if (!data || (data as { error?: string }).error) {
        throw new Error((data as { error?: string })?.error ?? "Analysis failed");
      }
      const raw = (data as { analysis: RawAiAnalysis }).analysis;
      const req = addRequirementFromAi(title.trim(), trimmed, raw);
      toast.success("Analysis complete", {
        description: `Quality ${req.analysis.qualityScore}/100 · Confidence ${req.analysis.confidence}%`,
      });
      navigate(`/artifacts?id=${req.id}`);
    } catch (e) {
      const friendly = friendlyError((e as Error).message);
      setError(friendly);
      toast.error("Analysis could not be completed", { description: friendly });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Card className="shadow-elevated border-border/60 overflow-hidden">
        <div className="bg-gradient-primary p-6 text-primary-foreground">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Analyze a Requirement</h2>
              <p className="text-sm text-primary-foreground/85">
                Paste raw stakeholder text. Lovable AI performs a real BA analysis on your exact input.
              </p>
            </div>
          </div>
        </div>

        <CardContent className="p-6 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="title">
              Requirement title <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Input
              id="title"
              placeholder="e.g. Customer Self-Service Portal"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="text">Raw requirement text</Label>
              <span className="text-xs text-muted-foreground">{text.length} chars</span>
            </div>
            <Textarea
              id="text"
              placeholder='e.g. "Customer should be able to register online and receive an order confirmation by email."'
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="min-h-[240px] font-mono text-sm leading-relaxed"
              disabled={loading}
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <Lightbulb className="h-4 w-4 mt-0.5 text-warning shrink-0" />
              <span>
                The AI analyzes the exact text you submit — actors, ambiguities, missing rules, validations, NFRs,
                and exception flows are all generated specifically for your input.
              </span>
            </div>
            <Button
              onClick={handleAnalyze}
              disabled={loading}
              size="lg"
              className="bg-gradient-primary shadow-soft hover:shadow-glow transition-shadow"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analyzing…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" /> Analyze Requirement
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
