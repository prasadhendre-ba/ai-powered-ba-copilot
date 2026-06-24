import { create } from "zustand";
import { persist } from "zustand/middleware";
import { analyzeRequirement, type Requirement } from "./analyzer";

interface Settings {
  organization: string;
  defaultPriority: "High" | "Medium" | "Low";
  exportFormat: "PDF" | "DOCX" | "CSV";
  notifications: boolean;
}

interface AppState {
  requirements: Requirement[];
  settings: Settings;
  addRequirement: (title: string, rawText: string) => Requirement;
  deleteRequirement: (id: string) => void;
  updateSettings: (s: Partial<Settings>) => void;
}

const SAMPLES: { title: string; text: string }[] = [
  {
    title: "Customer Self-Service Portal",
    text: "We need a customer self-service portal where users can manage their subscriptions, update billing info, and download invoices. The portal must be fast, intuitive, and secure. It should integrate with our existing CRM and support 10000 concurrent users with 99.9% uptime. Launch target Q3.",
  },
  {
    title: "Mobile Push Notifications",
    text: "Users should get nice notifications about important things happening in their account. The system needs to be scalable and easy to use.",
  },
  {
    title: "Automated Invoice Reconciliation",
    text: "Finance team needs a feature to automatically reconcile incoming bank transactions with outstanding invoices. When a payment arrives, the system shall match it to invoices within 5 seconds using reference number and amount. Given a successful match, the invoice status updates to Paid and a confirmation email is sent to the customer.",
  },
];

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      requirements: SAMPLES.map((s) => analyzeRequirement(s.text, s.title)),
      settings: {
        organization: "Acme Corp",
        defaultPriority: "Medium",
        exportFormat: "PDF",
        notifications: true,
      },
      addRequirement: (title, rawText) => {
        const req = analyzeRequirement(rawText, title);
        set((state) => ({ requirements: [req, ...state.requirements] }));
        return req;
      },
      deleteRequirement: (id) =>
        set((state) => ({ requirements: state.requirements.filter((r) => r.id !== id) })),
      updateSettings: (s) => set((state) => ({ settings: { ...state.settings, ...s } })),
    }),
    { name: "ba-copilot-store" }
  )
);
