import { companiesWithLinks, getCompanies, getExperts } from "./data";
import { THEME_BY_ID, THEME_SPECIALTIES, THEMES } from "./themes";
import { isTowerBrookWorkedWithCompany, isTowerBrookWorkedWithExpert, towerBrookCompanyScore, towerBrookExpertScore } from "./towerbrook";
import { EXPERT_TYPE_LABEL } from "./labels";
import type { ThemeFocus } from "./theme-focus";
import type { Company, CompanyWithLinks, Expert, ExpertType, ThemeId } from "./types";

export type { ThemeFocus };
export type ReadinessLevel = "call-ready" | "verify-contact" | "verify-identity" | "research-needed";
export type CompanyReadinessLevel = "target-ready" | "verify-ownership" | "verify-scale" | "monitor" | "research-needed";

export interface ReadinessBadgeModel {
  level: ReadinessLevel | CompanyReadinessLevel;
  label: string;
  tone: "success" | "warning" | "danger" | "neutral" | "accent";
  reasons: string[];
}

export interface TargetScorecard {
  total: number;
  label: string;
  nextAction: string;
  components: {
    marketFit: number;
    ownership: number;
    expertValidation: number;
    evidence: number;
    scale: number;
    towerBrookPath: number;
  };
  risks: string[];
}

export interface CoverageCell {
  type: ExpertType;
  label: string;
  total: number;
  verified: number;
  contactable: number;
  towerBrookPath: number;
  gapSeverity: "low" | "medium" | "high";
}

export interface SearchResult {
  id: string;
  kind: "expert" | "company";
  name: string;
  subtitle: string;
  href: string;
  score: number;
  readiness: string;
  themeNames: string[];
  reasons: string[];
}

const MANDATORY_ARCHETYPES: ExpertType[] = [
  "ex-founder",
  "operator",
  "advisor",
  "banker",
  "lawyer",
  "investor",
];

export function expertTypeLabel(type: ExpertType): string {
  return EXPERT_TYPE_LABEL[type] ?? type;
}

export function matchesActionableReadiness(
  kind: "expert" | "company",
  level: string,
): boolean {
  if (kind === "expert") {
    return level === "call-ready" || level === "verify-contact";
  }
  return level === "target-ready" || level === "verify-ownership" || level === "verify-scale";
}

export function sourceFreshness(sources: { title: string; url: string; publisher?: string }[], news?: { date: string }[]) {
  const hasRecentNews = (news ?? []).some((item) => item.date >= "2024-01-01");
  if (hasRecentNews) return { label: "Fresh signal", stale: false, score: 1 };
  if (sources.length >= 3) return { label: "Multi-source", stale: false, score: 0.75 };
  if (sources.length > 0) return { label: "Source-light", stale: true, score: 0.45 };
  return { label: "Needs source", stale: true, score: 0.2 };
}

export function expertReadiness(expert: Expert): ReadinessBadgeModel {
  const reasons: string[] = [];
  const hasDirectContact = Boolean(expert.email || expert.linkedin || expert.contactFacts?.some((fact) => fact.value));
  const freshness = sourceFreshness(expert.sources, expert.news);
  const companyEdgeCount = new Set(expert.companies.map((link) => link.companyId)).size;
  const hasEdges = companyEdgeCount > 0;
  const highConfidence = expert.confidence >= 0.78;

  if (highConfidence) reasons.push("Verified profile confidence");
  else reasons.push("Identity or role should be confirmed");
  if (hasEdges) reasons.push(`${companyEdgeCount} mapped company/deal edge${companyEdgeCount === 1 ? "" : "s"}`);
  else reasons.push("No resolved company edge yet");
  if (hasDirectContact) reasons.push("Contact or intro path on file");
  else reasons.push("Contact path still needed");
  reasons.push(freshness.label);

  if (highConfidence && hasEdges && hasDirectContact && !freshness.stale) {
    return { level: "call-ready", label: "Call-ready", tone: "success", reasons };
  }
  if (highConfidence && hasEdges && !hasDirectContact) {
    return { level: "verify-contact", label: "Find contact path", tone: "warning", reasons };
  }
  if (!highConfidence) {
    return { level: "verify-identity", label: "Verify identity", tone: "danger", reasons };
  }
  return { level: "research-needed", label: "Research needed", tone: "neutral", reasons };
}

export function companyReadiness(company: CompanyWithLinks | Company): ReadinessBadgeModel {
  const expertCount = "expertCount" in company ? company.expertCount : 0;
  const reasons: string[] = [];
  const isTarget = company.category === "target";
  const hasOwnership = Boolean(company.ownershipStatus);
  const hasScale = Boolean(company.sizeBand || company.funding || company.materialFacts?.some((fact) => ["size", "last_funding", "total_funding"].includes(fact.type) && fact.value));
  const freshness = sourceFreshness(company.sources, company.news);

  if (isTarget) reasons.push("Categorized as an investment target");
  else reasons.push(`${company.category.replace("-", " ")} ecosystem company`);
  if (expertCount > 0) reasons.push(`${expertCount} named expert link${expertCount === 1 ? "" : "s"}`);
  else reasons.push("No named expert edge yet");
  if (hasOwnership) reasons.push(`${company.ownershipStatus?.replace("-", " ")} ownership view`);
  else reasons.push("Ownership not verified");
  if (hasScale) reasons.push("Scale or funding signal on file");
  else reasons.push("Scale/funding gap");
  reasons.push(freshness.label);

  if (isTarget && company.ownershipStatus === "independent" && expertCount > 0 && company.confidence >= 0.75) {
    return { level: "target-ready", label: "Target-ready", tone: "success", reasons };
  }
  if (!hasOwnership) return { level: "verify-ownership", label: "Verify ownership", tone: "warning", reasons };
  if (!hasScale && isTarget) return { level: "verify-scale", label: "Verify scale", tone: "warning", reasons };
  if (company.ownershipStatus === "acquired" || company.ownershipStatus === "public") {
    return { level: "monitor", label: "Monitor / comp", tone: "neutral", reasons };
  }
  return { level: "research-needed", label: "Research needed", tone: "neutral", reasons };
}

export function targetScorecard(company: CompanyWithLinks): TargetScorecard {
  const tb = towerBrookCompanyScore(company, company.expertCount);
  const marketFit = Math.min(20, company.themes.length * 6 + (company.specialties?.length ?? 0) * 2 + (company.category === "target" ? 8 : 2));
  const ownership = company.ownershipStatus === "independent" ? 20 : company.ownershipStatus === "sponsor-owned" ? 14 : company.ownershipStatus ? 7 : 4;
  const expertValidation = Math.min(20, company.expertCount * 5);
  const evidence = Math.min(15, Math.round(company.confidence * 10) + Math.min(5, company.sources.length));
  const scale = company.sizeBand || company.funding ? 12 : company.materialFacts?.some((fact) => fact.value && ["size", "last_funding", "total_funding"].includes(fact.type)) ? 9 : 3;
  const towerBrookPath = tb.isDirect ? 13 : Math.min(10, Math.round(tb.score / 10));
  const total = Math.min(100, marketFit + ownership + expertValidation + evidence + scale + towerBrookPath);
  const readiness = companyReadiness(company);
  const risks = readiness.reasons.filter((reason) => /gap|not verified|needed|No named|Source-light|Needs source/i.test(reason));

  return {
    total,
    label: total >= 78 ? "High-priority target" : total >= 62 ? "Diligence candidate" : total >= 45 ? "Monitor" : "Research backlog",
    nextAction:
      readiness.level === "verify-ownership"
        ? "Confirm ownership and sponsor history before outreach."
        : readiness.level === "verify-scale"
          ? "Verify revenue scale, funding history, and buyer universe."
          : readiness.level === "target-ready"
            ? "Put into a call campaign and ask linked experts for customer/competitor referrals."
            : "Use research queue to resolve missing evidence before partner review.",
    components: { marketFit, ownership, expertValidation, evidence, scale, towerBrookPath },
    risks: risks.length ? risks.slice(0, 4) : ["No obvious blocker in current sourced record."],
  };
}

export function coverageMatrix(theme: ThemeFocus, includeTowerBrookEmployees: boolean): CoverageCell[] {
  const experts = getExperts().filter((expert) => theme === "all" || expert.themes.includes(theme));
  const companies = new Map(getCompanies().map((company) => [company.id, company]));
  return MANDATORY_ARCHETYPES.map((type) => {
    const typed = experts.filter((expert) => expert.type === type && (includeTowerBrookEmployees || !(expert.org ?? "").toLowerCase().includes("towerbrook")));
    const verified = typed.filter((expert) => expert.confidence >= 0.78 && expert.sources.length > 0).length;
    const contactable = typed.filter((expert) => expert.email || expert.linkedin || expert.contactFacts?.some((fact) => fact.value)).length;
    const towerBrookPath = typed.filter((expert) => isTowerBrookWorkedWithExpert(expert) || expert.companies.some((link) => {
      const company = companies.get(link.companyId);
      return company ? isTowerBrookWorkedWithCompany(company) : false;
    })).length;
    const gapSeverity = typed.length >= 8 && verified >= 5 ? "low" : typed.length >= 3 ? "medium" : "high";
    return { type, label: expertTypeLabel(type), total: typed.length, verified, contactable, towerBrookPath, gapSeverity };
  });
}

export function themeGapSummary(theme: ThemeId, experts: Expert[]) {
  const covered = new Set(experts.flatMap((expert) => expert.specialties ?? []));
  return THEME_SPECIALTIES[theme].filter((specialty) => !covered.has(specialty));
}

export function globalSearch({
  query,
  theme = "all",
  kind = "all",
  readiness = "all",
  limit = 20,
}: {
  query: string;
  theme?: ThemeFocus;
  kind?: "all" | "expert" | "company";
  readiness?: string;
  limit?: number;
}): SearchResult[] {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const matchScore = (haystack: string) => {
    const text = haystack.toLowerCase();
    if (!terms.length) return 1;
    return terms.reduce((score, term) => score + (text.includes(term) ? 1 : 0), 0);
  };

  const expertResults: SearchResult[] = kind === "company" ? [] : getExperts()
    .filter((expert) => theme === "all" || expert.themes.includes(theme))
    .map((expert) => {
      const ready = expertReadiness(expert);
      const text = [expert.name, expert.headline, expert.org, expert.location, expert.whyRelevant, expert.specialties?.join(" "), expert.signals?.join(" ")].filter(Boolean).join(" ");
      const textScore = matchScore(text);
      const tbScore = towerBrookExpertScore(expert, new Map(getCompanies().map((company) => [company.id, company]))).score;
      return {
        id: expert.id,
        kind: "expert" as const,
        name: expert.name,
        subtitle: expert.headline,
        href: `/experts/${expert.id}`,
        score: textScore * 20 + Math.round(expert.confidence * 20) + Math.min(20, expert.companies.length * 4) + Math.round(tbScore / 10),
        readiness: ready.label,
        themeNames: expert.themes.map((id) => THEME_BY_ID[id]?.name ?? id),
        reasons: ready.reasons.slice(0, 3),
      };
    })
    .filter((item) => item.score > 0)
    .filter((item) => readiness === "all" || item.readiness.toLowerCase().replaceAll(" ", "-") === readiness);

  const companyResults: SearchResult[] = kind === "expert" ? [] : companiesWithLinks(theme === "all" ? undefined : theme)
    .map((company) => {
      const ready = companyReadiness(company);
      const scorecard = targetScorecard(company);
      const text = [company.name, company.description, company.whyInteresting, company.hq, company.owner, company.website, company.specialties?.join(" "), company.linkedExperts.map((link) => link.expert.name).join(" ")].filter(Boolean).join(" ");
      const textScore = matchScore(text);
      return {
        id: company.id,
        kind: "company" as const,
        name: company.name,
        subtitle: company.whyInteresting ?? company.description,
        href: `/companies/${company.id}`,
        score: textScore * 20 + scorecard.total,
        readiness: ready.label,
        themeNames: company.themes.map((id) => THEME_BY_ID[id]?.name ?? id),
        reasons: ready.reasons.slice(0, 3),
      };
    })
    .filter((item) => item.score > 0)
    .filter((item) => readiness === "all" || item.readiness.toLowerCase().replaceAll(" ", "-") === readiness);

  return [...expertResults, ...companyResults]
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, limit);
}

export function campaignPlan(theme: ThemeFocus, includeTowerBrookEmployees: boolean) {
  const experts = getExperts().filter((expert) => theme === "all" || expert.themes.includes(theme));
  const companies = companiesWithLinks(theme === "all" ? undefined : theme, includeTowerBrookEmployees);
  const calls = experts
    .map((expert) => ({ expert, readiness: expertReadiness(expert) }))
    .filter(({ readiness }) => readiness.level === "call-ready" || readiness.level === "verify-contact")
    .sort((a, b) => b.expert.confidence - a.expert.confidence || b.expert.companies.length - a.expert.companies.length)
    .slice(0, 8);
  const targets = companies
    .map((company) => ({ company, scorecard: targetScorecard(company), readiness: companyReadiness(company) }))
    .filter(({ company }) => company.category === "target")
    .sort((a, b) => b.scorecard.total - a.scorecard.total)
    .slice(0, 8);
  const themes = theme === "all" ? THEMES : THEMES.filter((item) => item.id === theme);
  const gaps = themes.flatMap((item) => themeGapSummary(item.id, experts).slice(0, 3).map((gap) => `${item.shortName}: ${gap}`));

  return {
    theme,
    calls,
    targets,
    gaps,
    nextSteps: [
      "Assign owners to the first five expert calls and verify contact paths.",
      "Use target company scorecards to separate actionable platforms from monitoring comps.",
      "Capture expert referrals back into the graph after each call.",
      "Export a Monday meeting pack with unresolved evidence gaps and source links.",
    ],
  };
}
