import { companySummaryDetail } from "./company-copy";
import type { Company, Expert, ThemeId } from "./types";
import { bestWarmPathForExpert, warmPathStatusLabel } from "./warm-paths";

export const TOWERBROOK_ID = "towerbrook";

export const TOWERBROOK_PORTFOLIO_COMPANY_IDS = new Set([
  "jsm-group",
  "envevo",
  "gmc-group",
  "liftwerx",
]);

export const TOWERBROOK_ADVISOR_COMPANY_IDS = new Set([
  "canaccord-genuity",
  "fried-frank",
  "roland-berger",
  "ey",
  "eight-advisory",
  "pwc",
  "baringa",
  "vista-insurance",
]);

const TOWERBROOK_THEMES = new Set<ThemeId>([
  "clean-energy-advisory",
  "grid-infrastructure",
  "smart-water",
]);

export interface TowerBrookScore {
  score: number;
  label: string;
  reasons: string[];
  isDirect: boolean;
}

export interface TowerBrookLensCompany {
  id: string;
  name: string;
  href: string;
  score: number;
  label: string;
  description: string;
  themes: ThemeId[];
  expertCount: number;
  isDirect: boolean;
}

export interface TowerBrookLensExpert {
  id: string;
  name: string;
  href: string;
  score: number;
  label: string;
  headline: string;
  type: Expert["type"];
  companyNames: string[];
  isDirect: boolean;
}

export interface TowerBrookLens {
  score: number;
  workedWithCompanies: TowerBrookLensCompany[];
  workedWithExperts: TowerBrookLensExpert[];
  priorityCompanies: TowerBrookLensCompany[];
  priorityExperts: TowerBrookLensExpert[];
  metrics: {
    directCompanies: number;
    directExperts: number;
    priorityCompanies: number;
    priorityExperts: number;
  };
}

function sourceMentionsTowerBrook(item: Pick<Company | Expert, "sources">): boolean {
  return item.sources.some((source) =>
    `${source.title} ${source.publisher ?? ""} ${source.url}`
      .toLowerCase()
      .includes("towerbrook"),
  );
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function isTowerBrookPortfolioCompany(companyId: string): boolean {
  return TOWERBROOK_PORTFOLIO_COMPANY_IDS.has(companyId);
}

export function isTowerBrookWorkedWithCompany(company: Company): boolean {
  return (
    company.id === TOWERBROOK_ID ||
    TOWERBROOK_PORTFOLIO_COMPANY_IDS.has(company.id) ||
    TOWERBROOK_ADVISOR_COMPANY_IDS.has(company.id) ||
    (company.owner ?? "").toLowerCase().includes("towerbrook") ||
    sourceMentionsTowerBrook(company)
  );
}

export function isTowerBrookWorkedWithExpert(expert: Expert): boolean {
  const linkedIds = expert.companies.map((link) => link.companyId);
  return (
    (expert.org ?? "").toLowerCase().includes("towerbrook") ||
    sourceMentionsTowerBrook(expert) ||
    linkedIds.includes(TOWERBROOK_ID) ||
    linkedIds.some((id) => TOWERBROOK_PORTFOLIO_COMPANY_IDS.has(id)) ||
    linkedIds.some((id) => TOWERBROOK_ADVISOR_COMPANY_IDS.has(id))
  );
}

export function towerBrookCompanyScore(
  company: Company,
  expertCount = 0,
): TowerBrookScore {
  const reasons: string[] = [];
  let score = 20;
  let label = "Theme fit";
  let isDirect = false;

  if (company.id === TOWERBROOK_ID) {
    score = 100;
    label = "TowerBrook";
    reasons.push("TowerBrook node");
    isDirect = true;
  } else if (
    TOWERBROOK_PORTFOLIO_COMPANY_IDS.has(company.id) ||
    (company.owner ?? "").toLowerCase().includes("towerbrook")
  ) {
    score = 92;
    label = "Portfolio";
    reasons.push("TowerBrook portfolio relationship");
    isDirect = true;
  } else if (TOWERBROOK_ADVISOR_COMPANY_IDS.has(company.id)) {
    score = 82;
    label = "Deal advisor";
    reasons.push("Named TowerBrook transaction advisor");
    isDirect = true;
  } else if (sourceMentionsTowerBrook(company)) {
    score = 78;
    label = "TowerBrook sourced";
    reasons.push("Source record mentions TowerBrook");
    isDirect = true;
  } else {
    const themeOverlap = company.themes.filter((theme) => TOWERBROOK_THEMES.has(theme)).length;
    score += themeOverlap * 11;
    if (themeOverlap > 0) reasons.push(`${themeOverlap} TowerBrook focus theme${themeOverlap > 1 ? "s" : ""}`);

    if (company.category === "target") {
      score += 12;
      reasons.push("Potential investment target");
    } else if (company.category === "service-provider") {
      score += 9;
      reasons.push("Infrastructure service-provider");
    } else if (company.category === "advisory") {
      score += 7;
      reasons.push("Advisory access point");
    }

    score += Math.min(14, expertCount * 3);
    if (expertCount > 0) reasons.push(`${expertCount} expert link${expertCount > 1 ? "s" : ""}`);

    score += Math.round(company.confidence * 10);
  }

  if (company.specialties?.some((specialty) => /grid|water|wind|solar|ev|connection|renewable/i.test(specialty))) {
    score += 4;
    reasons.push("Matches TowerBrook infrastructure specialties");
  }

  return {
    score: clampScore(score),
    label,
    reasons: reasons.slice(0, 3),
    isDirect,
  };
}

export function towerBrookExpertScore(
  expert: Expert,
  companiesById: Map<string, Company>,
): TowerBrookScore {
  const reasons: string[] = [];
  const bestWarmPath = bestWarmPathForExpert(expert.id);
  let score = 24;
  let label = "Theme fit";
  let isDirect = false;

  const linkedCompanyScores = expert.companies
    .map((link) => {
      const company = companiesById.get(link.companyId);
      return company ? towerBrookCompanyScore(company).score : 0;
    })
    .filter(Boolean);

  if ((expert.org ?? "").toLowerCase().includes("towerbrook")) {
    score = 100;
    label = "TowerBrook team";
    reasons.push("TowerBrook affiliation");
    isDirect = true;
  } else if (bestWarmPath?.status === "verified") {
    score = Math.max(84, bestWarmPath.strength);
    label = warmPathStatusLabel(bestWarmPath.status);
    reasons.push(bestWarmPath.intro_route);
    isDirect = true;
  } else if (bestWarmPath?.status === "org_level") {
    score = Math.max(76, bestWarmPath.strength);
    label = warmPathStatusLabel(bestWarmPath.status);
    reasons.push(bestWarmPath.intro_route);
    isDirect = true;
  } else if (expert.companies.some((link) => link.companyId === TOWERBROOK_ID)) {
    score = 98;
    label = "TowerBrook team";
    reasons.push("Direct TowerBrook company edge");
    isDirect = true;
  } else if (expert.companies.some((link) => TOWERBROOK_PORTFOLIO_COMPANY_IDS.has(link.companyId))) {
    score = 90;
    label = "Portfolio operator";
    reasons.push("Linked to TowerBrook portfolio company");
    isDirect = true;
  } else if (expert.companies.some((link) => TOWERBROOK_ADVISOR_COMPANY_IDS.has(link.companyId))) {
    score = 82;
    label = "Transaction advisor";
    reasons.push("Linked to TowerBrook transaction advisor");
    isDirect = true;
  } else if (sourceMentionsTowerBrook(expert)) {
    score = 78;
    label = "TowerBrook sourced";
    reasons.push("Source record mentions TowerBrook");
    isDirect = true;
  } else {
    const themeOverlap = expert.themes.filter((theme) => TOWERBROOK_THEMES.has(theme)).length;
    score += themeOverlap * 9;
    if (themeOverlap > 0) reasons.push(`${themeOverlap} focus theme${themeOverlap > 1 ? "s" : ""}`);

    if (expert.type === "investor") score += 12;
    if (expert.type === "banker" || expert.type === "lawyer") score += 10;
    if (
      expert.type === "strategy-consultant" ||
      expert.type === "commercial-dd" ||
      expert.type === "technical-dd" ||
      expert.type === "engineering-consultant" ||
      expert.type === "regulatory-policy"
    ) {
      score += 9;
    }
    if (expert.type === "operator" || expert.type === "ex-founder") score += 8;

    score += Math.round((expert.confidence ?? 0.7) * 9);
    score += expert.access === "proprietary" ? 8 : 0;
    score += Math.min(10, Math.max(0, ...linkedCompanyScores) * 0.12);

    if (bestWarmPath?.status === "nearest_public_path") {
      score += 6;
      reasons.push("Nearest public TowerBrook path needs validation");
    } else if (bestWarmPath?.status === "not_found") {
      reasons.push("No public TowerBrook path found");
    }
  }

  const linkedCompanyNames = expert.companies
    .map((link) => companiesById.get(link.companyId)?.name)
    .filter((name): name is string => Boolean(name));
  if (linkedCompanyNames.length) {
    reasons.push(`Linked to ${linkedCompanyNames.slice(0, 2).join(", ")}`);
  }

  return {
    score: clampScore(score),
    label,
    reasons: reasons.slice(0, 3),
    isDirect,
  };
}

export function buildTowerBrookLens(
  experts: Expert[],
  companies: (Company & { expertCount?: number })[],
): TowerBrookLens {
  const companiesById = new Map(companies.map((company) => [company.id, company]));

  const companyRows = companies
    .map((company) => {
      const score = towerBrookCompanyScore(company, company.expertCount ?? 0);
      return {
        id: company.id,
        name: company.name,
        href: `/companies/${company.id}`,
        score: score.score,
        label: score.label,
        description: companySummaryDetail(company),
        themes: company.themes,
        expertCount: company.expertCount ?? 0,
        isDirect: score.isDirect,
      };
    })
    .sort((a, b) => b.score - a.score || b.expertCount - a.expertCount);

  const expertRows = experts
    .map((expert) => {
      const score = towerBrookExpertScore(expert, companiesById);
      return {
        id: expert.id,
        name: expert.name,
        href: `/experts/${expert.id}`,
        score: score.score,
        label: score.label,
        headline: expert.headline,
        type: expert.type,
        companyNames: expert.companies
          .map((link) => companiesById.get(link.companyId)?.name)
          .filter((name): name is string => Boolean(name)),
        isDirect: score.isDirect,
      };
    })
    .sort((a, b) => b.score - a.score);

  const workedWithCompanies = companyRows.filter((company) => company.isDirect);
  const workedWithExperts = expertRows.filter((expert) => expert.isDirect);
  const priorityCompanies = companyRows.filter((company) => company.score >= 64).slice(0, 10);
  const priorityExperts = expertRows.filter((expert) => expert.score >= 64).slice(0, 10);
  const directWeight = Math.min(100, workedWithCompanies.length * 12 + workedWithExperts.length * 8);
  const priorityWeight = Math.min(100, priorityCompanies.length * 4 + priorityExperts.length * 3);

  return {
    score: clampScore(55 + directWeight * 0.28 + priorityWeight * 0.17),
    workedWithCompanies,
    workedWithExperts,
    priorityCompanies,
    priorityExperts,
    metrics: {
      directCompanies: workedWithCompanies.length,
      directExperts: workedWithExperts.length,
      priorityCompanies: priorityCompanies.length,
      priorityExperts: priorityExperts.length,
    },
  };
}
