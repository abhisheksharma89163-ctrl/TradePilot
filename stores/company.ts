import { create } from "zustand";

export interface CompanySummary {
  id: string;
  name: string;
  role: string;
}

interface CompanyState {
  active: CompanySummary | null;
  companies: CompanySummary[];
  setActive: (c: CompanySummary) => void;
  setCompanies: (cs: CompanySummary[]) => void;
}

/** Client-side mirror of the active company for instant UI switching. */
export const useCompanyStore = create<CompanyState>((set) => ({
  active: null,
  companies: [],
  setActive: (active) => set({ active }),
  setCompanies: (companies) => set({ companies }),
}));
