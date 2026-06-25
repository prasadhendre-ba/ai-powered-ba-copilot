import { create } from "zustand";
import { persist } from "zustand/middleware";
import { normalizeAnalysis, uid, type RawAiAnalysis, type Requirement } from "./analyzer";

interface Settings {
  organization: string;
  defaultPriority: "High" | "Medium" | "Low";
  exportFormat: "PDF" | "DOCX" | "CSV";
}

interface AppState {
  requirements: Requirement[];
  settings: Settings;
  addRequirementFromAi: (title: string, rawText: string, raw: RawAiAnalysis) => Requirement;
  deleteRequirement: (id: string) => void;
  clearRequirements: () => void;
  updateSettings: (s: Partial<Settings>) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      requirements: [],
      settings: {
        organization: "AI BA Copilot Pro Workspace",
        defaultPriority: "Medium",
        exportFormat: "PDF",
      },
      addRequirementFromAi: (title, rawText, raw) => {
        const analysis = normalizeAnalysis(raw);
        const req: Requirement = {
          id: uid(),
          title: title || raw.suggestedTitle || rawText.split(/[.!?\n]/)[0].slice(0, 60) || "Untitled Requirement",
          rawText,
          createdAt: new Date().toISOString(),
          analysis,
        };
        set((state) => ({ requirements: [req, ...state.requirements] }));
        return req;
      },
      deleteRequirement: (id) =>
        set((state) => ({ requirements: state.requirements.filter((r) => r.id !== id) })),
      clearRequirements: () => set({ requirements: [] }),
      updateSettings: (s) => set((state) => ({ settings: { ...state.settings, ...s } })),
    }),
    {
      name: "ba-copilot-store",
      version: 6,
      migrate: (persisted: unknown, version) => {
        if (!persisted || typeof persisted !== "object") return persisted as AppState;
        // v4 dropped legacy analyses; v5 removed notifications + rebranded org default;
        // v6 (v1.0 production release) clears historical test/demo analyses so every
        // workspace starts in the professional empty state.
        if (version < 4) {
          return { ...(persisted as object), requirements: [] } as AppState;
        }
        let next = persisted as Record<string, unknown>;
        if (version < 5) {
          const p = next as { settings?: Record<string, unknown> };
          const { notifications: _drop, organization, ...restSettings } = (p.settings ?? {}) as Record<string, unknown>;
          const org = (typeof organization === "string" && organization && organization !== "Acme Corp")
            ? organization
            : "AI BA Copilot Pro Workspace";
          next = { ...p, settings: { ...restSettings, organization: org } };
        }
        if (version < 6) {
          next = { ...next, requirements: [] };
        }
        return next as unknown as AppState;
      },
    }
  )
);
