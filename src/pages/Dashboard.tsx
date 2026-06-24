import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  AlertTriangle,
  FileText,
  ShieldAlert,
  ArrowRight,
  ArrowUpRight,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export default function Dashboard() {
  const requirements = useStore((s) => s.requirements);

  const metrics = useMemo(() => {
    const avgScore = requirements.length
      ? Math.round(requirements.reduce((a, r) => a + r.analysis.qualityScore, 0) / requirements.length)
      : 0;
    const gaps = requirements.reduce(
      (a, r) => a + r.analysis.ambiguities.length + r.analysis.missingInfo.length,
      0
    );
    const stories = requirements.reduce((a, r) => a + r.analysis.userStories.length, 0);
    const risks = requirements.reduce((a, r) => a + r.analysis.risks.length, 0);
    return { avgScore, gaps, stories, risks };
  }, [requirements]);

  const chartData = requirements
    .slice(0, 8)
    .reverse()
    .map((r, i) => ({
      name: `R${i + 1}`,
      score: r.analysis.qualityScore,
      gaps: r.analysis.ambiguities.length + r.analysis.missingInfo.length,
    }));

  const cards = [
    {
      label: "Avg Quality Score",
      value: `${metrics.avgScore}`,
      suffix: "/100",
      icon: TrendingUp,
      trend: "+12% vs last month",
      tone: "primary" as const,
    },
    {
      label: "Gaps Found",
      value: metrics.gaps,
      icon: AlertTriangle,
      trend: `Across ${requirements.length} requirements`,
      tone: "warning" as const,
    },
    {
      label: "User Stories Generated",
      value: metrics.stories,
      icon: FileText,
      trend: "Ready for backlog",
      tone: "success" as const,
    },
    {
      label: "Risks Identified",
      value: metrics.risks,
      icon: ShieldAlert,
      trend: "Tracked & mitigated",
      tone: "destructive" as const,
    },
  ];

  const toneClass = {
    primary: "bg-primary/10 text-primary",
    warning: "bg-warning/10 text-warning",
    success: "bg-success/10 text-success",
    destructive: "bg-destructive/10 text-destructive",
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Card key={c.label} className="shadow-soft hover:shadow-elevated transition-shadow border-border/60">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${toneClass[c.tone]}`}>
                  <c.icon className="h-5 w-5" />
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-4">
                <p className="text-sm text-muted-foreground">{c.label}</p>
                <p className="text-3xl font-bold text-foreground mt-1">
                  {c.value}
                  {c.suffix && <span className="text-base text-muted-foreground font-normal">{c.suffix}</span>}
                </p>
                <p className="text-xs text-muted-foreground mt-2">{c.trend}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-soft border-border/60">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Quality Trend</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">Score across recent requirements</p>
            </div>
            <Badge variant="secondary" className="font-normal">Last 8</Badge>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} domain={[0, 100]} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ fill: "hsl(var(--primary))", r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-soft border-border/60">
          <CardHeader>
            <CardTitle className="text-base">Gaps Per Requirement</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">Ambiguities + missing info</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Bar dataKey="gaps" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-soft border-border/60">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Recent Requirements</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">Latest analyses across your workspace</p>
          </div>
          <Button asChild size="sm" className="bg-gradient-primary shadow-soft">
            <Link to="/analyzer">
              New Analysis <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {requirements.slice(0, 5).map((r) => (
              <Link
                key={r.id}
                to={`/artifacts?id=${r.id}`}
                className="flex items-center gap-4 p-4 hover:bg-muted/40 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{r.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {r.analysis.userStories.length} stories · {r.analysis.risks.length} risks · {new Date(r.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="hidden sm:flex flex-col items-end gap-1 w-40">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-semibold text-foreground">{r.analysis.qualityScore}</span>
                    <span className="text-muted-foreground">/100</span>
                  </div>
                  <Progress value={r.analysis.qualityScore} className="h-1.5 w-full" />
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
