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
      version: 4,
      migrate: (persisted: unknown, version) => {
        if (!persisted || typeof persisted !== "object") return persisted as AppState;
        // Schemas before v4 lack brd/processFlow — drop incompatible analyses.
        if (version < 4) {
          return { ...(persisted as object), requirements: [] } as AppState;
        }
        return persisted as AppState;
      },
    }
  )
);
