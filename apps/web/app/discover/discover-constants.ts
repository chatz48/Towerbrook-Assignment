import {
  getAdvisorExpertGaps,
  getDerivedCompanyCandidates,
  getExpertDiscovery,
  getExpertDiscoveryCandidates,
} from "@/lib/expert-discovery";
import type { CompanyCategory, ExpertType } from "@/lib/types";
import type { ThemeFocus } from "@/lib/theme-focus";
import type { QueueView } from "./discover-types";

export const DISCOVERY = getExpertDiscovery();
export const EXPERTS = getExpertDiscoveryCandidates();
export const COMPANIES = getDerivedCompanyCandidates();
export const GAPS = getAdvisorExpertGaps();

export const EXPERT_TYPE_FILTERS: ExpertType[] = [
  "investor",
  "operator",
  "advisor",
  "banker",
  "lawyer",
  "technical-dd",
];

export const COMPANY_CATEGORY_FILTERS: CompanyCategory[] = [
  "target",
  "advisory",
  "service-provider",
  "investor",
  "incumbent",
];

export const QUEUES: { id: QueueView; label: string; description: string }[] = [
  {
    id: "experts",
    label: "People to verify",
    description: "People to call or verify from public deal and company evidence.",
  },
  {
    id: "companies",
    label: "Companies to validate",
    description: "Targets and ecosystem firms derived from expert connections.",
  },
  {
    id: "gaps",
    label: "Advisor names to find",
    description: "Advisor organizations where the named person is still missing.",
  },
];

export const THEME_LABEL: Record<ThemeFocus, string> = {
  all: "all themes",
  "clean-energy-advisory": "Clean Energy Advisory",
  "grid-infrastructure": "Grid Infrastructure",
  "smart-water": "Smart Water",
};
