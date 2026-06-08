import { companiesWithLinks, getExperts } from "@/lib/data";
import { filterTowerBrookEmployees } from "@/lib/employee-scope";
import { EXPERT_TYPE_LABEL } from "@/lib/labels";
import { rankExpertsForSession, type SessionCalibration } from "@/lib/score";
import { THEMES } from "@/lib/themes";
import type { Expert, Theme, ThemeId } from "@/lib/types";

export function isThemeGuidanceQuestion(question: string): boolean {
  return /which (specific )?theme|what theme|focus on first|prioriti[sz]e theme|theme should we|which investment theme|start with which theme|which market theme/i.test(
    question,
  );
}

export type ThemeDirectoryStat = {
  theme: Theme;
  expertCount: number;
  targetCount: number;
  companyCount: number;
  score: number;
  topExpert?: {
    id: string;
    name: string;
    title: string;
    firm: string;
    why: string;
    archetype: string;
  };
};

export function computeThemeDirectoryStats(
  includeTowerBrookEmployees: boolean,
): ThemeDirectoryStat[] {
  const directory = filterTowerBrookEmployees(getExperts(), includeTowerBrookEmployees);
  const calibration: SessionCalibration = {
    objective: "market-structure",
    preferredTypes: ["operator", "advisor", "banker", "ex-founder"],
    optimizeFor: "balanced",
  };

  return THEMES.map((theme) => {
    const themeExperts = directory.filter((expert) => expert.themes.includes(theme.id));
    const companies = companiesWithLinks(theme.id, includeTowerBrookEmployees);
    const targets = companies.filter((company) => company.category === "target");
    const ranked = rankExpertsForSession(themeExperts, { ...calibration, theme: theme.id });
    const top = ranked[0]?.expert;

    const score =
      themeExperts.length * 3 +
      targets.length * 8 +
      companies.length * 1.5 +
      (top?.confidence ?? 0) * 12;

    return {
      theme,
      expertCount: themeExperts.length,
      targetCount: targets.length,
      companyCount: companies.length,
      score,
      topExpert: top
        ? {
            id: top.id,
            name: top.name,
            title: top.headline,
            firm: top.org ?? top.headline,
            why: top.whyRelevant,
            archetype: EXPERT_TYPE_LABEL[top.type],
          }
        : undefined,
    };
  }).sort((a, b) => b.score - a.score);
}

type ThemeGuidanceSummaryInput = {
  theme: Pick<Theme, "name" | "shortName" | "description">;
  expertCount: number;
  targetCount: number;
  companyCount: number;
  topExpert?: ThemeDirectoryStat["topExpert"];
};

export function buildThemeGuidanceSummary(stats: ThemeGuidanceSummaryInput[]): string {
  if (!stats.length) {
    return "No theme coverage found in the directory.";
  }

  const [lead, ...rest] = stats;
  const comparison = [lead, ...rest]
    .map((item, index) => {
      const anchor = item.topExpert
        ? ` Lead expert: ${item.topExpert.name} (${item.topExpert.archetype}).`
        : "";
      return `${index + 1}. ${item.theme.shortName} — ${item.expertCount} experts, ${item.targetCount} targets, ${item.companyCount} linked companies.${anchor}`;
    })
    .join("\n");

  const rationale = [
    `deepest expert bench (${lead.expertCount} experts)`,
    lead.targetCount ? `${lead.targetCount} actionable targets` : "linked company coverage",
    lead.topExpert ? `strong lead contact (${lead.topExpert.name})` : null,
  ]
    .filter(Boolean)
    .join(", ");

  const firstCall = lead.topExpert
    ? `\n\nSuggested first call in ${lead.theme.shortName}: ${lead.topExpert.name} — ${lead.topExpert.why}`
    : "";

  return `Recommendation: focus on ${lead.theme.name} first. The directory shows ${rationale}.\n\n${lead.theme.description}\n\nTheme comparison:\n${comparison}${firstCall}`;
}

export function expertsForThemeGuidance(
  stats: ThemeDirectoryStat[],
  includeTowerBrookEmployees: boolean,
): Expert[] {
  const leadTheme = stats[0]?.theme.id as ThemeId | undefined;
  if (!leadTheme) return [];

  const directory = filterTowerBrookEmployees(getExperts(), includeTowerBrookEmployees);
  const leadExperts = directory
    .filter((expert) => expert.themes.includes(leadTheme))
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3);

  const perThemeLeaders = stats
    .slice(1, 3)
    .map((item) => item.topExpert?.id)
    .map((id) => directory.find((expert) => expert.id === id))
    .filter((expert): expert is Expert => Boolean(expert));

  const seen = new Set<string>();
  return [...leadExperts, ...perThemeLeaders].filter((expert) => {
    if (seen.has(expert.id)) return false;
    seen.add(expert.id);
    return true;
  });
}
