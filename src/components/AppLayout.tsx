import { Outlet, useLocation } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Bell, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const titles: Record<string, { title: string; sub: string }> = {
  "/": { title: "Dashboard", sub: "Your business analysis command center" },
  "/analyzer": { title: "Requirement Analyzer", sub: "Transform raw input into structured artifacts" },
  "/artifacts": { title: "Generated Artifacts", sub: "Browse, export, and manage outputs" },
  "/settings": { title: "Settings", sub: "Personalize your workspace" },
};

export default function AppLayout() {
  const { pathname } = useLocation();
  const meta = titles[pathname] ?? { title: "AI BA Copilot", sub: "" };
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-subtle">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-border bg-card/80 backdrop-blur px-4 md:px-6">
            <SidebarTrigger />
            <div className="flex-1 min-w-0">
              <h1 className="text-base md:text-lg font-semibold text-foreground truncate">{meta.title}</h1>
              <p className="text-xs text-muted-foreground hidden sm:block truncate">{meta.sub}</p>
            </div>
            <div className="hidden md:flex items-center gap-2 max-w-sm flex-1">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search requirements…" className="pl-9 h-9 bg-muted/50 border-border" />
              </div>
            </div>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-4 w-4" />
              <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-primary" />
            </Button>
            <div className="h-9 w-9 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground text-sm font-semibold shadow-soft">
              BA
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6 lg:p-8 animate-fade-in">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
