import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, FileDown, Sliders, Trash2, Sparkles, CheckCircle2, User, Info, Users, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const SUPPORTED_ARTIFACTS = [
  "Requirement Quality Analysis",
  "Business Requirements",
  "Functional Requirements",
  "User Stories",
  "Gherkin Acceptance Criteria",
  "Stakeholder Matrix",
  "Risk Register",
  "Business Requirements Document (BRD)",
  "Requirement Traceability Matrix (RTM)",
  "UML Activity Diagram",
];

const TARGET_USERS = [
  "Business Analysts",
  "Associate Business Analysts",
  "Product Owners",
  "Business Consultants",
  "System Analysts",
  "Product Managers",
];

export default function SettingsPage() {
  const { settings, updateSettings, requirements, deleteRequirement } = useStore();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Card className="shadow-elevated border-border/60 overflow-hidden">
        <div className="bg-gradient-primary px-6 py-5 text-primary-foreground flex items-start gap-3">
          <div className="h-10 w-10 shrink-0 rounded-lg bg-white/15 backdrop-blur flex items-center justify-center">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight">About AI BA Copilot Pro</h2>
            <p className="text-xs text-primary-foreground/85 mt-0.5">
              AI-Powered Business Analysis Platform
            </p>
          </div>
        </div>
        <CardContent className="p-6 space-y-6">
          <p className="text-sm text-foreground leading-relaxed">
            AI BA Copilot Pro is an AI-powered Business Analysis platform designed to
            help Business Analysts transform raw stakeholder requirements into
            structured, traceable, and enterprise-ready BA deliverables.
          </p>

          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Key Features</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
              {KEY_FEATURES.map((f) => (
                <div key={f} className="flex items-center gap-2 text-sm text-foreground">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  <span>{f}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Supported Domains</h3>
            <div className="flex flex-wrap gap-2">
              {DOMAINS.map((d) => (
                <span
                  key={d}
                  className="inline-flex items-center rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-medium"
                >
                  {d}
                </span>
              ))}
            </div>
          </div>

          <div className="border-t border-border pt-5">
            <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
              <User className="h-4 w-4 text-primary" /> Created By
            </h3>
            <p className="text-sm font-medium text-foreground">Prasad Hendre</p>
            <p className="text-xs text-muted-foreground mt-0.5">MBA | Business Analyst</p>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-soft border-border/60">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" /> Organization
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Organization Name</Label>
            <Input
              value={settings.organization}
              onChange={(e) => updateSettings({ organization: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-soft border-border/60">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sliders className="h-4 w-4 text-primary" /> Defaults
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Default Story Priority</Label>
            <Select
              value={settings.defaultPriority}
              onValueChange={(v) => updateSettings({ defaultPriority: v as "High" | "Medium" | "Low" })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-soft border-border/60">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileDown className="h-4 w-4 text-primary" /> Export Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Preferred Export Format</Label>
            <Select
              value={settings.exportFormat}
              onValueChange={(v) => updateSettings({ exportFormat: v as "PDF" | "DOCX" | "CSV" })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="PDF">PDF</SelectItem>
                <SelectItem value="DOCX">DOCX</SelectItem>
                <SelectItem value="CSV">CSV</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-soft border-border/60">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="h-4 w-4 text-primary" /> Product Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <dt className="text-xs uppercase tracking-wider text-muted-foreground">Product</dt>
              <dd className="font-medium text-foreground">AI BA Copilot Pro</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-muted-foreground">Category</dt>
              <dd className="font-medium text-foreground">AI-Powered Business Analysis Platform</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-muted-foreground">Version</dt>
              <dd className="font-medium text-foreground">1.0</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-muted-foreground">Release Date</dt>
              <dd className="font-medium text-foreground">June 2026</dd>
            </div>
          </dl>
        </CardContent>
      </Card>


      <Card className="shadow-soft border-destructive/30">
        <CardHeader>
          <CardTitle className="text-base text-destructive flex items-center gap-2">
            <Trash2 className="h-4 w-4" /> Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Clear all requirements</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Permanently removes {requirements.length} requirements from your workspace.
            </p>
          </div>
          <Button
            variant="destructive"
            onClick={() => {
              requirements.forEach((r) => deleteRequirement(r.id));
              toast.success("All requirements cleared");
            }}
          >
            Clear All
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
