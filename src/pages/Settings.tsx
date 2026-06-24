import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Bell, FileDown, Sliders, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
  const { settings, updateSettings, requirements, deleteRequirement } = useStore();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
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
            <Bell className="h-4 w-4 text-primary" /> Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm">Email notifications</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Get alerts when analyses complete</p>
            </div>
            <Switch
              checked={settings.notifications}
              onCheckedChange={(v) => updateSettings({ notifications: v })}
            />
          </div>
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
