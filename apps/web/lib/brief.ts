import type { Company, Expert, Theme, ThemeId } from "./types";
import { THEME_BY_ID } from "./themes";
import {
  companiesForTheme,
  expertsForTheme,
} from "./data";
import { rankExperts } from "./score";
import { filterTowerBrookEmployees } from "./employee-scope";

/**
 * The Theme Point-of-View brief: the one-screen synthesis a partner wants
 * instead of a directory. Everything here is DERIVED from our own graph so it's
 * defensible — exit comps come from acquisition edges, the call list from the
 * priority score, activity clusters from specialty density. The optional AI
 * narrative (see /api/brief) only ever sees these computed facts.
 */
export interface ExitComp {
  company: Company;
  acquirer: string;
  date?: string;
}

export interface CallItem {
  expert: Expert;
  score: number;
  whyNow: string;
}

export interface ThemeBrief {
  theme: Theme;
  stats: {
    experts: number;
    targets: number; // independent companies = actionable
    acquirers: number;
    exits: number;
    advisers: number;
  };
  exitComps: ExitComp[];
  callList: CallItem[];
  hotSpecialties: { name: string; count: number }[];
  narrative: string; // deterministic baseline; AI can replace via /api/brief
}

function whyNow(e: Expert): string {
  if (e.news?.length) {
    const latest = [...e.news].sort((a, b) => (a.date < b.date ? 1 : -1))[0];
    return latest.headline;
  }
  return e.signals?.[0] ?? "Long-standing authority on the theme";
}

export function buildBrief(
  themeId: ThemeId,
  includeTowerBrookEmployees = false,
): ThemeBrief {
  const theme = THEME_BY_ID[themeId];
  const experts = filterTowerBrookEmployees(
    expertsForTheme(themeId),
    includeTowerBrookEmployees,
  );
  const companies = companiesForTheme(themeId);

  const targets = companies.filter((c) => c.ownershipStatus === "independent");
  const acquired = companies.filter((c) => c.ownershipStatus === "acquired");
  const acquirers = companies.filter(
    (c) => c.category === "incumbent" && c.ownershipStatus === "public",
  );
  const advisers = companies.filter(
    (c) => c.category === "advisory" || c.category === "service-provider",
  );

  const exitComps: ExitComp[] = acquired
    .map((c) => ({
      company: c,
      acquirer: c.owner ?? "—",
      date: c.news?.find((n) => /acqui|buy|complete/i.test(n.headline))?.date,
    }))
    .sort((a, b) => (a.date && b.date ? (a.date < b.date ? 1 : -1) : 0));

  const callList: CallItem[] = rankExperts(experts)
    .slice(0, 5)
    .map(({ expert, score }) => ({ expert, score: score.total, whyNow: whyNow(expert) }));

  const specCounts = new Map<string, number>();
  for (const e of experts)
    for (const s of e.specialties ?? [])
      specCounts.set(s, (specCounts.get(s) ?? 0) + 1);
  const hotSpecialties = [...specCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const stats = {
    experts: experts.length,
    targets: targets.length,
    acquirers: acquirers.length,
    exits: acquired.length,
    advisers: advisers.length,
  };

  return {
    theme,
    stats,
    exitComps,
    callList,
    hotSpecialties,
    narrative: deterministicNarrative(theme, stats, exitComps),
  };
}

/** Baseline "state of play" — shown immediately; AI can sharpen it. */
function deterministicNarrative(
  theme: Theme,
  stats: ThemeBrief["stats"],
  exits: ExitComp[],
): string {
  const exitBits = exits
    .slice(0, 3)
    .map((e) => `${e.company.name}→${e.acquirer}`)
    .join(", ");
  return `${stats.exits} of the companies mapped here have already been acquired (${exitBits}${
    exits.length > 3 ? ", …" : ""
  }), and ${stats.targets} remain independent and potentially actionable. Strategics and infrastructure capital are the active buyers; the people below are the ex-founders, advisers and dealmakers closest to where value is moving.`;
}
