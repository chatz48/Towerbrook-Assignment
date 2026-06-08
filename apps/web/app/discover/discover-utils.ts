import type {
  AdvisorExpertGap,
  DerivedCompanyCandidate,
  ExpertDiscoveryCandidate,
} from "@/lib/expert-discovery";
import { INCLUDE_TOWERBROOK_EMPLOYEES_EVENT } from "@/lib/employee-scope";
import type { ThemeFocus } from "@/lib/theme-focus";
import type { ThemeId } from "@/lib/types";
import { THEME_LABEL } from "./discover-constants";

export function researchStatusLabel(status: string) {
  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function researchTypeLabel(jobType: string) {
  if (jobType.includes("advisor")) return "Advisor name search";
  if (jobType.includes("company")) return "Company validation";
  if (jobType.includes("expert")) return "Expert verification";
  return "Research refresh";
}

export function formatAccessPath(path: ExpertDiscoveryCandidate["access_path"]) {
  const labels: Record<ExpertDiscoveryCandidate["access_path"], string> = {
    "direct-towerbrook-dealmaker": "Public TowerBrook dealmaker",
    "towerbrook-deal-participant": "Public TowerBrook deal participant",
    "peer-deal-participant": "Peer deal participant",
  };
  return labels[path];
}

export function defaultCompanyQuestions(company: DerivedCompanyCandidate) {
  const sourceQuestions =
    "next_questions" in company && Array.isArray(company.next_questions)
      ? (company.next_questions as string[])
      : [];
  return sourceQuestions.length
    ? sourceQuestions.slice(0, 4)
    : [
        "Is this company actionable despite its current ownership?",
        "Which expert can provide the strongest introduction or diligence path?",
        "Which adjacent companies should be mapped next?",
        "What has changed since the most recent transaction?",
      ];
}

export function buildJobRequest(
  lead: ExpertDiscoveryCandidate | DerivedCompanyCandidate | AdvisorExpertGap | undefined,
  currentTheme: ThemeFocus,
) {
  if (!lead) {
    return {
      themeId: currentTheme,
      jobType: "deep_discovery",
      query: `Find public-source PE deals, named experts, advisors, counsel, lenders, and target companies across ${THEME_LABEL[currentTheme]}.`,
    };
  }

  const themeId = pickTheme(lead.themes, currentTheme);

  if ("gap_id" in lead) {
    return {
      themeId,
      jobType: "advisor_expert_gap",
      query: `${lead.organization} ${lead.advisor_role} named senior professional public source deal team ${lead.deals
        .map((deal) => deal.target)
        .join(" ")}`,
    };
  }

  if ("expert_type" in lead) {
    return {
      themeId,
      jobType: "identity_resolution",
      query: `${lead.name} ${lead.organizations.join(" ")} public profile current role employment history deal role ${lead.connected_companies
        .map((company) => company.name)
        .join(" ")}`,
    };
  }

  return {
    themeId,
    jobType: "founder_origination",
    query: `${lead.name} public sources competitors founders operators acquisitions investments board advisors ${lead.expert_connections
      .slice(0, 5)
      .map((expert) => expert.name)
      .join(" ")}`,
  };
}

function pickTheme(themes: ThemeId[], focus: ThemeFocus): ThemeFocus {
  if (focus !== "all" && themes.includes(focus)) return focus;
  return themes[0] ?? "all";
}

export function subscribeIncludeTowerBrookEmployees(onStoreChange: () => void) {
  window.addEventListener(INCLUDE_TOWERBROOK_EMPLOYEES_EVENT, onStoreChange);
  return () => window.removeEventListener(INCLUDE_TOWERBROOK_EMPLOYEES_EVENT, onStoreChange);
}
