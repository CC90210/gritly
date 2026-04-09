import { create } from "zustand";
import type { Organization } from "@/lib/types/database";
import type { IndustryConfig } from "@/lib/industry/config";


interface OrgStore {
  org: Organization | null;
  industryConfig: IndustryConfig | null;
  setOrg: (org: Organization) => void;
  setIndustryConfig: (config: IndustryConfig) => void;
  reset: () => void;
}

export const useOrgStore = create<OrgStore>((set) => ({
  org: null,
  industryConfig: null,
  setOrg: (org) => set({ org }),
  setIndustryConfig: (industryConfig) => set({ industryConfig }),
  reset: () => set({ org: null, industryConfig: null }),
}));
