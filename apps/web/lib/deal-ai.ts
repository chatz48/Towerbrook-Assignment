import { complete, hasModel } from "./llm";
import { DEAL_TYPE_LABEL, extractDealFromText, scoreDeal, type DealExtractionResult } from "./deals";
import type { Deal, DealAdvisor, DealFact, DealParty, DealType, ThemeId } from "./types";

const EXTRACTION_SYSTEM = `You extract private-equity deal facts from source text.
Return strict JSON only. Never invent undisclosed economics. If a material fact is not disclosed, use "not_disclosed" or include it in missingFacts.
Every non-missing material fact must include a short evidence snippet from the provided text.`;

type ModelFact = {
  factType: string;
  factValue: string;
  normalizedValue?: string;
  evidenceText?: string;
  confidence?: number;
  reviewStatus?: DealFact["reviewStatus"];
};

type ModelExtraction = {
  name?: string;
  theme?: ThemeId;
  geography?: string;
  status?: Deal["status"];
  dealType?: DealType;
  announcementDate?: string;
  completionDate?: string;
  target?: string;
  buyer?: string;
  investor?: string;
  seller?: string;
  management?: string[];
  advisors?: { role: DealAdvisor["role"]; name: string; evidenceText?: string }[];
  facts?: ModelFact[];
  investmentRelevance?: string;
  strategicRationale?: string;
  missingFacts?: string[];
  followUpSearches?: string[];
  confidence?: number;
};

export async function extractDealWithModel(input: {
  text: string;
  title?: string;
  url?: string;
}): Promise<DealExtractionResult> {
  if (!hasModel()) return extractDealFromText(input);

  const text = await complete(
    EXTRACTION_SYSTEM,
    `Source title: ${input.title ?? "Untitled"}
Source URL: ${input.url ?? "pasted text"}

Extract this source into JSON:
{
  "name": string,
  "theme": "clean-energy-advisory" | "grid-infrastructure" | "smart-water",
  "geography": string,
  "status": "announced" | "completed" | "rumored" | "pending" | "failed",
  "dealType": "acquisition" | "minority-investment" | "growth-equity" | "merger" | "carve-out" | "refinancing" | "jv",
  "announcementDate": string,
  "completionDate": string,
  "target": string,
  "buyer": string,
  "investor": string,
  "seller": string,
  "management": string[],
  "advisors": [{"role": "financial-advisor-buyer" | "financial-advisor-seller" | "legal-counsel-buyer" | "legal-counsel-seller" | "commercial-diligence" | "technical-diligence" | "tax-accounting" | "other-advisor", "name": string, "evidenceText": string}],
  "facts": [{"factType": string, "factValue": string, "normalizedValue": string, "evidenceText": string, "confidence": number, "reviewStatus": "verified" | "needs_review" | "missing" | "not_disclosed"}],
  "investmentRelevance": string,
  "strategicRationale": string,
  "missingFacts": string[],
  "followUpSearches": string[],
  "confidence": number
}

TEXT:
${input.text.slice(0, 18000)}`,
    { maxTokens: 2600, responseFormat: "json_object" },
  );

  const parsed = parseJson<ModelExtraction>(text);
  if (!parsed) return extractDealFromText(input);
  return validateExtraction(modelToExtraction(parsed, input), input);
}

/** Fill gaps the LLM missed using deterministic heuristics (e.g. acquisition targets). */
function validateExtraction(
  result: DealExtractionResult,
  input: { text: string; title?: string; url?: string },
): DealExtractionResult {
  const heuristic = extractDealFromText(input);
  const targetParty = result.deal.parties.find((party) => party.role === "target");
  const heuristicTarget = heuristic.deal.parties.find((party) => party.role === "target");

  if (!targetParty?.name && heuristicTarget?.name) {
    const targetName = heuristicTarget.name;
    const parties = [
      { role: "target" as const, name: targetName, sourceId: "submitted-1" },
      ...result.deal.parties.filter((party) => party.role !== "target"),
    ];
    const facts = result.facts.map((fact) =>
      fact.factType === "target_company" && (fact.factValue === "missing" || !fact.factValue)
        ? { ...fact, factValue: targetName, reviewStatus: "needs_review" as const, confidence: 0.72 }
        : fact,
    );
    const missingFacts = result.deal.missingFacts.filter((fact) => fact !== "target_company");
    return {
      ...result,
      deal: {
        ...result.deal,
        parties,
        missingFacts,
        name: result.deal.name.includes("/") ? result.deal.name : heuristic.deal.name,
      },
      facts,
    };
  }

  return result;
}

function modelToExtraction(parsed: ModelExtraction, input: { text: string; title?: string; url?: string }): DealExtractionResult {
  const sourceId = "submitted-1";
  const source = {
    title: input.title?.trim() || parsed.name || "Submitted deal material",
    url: input.url?.trim() || "user-submitted-text",
    publisher: input.url ? safeHost(input.url) : "User submitted",
  };
  const parties: DealParty[] = [];
  if (parsed.target) parties.push({ role: "target", name: parsed.target, sourceId });
  if (parsed.buyer) parties.push({ role: "buyer", name: parsed.buyer, sourceId });
  if (parsed.investor) parties.push({ role: "investor", name: parsed.investor, sourceId });
  if (parsed.seller) parties.push({ role: "seller", name: parsed.seller, sourceId });
  for (const name of parsed.management ?? []) {
    parties.push({ role: "management", name, sourceId });
  }

  const advisors: DealAdvisor[] = (parsed.advisors ?? []).map((advisor) => ({
    role: advisor.role,
    name: advisor.name,
    sourceId,
  }));

  const dealType = parsed.dealType ?? "acquisition";
  const facts: DealFact[] = [
    ...(parsed.facts ?? []).map((fact, index) => ({
      id: `model-fact-${index}`,
      dealId: "submitted-deal",
      factType: fact.factType,
      factValue: fact.factValue,
      normalizedValue: fact.normalizedValue,
      sourceId,
      evidenceChunkId: `model-evidence-${index}`,
      evidenceText: fact.evidenceText,
      confidence: clamp(fact.confidence ?? 0.72),
      extractionMethod: "llm" as const,
      reviewStatus: fact.reviewStatus ?? "needs_review",
    })),
    ...advisors.map((advisor, index) => ({
      id: `model-advisor-${index}`,
      dealId: "submitted-deal",
      factType: advisor.role,
      factValue: advisor.name,
      sourceId,
      evidenceText: parsed.advisors?.[index]?.evidenceText,
      confidence: 0.72,
      extractionMethod: "llm" as const,
      reviewStatus: "needs_review" as const,
    })),
  ];

  if (!facts.some((fact) => fact.factType === "deal_type")) {
    facts.push({
      id: "model-deal-type",
      dealId: "submitted-deal",
      factType: "deal_type",
      factValue: DEAL_TYPE_LABEL[dealType],
      sourceId,
      evidenceText: input.text.slice(0, 260),
      confidence: 0.68,
      extractionMethod: "llm",
      reviewStatus: "needs_review",
    });
  }

  const deal: Deal = {
    id: "submitted-deal",
    name: parsed.name || [parsed.buyer ?? parsed.investor, parsed.target].filter(Boolean).join(" / ") || source.title,
    theme: parsed.theme ?? "grid-infrastructure",
    geography: parsed.geography ?? "Not captured",
    status: parsed.status ?? "announced",
    dealType,
    announcementDate: parsed.announcementDate,
    completionDate: parsed.completionDate,
    parties,
    advisors,
    facts,
    sourceIds: [sourceId],
    sources: [source],
    investmentRelevance:
      parsed.investmentRelevance ??
      "Review-gated deal extraction. Confirm investment relevance before adding to IC material.",
    strategicRationale: parsed.strategicRationale,
    companiesSurfaced: [],
    expertsSurfaced: [],
    missingFacts: parsed.missingFacts ?? [],
    followUpSearches: parsed.followUpSearches ?? [],
    confidence: clamp(parsed.confidence ?? 0.72),
  };

  return {
    deal: scoreDeal(deal),
    facts,
    reviewCandidates: facts.filter((fact) => fact.reviewStatus !== "verified"),
    relationshipCandidates: [
      parsed.buyer && parsed.target ? `${parsed.buyer} acquired ${parsed.target}` : undefined,
      parsed.investor && parsed.target ? `${parsed.investor} invested in ${parsed.target}` : undefined,
      parsed.seller && parsed.target ? `${parsed.seller} sold ${parsed.target}` : undefined,
    ].filter((item): item is string => Boolean(item)),
  };
}

function parseJson<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]) as T;
    } catch {
      return null;
    }
  }
}

function safeHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Submitted URL";
  }
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}
