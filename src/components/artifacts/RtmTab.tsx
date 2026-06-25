import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUpDown, FileSpreadsheet, Printer, Search, AlertTriangle, CheckCircle2 } from "lucide-react";
import { buildRtm, type Requirement, type RtmRow } from "@/lib/analyzer";
import { exportRtmExcel, exportRtmPdf } from "@/lib/exporters";
import { toast } from "sonner";

type SortKey = keyof RtmRow;

export function RtmTab({ req, requirementIndex = 0 }: { req: Requirement; requirementIndex?: number }) {
  const report = useMemo(() => buildRtm(req, requirementIndex), [req, requirementIndex]);
  const [query, setQuery] = useState("");
  const [priority, setPriority] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("frId");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    let rows = report.rows.filter((r) => {
      if (priority !== "all" && r.priority !== priority) return false;
      if (status !== "all" && r.status !== status) return false;
      if (!q) return true;
      return Object.values(r).some((v) => String(v).toLowerCase().includes(q));
    });
    rows = [...rows].sort((a, b) => {
      const av = String(a[sortKey] ?? "");
      const bv = String(b[sortKey] ?? "");
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
    return rows;
  }, [report.rows, query, priority, status, sortKey, sortDir]);

  function toggleSort(k: SortKey) {
    if (sortKey === k) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir("asc"); }
  }

  const COLS: { key: SortKey; label: string }[] = [
    { key: "brId", label: "BR ID" },
    { key: "frId", label: "FR ID" },
    { key: "frName", label: "Functional Requirement" },
    { key: "frCategory", label: "Category" },
    { key: "userStoryId", label: "Story" },
    { key: "acceptanceCriteriaId", label: "AC" },
    { key: "riskId", label: "Risk" },
    { key: "stakeholder", label: "Owner" },
    { key: "priority", label: "Priority" },
    { key: "sprint", label: "Sprint" },
    { key: "verificationStatus", label: "Verification" },
    { key: "status", label: "Status" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="shadow-soft border-border/60">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Coverage</p>
            <p className={`text-3xl font-bold mt-1 ${report.coverage >= 80 ? "text-success" : report.coverage >= 50 ? "text-warning" : "text-destructive"}`}>
              {report.coverage}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">{report.rows.filter(r => r.status === "Traced").length} of {report.rows.length} traced</p>
          </CardContent>
        </Card>
        <Card className="shadow-soft border-border/60">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Mappings</p>
            <p className="text-3xl font-bold mt-1 text-foreground">{report.rows.length}</p>
            <p className="text-xs text-muted-foreground mt-1">BR → FR → US → AC</p>
          </CardContent>
        </Card>
        <Card className="shadow-soft border-border/60">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Orphan Stories
            </p>
            <p className="text-3xl font-bold mt-1 text-warning">{report.orphanStories.length}</p>
            <p className="text-xs text-muted-foreground mt-1 truncate">{report.orphanStories.join(", ") || "—"}</p>
          </CardContent>
        </Card>
        <Card className="shadow-soft border-border/60">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Orphan FRs
            </p>
            <p className="text-3xl font-bold mt-1 text-destructive">{report.orphanFrs.length}</p>
            <p className="text-xs text-muted-foreground mt-1">{report.orphanFrs.join(", ") || "None"}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-soft border-border/60">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
            <CardTitle className="text-sm">Requirement Traceability Matrix · BR → FR → US → AC → Risk</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => { exportRtmExcel(req, report); toast.success("Excel downloaded"); }}>
                <FileSpreadsheet className="h-4 w-4 mr-2" /> Excel
              </Button>
              <Button size="sm" variant="outline" onClick={() => { exportRtmPdf(req, report); toast.success("PDF opened"); }}>
                <Printer className="h-4 w-4 mr-2" /> PDF
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-8" placeholder="Search…" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Priority" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Traced">Traced</SelectItem>
                <SelectItem value="Orphan Story">Orphan Story</SelectItem>
                <SelectItem value="Orphan FR">Orphan FR</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {COLS.map((c) => (
                    <TableHead key={c.key}>
                      <button onClick={() => toggleSort(c.key)} className="inline-flex items-center gap-1 hover:text-primary">
                        {c.label} <ArrowUpDown className="h-3 w-3 opacity-50" />
                      </button>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r, i) => (
                  <TableRow key={i} className={r.status !== "Traced" ? "bg-warning/5" : ""}>
                    <TableCell className="font-mono text-xs">{r.brId}</TableCell>
                    <TableCell className="font-mono text-xs">{r.frId}</TableCell>
                    <TableCell className="text-sm max-w-[240px] truncate" title={r.frName}>{r.frName}</TableCell>
                    <TableCell><Badge variant="secondary" className="text-[10px]">{r.frCategory}</Badge></TableCell>
                    <TableCell className="font-mono text-xs">{r.userStoryId}</TableCell>
                    <TableCell className="font-mono text-xs">{r.acceptanceCriteriaId}</TableCell>
                    <TableCell className="font-mono text-xs">{r.riskId}</TableCell>
                    <TableCell className="text-sm">{r.stakeholder}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        r.priority === "High" ? "bg-destructive/10 text-destructive border-destructive/20" :
                        r.priority === "Medium" ? "bg-warning/10 text-warning border-warning/20" :
                        "bg-muted text-muted-foreground"
                      }>{r.priority}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">{r.sprint ?? "—"}</TableCell>
                    <TableCell className="text-xs">{r.verificationStatus ?? "—"}</TableCell>
                    <TableCell>
                      {r.status === "Traced" ? (
                        <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Traced
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
                          <AlertTriangle className="h-3 w-3 mr-1" /> {r.status}
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {!filtered.length && (
                  <TableRow><TableCell colSpan={COLS.length} className="text-center text-sm text-muted-foreground py-8">No rows match the filters.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
