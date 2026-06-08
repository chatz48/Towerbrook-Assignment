#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, "..");

const baseDeals = JSON.parse(readFileSync(join(root, "data/deals.json"), "utf8"));
const peCensus = JSON.parse(
  readFileSync(join(root, "data/private-equity-deal-census-candidates.json"), "utf8"),
);
const companies = JSON.parse(readFileSync(join(root, "data/companies.json"), "utf8"));
const experts = JSON.parse(readFileSync(join(root, "data/experts.json"), "utf8"));

const companyIds = new Set(companies.map((company) => company.id));
const expertIds = new Set(experts.map((expert) => expert.id));

const selectedCensusDealIds = new Set([
  "pe-towerbrook-jsm-2024",
  "pe-towerbrook-gmc-2025",
  "pe-towerbrook-brg-2025",
  "pe-towerbrook-langan-2023",
  "pe-towerbrook-envevo-2023",
  "pe-clearlake-qualus-2026",
  "pe-eqt-scale-microgrids-2025",
  "pe-eqt-seven-seas-water-2025",
  "pe-frontenac-crom-2025",
  "pe-wind-point-sigma-2025",
  "pe-nuveen-ally-energy-2025",
  "pe-golden-gate-dmc-power-exit-2025",
]);

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

function slug(value) {
  return String(value)
    .toLowerCase()
    .replaceAll("&", "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replaceAll(" ", "-")
    .slice(0, 70);
}

function dealType(transactionType) {
  if (/minority|strategic-investment/.test(transactionType)) return "minority-investment";
  if (/growth/.test(transactionType)) return "growth-equity";
  if (/refinanc/.test(transactionType)) return "refinancing";
  if (/joint|jv/.test(transactionType)) return "jv";
  return "acquisition";
}

function dealStatus(status) {
  if (status === "completed") return "completed";
  if (status === "pending" || status === "closing-status-unverified") return "pending";
  return "announced";
}

function partyRole(role) {
  if (/target/.test(role)) return "target";
  if (/buyer/.test(role)) return "buyer";
  if (/investor|sponsor|portfolio-company/.test(role)) return "investor";
  if (/seller|replaced/.test(role)) return "seller";
  if (/management|continuing/.test(role)) return "management";
  return "existing-shareholder";
}

function advisorRole(role) {
  if (/legal|counsel/.test(role)) {
    return /buyer|investor|lender/.test(role) ? "legal-counsel-buyer" : "legal-counsel-seller";
  }
  if (/commercial/.test(role)) return "commercial-diligence";
  if (/technical|operational|technology|environmental|esg|insurance/.test(role)) {
    return "technical-diligence";
  }
  if (/tax|accounting/.test(role)) return "tax-accounting";
  if (/financial|m-and-a|advisor|financing|lender|credit/.test(role)) {
    return /buyer|investor|lender|financing/.test(role)
      ? "financial-advisor-buyer"
      : "financial-advisor-seller";
  }
  return "other-advisor";
}

function sourceId(deal, index) {
  return `${deal.id}:src-${index + 1}`;
}

function fact({
  deal,
  index,
  factType,
  factValue,
  normalizedValue,
  evidenceText,
  confidence = 0.86,
  reviewStatus = "verified",
  sourceIndex = 0,
}) {
  return {
    id: `${deal.id}:fact-${index}`,
    dealId: deal.id,
    factType,
    factValue,
    ...(normalizedValue ? { normalizedValue } : {}),
    sourceId: sourceId(deal, sourceIndex),
    evidenceChunkId: `${deal.id}:evidence-${index}`,
    evidenceText,
    confidence,
    extractionMethod: "curated",
    reviewStatus,
  };
}

function companyId(value) {
  return value && companyIds.has(value) ? value : undefined;
}

function expertId(value) {
  return value && expertIds.has(value) ? value : undefined;
}

function censusDealToCanonical(deal) {
  const sources = deal.sources.map((source) => ({
    title: source.title,
    publisher: source.publisher,
    url: source.url,
  }));

  const sourceIds = deal.sources.map((_, index) => sourceId(deal, index));
  const parties = [
    {
      role: "target",
      name: deal.target.name,
      ...(companyId(deal.target.canonical_id) ? { companyId: deal.target.canonical_id } : {}),
      sourceId: sourceIds[0],
    },
    ...deal.sponsors.map((sponsor) => ({
      role: partyRole(sponsor.role),
      name: sponsor.name,
      ...(companyId(sponsor.canonical_id) ? { companyId: sponsor.canonical_id } : {}),
      sourceId: sourceIds[0],
    })),
    ...deal.sellers.map((seller) => ({
      role: partyRole(seller.role),
      name: seller.name,
      ...(companyId(seller.canonical_id) ? { companyId: seller.canonical_id } : {}),
      sourceId: sourceIds[0],
    })),
    ...deal.people
      .filter((person) => expertId(person.canonical_id))
      .slice(0, 12)
      .map((person) => ({
        role: /chair|board|non-executive|ned/.test(person.role) ? "board" : "management",
        name: person.name,
        personId: person.canonical_id,
        note: `${person.role.replaceAll("-", " ")}; public deal-source evidence only`,
        sourceId: sourceIds[0],
      })),
  ];

  const advisors = deal.advisors.map((advisor) => ({
    role: advisorRole(advisor.role),
    name: advisor.name,
    ...(companyId(advisor.canonical_id) ? { companyId: advisor.canonical_id } : {}),
    note: advisor.role.replaceAll("-", " "),
    sourceId: sourceIds[0],
  }));

  const surfacedCompanyIds = unique([
    deal.target.canonical_id,
    ...deal.sponsors.map((sponsor) => sponsor.canonical_id),
    ...deal.sellers.map((seller) => seller.canonical_id),
    ...deal.advisors.map((advisor) => advisor.canonical_id),
    ...deal.people.map((person) => person.organization_canonical_id),
  ]).filter(companyId);

  const surfacedExpertIds = unique(deal.people.map((person) => person.canonical_id)).filter(expertId);

  const sourceEvidence = deal.sources[0]?.evidence ?? deal.thesis;
  const facts = [
    fact({
      deal,
      index: 1,
      factType: "target_company",
      factValue: deal.target.name,
      normalizedValue: deal.target.canonical_id,
      evidenceText: sourceEvidence,
      confidence: 0.91,
    }),
    fact({
      deal,
      index: 2,
      factType: deal.sponsors.length ? "buyer_or_investor" : "buyer",
      factValue: deal.sponsors.map((sponsor) => sponsor.name).join("; ") || "not_disclosed",
      evidenceText: sourceEvidence,
      confidence: deal.sponsors.length ? 0.89 : 0.7,
      reviewStatus: deal.sponsors.length ? "verified" : "not_disclosed",
    }),
    fact({
      deal,
      index: 3,
      factType: "deal_type",
      factValue: deal.transactionType.replaceAll("-", " "),
      evidenceText: sourceEvidence,
      confidence: 0.86,
    }),
    fact({
      deal,
      index: 4,
      factType: "announcement_date",
      factValue: deal.announcementDate,
      evidenceText: sourceEvidence,
      confidence: 0.84,
    }),
    fact({
      deal,
      index: 5,
      factType: "theme",
      factValue: deal.theme.replaceAll("-", " "),
      evidenceText: deal.thesis,
      confidence: 0.84,
    }),
    fact({
      deal,
      index: 6,
      factType: "investment_relevance",
      factValue: deal.thesis,
      evidenceText: deal.thesis,
      confidence: 0.82,
    }),
    fact({
      deal,
      index: 7,
      factType: "advisors",
      factValue: advisors.length
        ? advisors.map((advisor) => `${advisor.name} (${advisor.note})`).join("; ")
        : "not_disclosed",
      evidenceText: deal.sources.find((source) => /advisor|counsel|financing|diligence/i.test(source.evidence))?.evidence ?? sourceEvidence,
      confidence: advisors.length ? 0.84 : 0.68,
      reviewStatus: advisors.length ? "verified" : "not_disclosed",
    }),
    fact({
      deal,
      index: 8,
      factType: "named_people",
      factValue: deal.people.length
        ? deal.people.map((person) => `${person.name} (${person.role.replaceAll("-", " ")})`).join("; ")
        : "not_disclosed",
      evidenceText: sourceEvidence,
      confidence: deal.people.length ? 0.82 : 0.68,
      reviewStatus: deal.people.length ? "verified" : "not_disclosed",
    }),
  ];

  if (deal.completionDate) {
    facts.push(
      fact({
        deal,
        index: 9,
        factType: "completion_date",
        factValue: deal.completionDate,
        evidenceText:
          deal.sources.find((source) => /complete|closing|closed/i.test(`${source.title} ${source.evidence}`))?.evidence ??
          sourceEvidence,
        confidence: 0.86,
      }),
    );
  }

  if (deal.value?.disclosed) {
    facts.push(
      fact({
        deal,
        index: 10,
        factType: "transaction_value",
        factValue: `${deal.value.amountMillions} ${deal.value.currency}m`,
        normalizedValue: `${deal.value.amountMillions}000000 ${deal.value.currency}`,
        evidenceText: sourceEvidence,
        confidence: 0.82,
      }),
    );
  } else {
    facts.push(
      fact({
        deal,
        index: 10,
        factType: "transaction_value",
        factValue: "not_disclosed",
        evidenceText: "No transaction value was disclosed in the public source set.",
        confidence: 0.72,
        reviewStatus: "not_disclosed",
      }),
    );
  }

  return {
    id: deal.id,
    name: deal.name,
    theme: deal.theme,
    geography: deal.geography,
    status: dealStatus(deal.status),
    dealType: dealType(deal.transactionType),
    announcementDate: deal.announcementDate,
    ...(deal.completionDate ? { completionDate: deal.completionDate } : {}),
    ...(companyId(deal.target.canonical_id) ? { targetCompanyId: deal.target.canonical_id } : {}),
    ...(deal.sponsors.find((sponsor) => companyId(sponsor.canonical_id))?.canonical_id
      ? { investorCompanyId: deal.sponsors.find((sponsor) => companyId(sponsor.canonical_id)).canonical_id }
      : {}),
    parties,
    advisors,
    facts,
    sourceIds,
    sources,
    investmentRelevance: deal.thesis,
    strategicRationale: `${deal.lane.replaceAll("-", " ")}: ${deal.strategy.replaceAll("-", " ")}`,
    companiesSurfaced: surfacedCompanyIds,
    expertsSurfaced: surfacedExpertIds,
    missingFacts: deal.missingFacts,
    followUpSearches: [
      `"${deal.target.name}" "${deal.name}" transaction value`,
      `"${deal.target.name}" "${deal.sponsors[0]?.name ?? ""}" legal counsel financial advisor`,
      `"${deal.target.name}" management rollover debt financing`,
      ...deal.advisors
        .slice(0, 2)
        .map((advisor) => `"${advisor.name}" "${deal.target.name}" ${advisor.role.replaceAll("-", " ")}`),
    ].filter(Boolean),
    confidence: Math.min(0.94, Math.max(0.78, deal.scores.research_priority / 100)),
  };
}

const baseById = new Map(baseDeals.map((deal) => [deal.id, deal]));
for (const deal of peCensus.candidates) {
  if (!selectedCensusDealIds.has(deal.id)) continue;
  baseById.set(deal.id, censusDealToCanonical(deal));
}

const output = [...baseById.values()].sort(
  (a, b) =>
    (b.completionDate ?? b.announcementDate ?? "").localeCompare(
      a.completionDate ?? a.announcementDate ?? "",
    ) || a.name.localeCompare(b.name),
);

writeFileSync(join(root, "data/deals.json"), `${JSON.stringify(output, null, 2)}\n`);
syncSourceRegister(output);
console.log(`Wrote ${output.length} canonical deal records`);

function syncSourceRegister(deals) {
  const sourceRegisterPath = join(root, "data/source-register.json");
  const sourceRegister = JSON.parse(readFileSync(sourceRegisterPath, "utf8"));
  const sourceByUrl = new Map(sourceRegister.sources.map((source) => [source.url, source]));
  const sourceIds = new Set(sourceRegister.sources.map((source) => source.source_id));

  for (const deal of deals) {
    const graphRefs = unique([
      ...deal.companiesSurfaced.map((id) => `company:${id}`),
      ...deal.expertsSurfaced.map((id) => `expert:${id}`),
    ]);
    for (const source of deal.sources) {
      const existing = sourceByUrl.get(source.url);
      const mappedDealRef = {
        deal_id: deal.id,
        deal_name: deal.name,
        fact_count: deal.facts.filter((fact) => fact.sourceId).length,
      };
      if (existing) {
        existing.status = "done";
        existing.graph_entity_refs = unique([...(existing.graph_entity_refs ?? []), ...graphRefs]);
        existing.mapped_deal_refs = [
          ...(existing.mapped_deal_refs ?? []).filter((ref) => ref.deal_id !== deal.id),
          mappedDealRef,
        ];
        continue;
      }

      let sourceId = `deal-${slug(source.title || deal.id)}`;
      let suffix = 2;
      while (sourceIds.has(sourceId)) {
        sourceId = `deal-${slug(source.title || deal.id)}-${suffix}`;
        suffix += 1;
      }
      sourceIds.add(sourceId);
      const nextSource = {
        source_id: sourceId,
        theme: deal.theme,
        title: source.title,
        url: source.url,
        source_type: "transaction-announcement",
        source_origin: "public",
        publisher: source.publisher ?? "Public source",
        date: deal.completionDate ?? deal.announcementDate ?? "n.d.",
        why_useful: `Public source supporting canonical deal facts for ${deal.name}.`,
        expected_entities: ["company", "expert", "advisor"],
        expected_relationships: ["invested_in", "advised", "source_supports"],
        terminal_lane: "Deal Intelligence",
        priority: 1,
        status: "done",
        graph_entity_refs: graphRefs,
        mapped_deal_refs: [mappedDealRef],
      };
      sourceRegister.sources.push(nextSource);
      sourceByUrl.set(source.url, nextSource);
    }
  }

  sourceRegister.meta = {
    ...sourceRegister.meta,
    production_graph_source_count: sourceRegister.sources.length,
    last_graph_source_mirror: "2026-06-04",
  };
  sourceRegister.sources.sort((a, b) => {
    const priority = (a.priority ?? 99) - (b.priority ?? 99);
    return priority || String(a.title).localeCompare(String(b.title));
  });
  writeFileSync(sourceRegisterPath, `${JSON.stringify(sourceRegister, null, 2)}\n`);
}
