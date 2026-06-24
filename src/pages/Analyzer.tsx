import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, Loader2, Lightbulb } from "lucide-react";
import { toast } from "sonner";

const EXAMPLES = [
  "Build a fast and easy-to-use mobile app that helps users manage their tasks.",
  "We need a reporting dashboard for managers to view team performance metrics, drill down by department, and export to Excel. The dashboard should refresh every 5 minutes and support up to 500 concurrent users.",
  "Implement single sign-on so employees can access all internal tools with one login.",
];

export default function Analyzer() {
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const addRequirement = useStore((s) => s.addRequirement);
  const navigate = useNavigate();

  const handleAnalyze = async () => {
    if (text.trim().length < 20) {
      toast.error("Please enter at least 20 characters of requirement text");
      return;
    }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 900));
    const req = addRequirement(title.trim() || "Untitled Requirement", text.trim());
    setLoading(false);
    toast.success("Analysis complete", { description: `Quality score: ${req.analysis.qualityScore}/100` });
    navigate(`/artifacts?id=${req.id}`);
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
                Paste raw stakeholder text. AI scores quality and generates BA artifacts.
              </p>
            </div>
          </div>
        </div>

        <CardContent className="p-6 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="title">Requirement title <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input
              id="title"
              placeholder="e.g. Customer Self-Service Portal"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="text">Raw requirement text</Label>
              <span className="text-xs text-muted-foreground">{text.length} chars</span>
            </div>
            <Textarea
              id="text"
              placeholder="Paste stakeholder requirement, meeting notes, email excerpt, or feature request…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="min-h-[220px] font-mono text-sm leading-relaxed"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <Lightbulb className="h-4 w-4 mt-0.5 text-warning shrink-0" />
              <span>Tip: include actors, success metrics, and integration points for a higher quality score.</span>
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

      <Card className="shadow-soft border-border/60">
        <CardHeader>
          <CardTitle className="text-base">Try a sample</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {EXAMPLES.map((ex, i) => (
            <button
              key={i}
              onClick={() => setText(ex)}
              className="text-left p-4 rounded-lg border border-border hover:border-primary hover:bg-accent/50 transition-all"
            >
              <p className="text-xs text-muted-foreground line-clamp-4">{ex}</p>
            </button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
