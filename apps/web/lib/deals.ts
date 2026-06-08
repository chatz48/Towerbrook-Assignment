import dealsRaw from "@/data/deals.json";
import { getCompanies, getCompany, getExpert } from "./data";
import type {
  Company,
  Deal,
  DealAdvisor,
  DealFact,
  DealType,
  DealWithScore,
  DealParty,
  Expert,
  Source,
} from "./types";

const DEALS = dealsRaw as Deal[];
const DEAL_BY_ID = new Map(DEALS.map((deal) => [deal.id, deal]));

const REQUIRED_FACTS = [
  "target_company",
  "buyer_or_investor",
  "deal_type",
  "date",
  "theme",
  "source",
  "relationship_edge",
  "investment_relevance",
];

const REQUIRED_FACT_LABELS = new Set(REQUIRED_FACTS);

export const DEAL_TYPE_LABEL: Record<DealType, string> = {
  acquisition: "Acquisition",
  "minority-investment": "Minority investment",
  "growth-equity": "Growth equity",
  merger: "Merger",
  "carve-out": "Carve-out",
  refinancing: "Refinancing",
  jv: "Joint venture",
};

export const DEAL_ADVISOR_LABEL: Record<DealAdvisor["role"], string> = {
  "financial-advisor-buyer": "Buyer financial advisor",
  "financial-advisor-seller": "Seller financial advisor",
  "legal-counsel-buyer": "Buyer legal counsel",
  "legal-counsel-seller": "Seller legal counsel",
  "commercial-diligence": "Commercial diligence",
  "technical-diligence": "Technical diligence",
  "tax-accounting": "Tax / accounting",
  "other-advisor": "Other advisor",
};

export function getDeals(): DealWithScore[] {
  return DEALS.map(scoreDeal).sort(
    (a, b) =>
      (dealDate(b) ?? "").localeCompare(dealDate(a) ?? "") ||
      b.completionScore - a.completionScore,
  );
}

export function getDeal(id: string): DealWithScore | undefined {
  const deal = DEAL_BY_ID.get(id);
  return deal ? scoreDeal(deal) : undefined;
}

export function dealsForCompany(companyId: string): DealWithScore[] {
  return getDeals().filter(
    (deal) =>
      deal.targetCompanyId === companyId ||
      deal.buyerCompanyId === companyId ||
      deal.investorCompanyId === companyId ||
      deal.sellerCompanyId === companyId ||
      deal.companiesSurfaced.includes(companyId) ||
      deal.parties.some((party) => party.companyId === companyId) ||
      deal.advisors.some((advisor) => advisor.companyId === companyId),
  );
}

export function dealsForExpert(expertId: string): DealWithScore[] {
  return getDeals().filter(
    (deal) =>
      deal.expertsSurfaced.includes(expertId) ||
      deal.parties.some((party) => party.personId === expertId),
  );
}

export function resolveDealCompanies(deal: Deal) {
  return deal.companiesSurfaced
    .map((companyId) => getCompany(companyId))
    .filter((company): company is Company => Boolean(company));
}

export function resolveDealExperts(deal: Deal) {
  return deal.expertsSurfaced
    .map((expertId) => getExpert(expertId))
    .filter((expert): expert is Expert => Boolean(expert));
}

export function dealDate(deal: Deal): string | undefined {
  return deal.completionDate ?? deal.announcementDate;
}

export function primaryDealParty(deal: Deal, role: "target" | "buyer" | "investor" | "seller") {
  return deal.parties.find((party) => party.role === role);
}

export function scoreDeal(deal: Deal): DealWithScore {
  const found = [
    Boolean(primaryDealParty(deal, "target") ?? deal.targetCompanyId),
    Boolean(primaryDealParty(deal, "buyer") ?? primaryDealParty(deal, "investor") ?? deal.buyerCompanyId ?? deal.investorCompanyId),
    Boolean(deal.dealType),
    Boolean(dealDate(deal)),
    Boolean(deal.theme),
    deal.sources.length > 0,
    deal.parties.length + deal.advisors.length + deal.companiesSurfaced.length + deal.expertsSurfaced.length > 1,
    Boolean(deal.investmentRelevance),
  ].filter(Boolean).length;

  const advisorCount = deal.advisors.filter((advisor) =>
    advisor.role.startsWith("financial-advisor"),
  ).length;
  const lawyerCount = deal.advisors.filter((advisor) =>
    advisor.role.startsWith("legal-counsel"),
  ).length;

  return {
    ...deal,
    completionScore: found / REQUIRED_FACTS.length,
    requiredFactsFound: found,
    requiredFactsTotal: REQUIRED_FACTS.length,
    advisorCount,
    lawyerCount,
  };
}

export function isRequiredDealFact(fact: string): boolean {
  return REQUIRED_FACT_LABELS.has(fact);
}

export function averageConfidence(facts: DealFact[]): number {
  if (!facts.length) return 0.72;
  return facts.reduce((sum, fact) => sum + fact.confidence, 0) / facts.length;
}

export interface DealExtractionResult {
  deal: DealWithScore;
  facts: DealFact[];
  reviewCandidates: DealFact[];
  relationshipCandidates: string[];
}

export function extractDealFromText(input: {
  text: string;
  url?: string;
  title?: string;
}): DealExtractionResult {
  const text = input.text.trim();
  const compact = text.replace(/\s+/g, " ");
  const title = input.title?.trim() || extractTitle(compact) || "Submitted deal material";
  const source: Source = {
    title,
    url: input.url?.trim() || "user-submitted-text",
    publisher: input.url ? hostFromUrl(input.url) : "User submitted",
  };
  const sourceId = "submitted-1";
  const target = inferTarget(compact, title);
  const buyer = inferBuyer(compact);
  const seller = inferSeller(compact);
  const dealType = inferDealType(compact);
  const date = inferDate(compact);
  const economics = inferEconomics(compact);
  const advisors = inferAdvisorFacts(compact, sourceId);
  const facts: DealFact[] = [
    fact("submitted-target", "submitted-deal", "target_company", target ?? "missing", sourceId, compact),
    fact("submitted-buyer", "submitted-deal", "buyer", buyer ?? "missing", sourceId, compact),
    fact("submitted-seller", "submitted-deal", "seller", seller ?? "missing", sourceId, compact),
    fact("submitted-deal-type", "submitted-deal", "deal_type", DEAL_TYPE_LABEL[dealType], sourceId, compact),
    fact("submitted-date", "submitted-deal", "date", date ?? "missing", sourceId, compact),
    ...economics.map((value, index) =>
      fact(`submitted-economics-${index}`, "submitted-deal", "economics", value, sourceId, compact),
    ),
    ...advisors,
  ];

  const missingFacts = [
    ["target_company", target],
    ["buyer_or_investor", buyer],
    ["seller", seller],
    ["date", date],
    ["enterprise_value", economics.find((value) => /[$£€]\s?\d|m\b|bn\b/i.test(value))],
    ["financial_advisor", advisors.find((item) => item.factType.includes("financial"))],
    ["legal_counsel", advisors.find((item) => item.factType.includes("legal"))],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => String(name));

  const parties: DealParty[] = [];
  if (target) parties.push({ role: "target", name: target, sourceId });
  if (buyer) parties.push({ role: "buyer", name: buyer, sourceId });
  if (seller) parties.push({ role: "seller", name: seller, sourceId });

  const submittedDeal: Deal = {
    id: "submitted-deal",
    name: target && buyer ? `${buyer} / ${target}` : title,
    theme: "grid-infrastructure",
    geography: inferGeography(compact),
    status: "announced",
    dealType,
    announcementDate: date,
    parties,
    advisors: advisors.map((advisor) => ({
      role: advisor.factType.includes("legal")
        ? "legal-counsel-seller"
        : "financial-advisor-seller",
      name: advisor.factValue,
      sourceId,
    })),
    facts,
    sourceIds: [sourceId],
    sources: [source],
    investmentRelevance:
      "Draft extraction only. Review the missing-fact checklist and run targeted follow-up searches before adding this deal to graph-ready data.",
    companiesSurfaced: [],
    expertsSurfaced: [],
    missingFacts,
    followUpSearches: buildFollowUpSearches(target, buyer, missingFacts),
    confidence: averageConfidence(facts),
  };

  return {
    deal: scoreDeal(submittedDeal),
    facts,
    reviewCandidates: facts.filter(
      (item) => item.reviewStatus === "needs_review" || item.reviewStatus === "missing",
    ),
    relationshipCandidates: buildRelationshipCandidates(target, buyer, seller),
  };
}

function fact(
  id: string,
  dealId: string,
  factType: string,
  value: string,
  sourceId: string,
  evidence: string,
): DealFact {
  const missing = value === "missing";
  return {
    id,
    dealId,
    factType,
    factValue: value,
    sourceId,
    evidenceChunkId: `${id}-evidence`,
    evidenceText: evidence.slice(0, 360),
    confidence: missing ? 0 : 0.64,
    extractionMethod: "heuristic",
    reviewStatus: missing ? "missing" : "needs_review",
  };
}

function extractTitle(text: string): string | undefined {
  return text.split(/[.\n]/)[0]?.slice(0, 120);
}

function hostFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Submitted URL";
  }
}

function inferTarget(text: string, title: string): string | undefined {
  const patterns = [
    /\b(?:acquires?|acquired|has acquired)\s+([A-Z][A-Za-z0-9&.,' -]{2,80}?)(?:\s+from|\s+for|\.|,|$)/i,
    /\bacquisition of\s+([A-Z][A-Za-z0-9&.,' -]{2,80}?)(?:\s+from|\s+for|\.|,|$)/i,
    /\bsale of\s+([A-Z][A-Za-z0-9&.,' -]{2,80}?)\s+to\b/i,
    /\bsells?\s+([A-Z][A-Za-z0-9&.,' -]{2,80}?)\s+to\b/i,
    /\binvest(?:s|ed)? in\s+([A-Z][A-Za-z0-9&.,' -]{2,80}?)(?:\s+from|\s+for|\.|,|$)/i,
    /\badvised\s+([A-Z][A-Za-z0-9&.,' -]{2,80}?)\s+on\b/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return cleanEntity(match[1]);
  }
  const titleMatch = title.match(/(?:acquires?|acquired|has acquired|invests in)\s+(.+)/i);
  return titleMatch?.[1] ? cleanEntity(titleMatch[1]) : undefined;
}

function inferBuyer(text: string): string | undefined {
  const match = text.match(/\b([A-Z][A-Za-z0-9&.,' -]{2,80}?)\s+(?:acquires?|acquired|invests?|announces acquisition|has acquired)\b/i);
  return match?.[1] ? cleanEntity(match[1]) : undefined;
}

function inferSeller(text: string): string | undefined {
  const match = text.match(/\bfrom\s+([A-Z][A-Za-z0-9&.,' -]{2,80}?)(?:\s+for|\.|,|$)/);
  return match?.[1] ? cleanEntity(match[1]) : undefined;
}

function inferDealType(text: string): DealType {
  if (/minority/i.test(text)) return "minority-investment";
  if (/growth equity|series [a-z]/i.test(text)) return "growth-equity";
  if (/merger/i.test(text)) return "merger";
  if (/carve.?out/i.test(text)) return "carve-out";
  if (/refinanc/i.test(text)) return "refinancing";
  if (/joint venture|\bJV\b/i.test(text)) return "jv";
  return "acquisition";
}

function inferDate(text: string): string | undefined {
  const iso = text.match(/\b20\d{2}-\d{2}-\d{2}\b/);
  if (iso) return iso[0];
  const year = text.match(/\b20\d{2}\b/);
  return year?.[0];
}

function inferEconomics(text: string): string[] {
  const matches = text.match(/(?:[$£€]\s?\d+(?:\.\d+)?\s?(?:m|bn|million|billion)?|\d+(?:\.\d+)?\s?% stake)/gi);
  return Array.from(new Set(matches ?? [])).slice(0, 4);
}

function inferAdvisorFacts(text: string, sourceId: string): DealFact[] {
  const advisors: DealFact[] = [];
  const advisorMatch = text.match(/(?:^|[.!?]\s+)([A-Z][A-Za-z&.,' -]{2,80}?)\s+(?:advised|acted as financial advisor|served as financial advisor)/);
  if (advisorMatch?.[1]) {
    advisors.push(fact("submitted-financial-advisor", "submitted-deal", "financial_advisor", cleanEntity(advisorMatch[1]), sourceId, text));
  }
  const legalMatch = text.match(/(?:^|[.!?]\s+)([A-Z][A-Za-z&.,' -]{2,80}?)\s+(?:acted as legal counsel|served as legal counsel|provided legal counsel)/);
  if (legalMatch?.[1]) {
    advisors.push(fact("submitted-legal-counsel", "submitted-deal", "legal_counsel", cleanEntity(legalMatch[1]), sourceId, text));
  }
  return advisors;
}

function inferGeography(text: string): string {
  if (/\bUK\b|United Kingdom|London/i.test(text)) return "UK";
  if (/United States|\bUS\b|California|New York/i.test(text)) return "United States";
  if (/Europe|European/i.test(text)) return "Europe";
  return "Not captured";
}

function cleanEntity(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .replace(/\s+(has|from|for|to|in)$/i, "")
    .replace(/[,.]$/, "")
    .trim();
}

function buildFollowUpSearches(
  target: string | undefined,
  buyer: string | undefined,
  missingFacts: string[],
): string[] {
  const targetName = target ?? "[target]";
  const buyerName = buyer ?? "[buyer]";
  const base = [
    `"${targetName}" "${buyerName}" acquisition financial advisor`,
    `"${targetName}" "${buyerName}" legal counsel transaction`,
    `"${targetName}" "${buyerName}" enterprise value`,
    `"${targetName}" "${buyerName}" completion date`,
  ];
  if (missingFacts.includes("seller")) base.push(`"${targetName}" "${buyerName}" seller shareholder`);
  return base;
}

function buildRelationshipCandidates(
  target: string | undefined,
  buyer: string | undefined,
  seller: string | undefined,
): string[] {
  return [
    buyer && target ? `${buyer} acquired ${target}` : undefined,
    seller && target ? `${seller} sold ${target}` : undefined,
    target ? `Source supports deal facts for ${target}` : undefined,
  ].filter((item): item is string => Boolean(item));
}

export function dealCoverageByCompany() {
  const counts = new Map<string, number>();
  for (const company of getCompanies()) counts.set(company.id, 0);
  for (const deal of DEALS) {
    for (const companyId of new Set(deal.companiesSurfaced)) {
      counts.set(companyId, (counts.get(companyId) ?? 0) + 1);
    }
  }
  return counts;
}
