#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, "..");
const generatedAt = "2026-06-04";

const peCensus = JSON.parse(
  readFileSync(join(root, "data/private-equity-deal-census-candidates.json"), "utf8"),
);
const canonicalExperts = JSON.parse(readFileSync(join(root, "data/experts.json"), "utf8"));
const canonicalCompanies = JSON.parse(readFileSync(join(root, "data/companies.json"), "utf8"));

const canonicalExpertByName = new Map(
  canonicalExperts.map((expert) => [normalizeName(expert.name), expert]),
);
const canonicalCompanyByName = new Map(
  canonicalCompanies.map((company) => [normalizeName(company.name), company]),
);

const roleRules = [
  {
    pattern: /founder/,
    archetype: "founder-operator",
    expertType: "operator",
    relationship: "founded",
    weight: 100,
  },
  {
    pattern: /towerbrook-deal-lead/,
    archetype: "towerbrook-dealmaker",
    expertType: "investor",
    relationship: "invested-in",
    weight: 100,
  },
  {
    pattern: /buyer-dealmaker|seller-dealmaker|sponsor-dealmaker/,
    archetype: "peer-fund-dealmaker",
    expertType: "investor",
    relationship: "invested-in",
    weight: 92,
  },
  {
    pattern: /ceo|president|target-leader|commercial-lead|management/,
    archetype: "operator",
    expertType: "operator",
    relationship: "led",
    weight: 90,
  },
  {
    pattern: /chair|board|non-executive|ned/,
    archetype: "board-advisor",
    expertType: "advisor",
    relationship: "board",
    weight: 86,
  },
  {
    pattern: /financial-advisor|banker/,
    archetype: "banker",
    expertType: "banker",
    relationship: "banked",
    weight: 84,
  },
  {
    pattern: /debt|lender|credit|financing-counsel/,
    archetype: "lender-credit",
    expertType: "lender-credit",
    relationship: "banked",
    weight: 83,
  },
  {
    pattern: /legal|counsel/,
    archetype: "lawyer",
    expertType: "lawyer",
    relationship: "legal-counsel",
    weight: 80,
  },
  {
    pattern: /commercial-diligence|commercial-advisor/,
    archetype: "commercial-diligence",
    expertType: "commercial-dd",
    relationship: "served",
    weight: 80,
  },
  {
    pattern: /technical|technology|operational|environmental|esg|insurance|diligence/,
    archetype: "technical-diligence",
    expertType: "technical-dd",
    relationship: "served",
    weight: 79,
  },
  {
    pattern: /regulatory/,
    archetype: "regulatory-policy",
    expertType: "regulatory-policy",
    relationship: "served",
    weight: 79,
  },
  {
    pattern: /engineering|asset|design/,
    archetype: "engineering-consultant",
    expertType: "engineering-consultant",
    relationship: "served",
    weight: 78,
  },
  {
    pattern: /strategy|advisor/,
    archetype: "strategy-consultant",
    expertType: "strategy-consultant",
    relationship: "served",
    weight: 78,
  },
];

const advisorRules = [
  {
    pattern: /legal|counsel/,
    expertType: "lawyer",
    companyCategory: "advisory",
    relationship: "legal-counsel",
    weight: 88,
  },
  {
    pattern: /financing-provider|lender|debt|credit|finance-counsel/,
    expertType: "lender-credit",
    companyCategory: "investor",
    relationship: "banked",
    weight: 89,
  },
  {
    pattern: /financial|m-and-a|financing|lender/,
    expertType: "banker",
    companyCategory: "advisory",
    relationship: "banked",
    weight: 90,
  },
  {
    pattern: /commercial-diligence|commercial-advisor/,
    expertType: "commercial-dd",
    companyCategory: "service-provider",
    relationship: "served",
    weight: 88,
  },
  {
    pattern: /technical|operational|technology|environmental|esg|insurance/,
    expertType: "technical-dd",
    companyCategory: "service-provider",
    relationship: "served",
    weight: 87,
  },
  {
    pattern: /regulatory/,
    expertType: "regulatory-policy",
    companyCategory: "service-provider",
    relationship: "served",
    weight: 86,
  },
  {
    pattern: /engineering|design|asset|infrastructure-advisory/,
    expertType: "engineering-consultant",
    companyCategory: "service-provider",
    relationship: "served",
    weight: 85,
  },
  {
    pattern: /strategy|market|advisor|consult/,
    expertType: "strategy-consultant",
    companyCategory: "service-provider",
    relationship: "advised",
    weight: 84,
  },
  {
    pattern: /diligence|tax|operational/,
    expertType: "technical-dd",
    companyCategory: "service-provider",
    relationship: "served",
    weight: 86,
  },
  {
    pattern: /advisor/,
    expertType: "advisor",
    companyCategory: "advisory",
    relationship: "advised",
    weight: 78,
  },
];

function normalizeName(value) {
  return value
    .toLowerCase()
    .replaceAll("&", "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function slug(value) {
  return normalizeName(value).replaceAll(" ", "-");
}

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

function roleConfig(role) {
  return (
    roleRules.find((rule) => rule.pattern.test(role)) ?? {
      archetype: "operator",
      expertType: "operator",
      relationship: "served",
      weight: 65,
    }
  );
}

function advisorConfig(role) {
  return (
    advisorRules.find((rule) => rule.pattern.test(role)) ?? {
      expertType: "advisor",
      companyCategory: "advisory",
      relationship: "advised",
      weight: 70,
    }
  );
}

function companyCategoryFromExpertType(expertType) {
  if (expertType === "investor") return "investor";
  if (expertType === "lender-credit") return "investor";
  if (expertType === "lawyer" || expertType === "banker" || expertType === "advisor") {
    return "advisory";
  }
  if (
    expertType === "service-provider" ||
    expertType === "strategy-consultant" ||
    expertType === "commercial-dd" ||
    expertType === "technical-dd" ||
    expertType === "engineering-consultant" ||
    expertType === "regulatory-policy"
  ) {
    return "service-provider";
  }
  return "target";
}

function sourcesForDeal(deal) {
  return deal.sources.map((source) => ({
    title: source.title,
    publisher: source.publisher,
    url: source.url,
    evidence: source.evidence,
  }));
}

const expertAccumulator = new Map();

for (const deal of peCensus.candidates) {
  for (const person of deal.people) {
    const key = normalizeName(person.name);
    const config = roleConfig(person.role);
    if (!expertAccumulator.has(key)) {
      expertAccumulator.set(key, {
        name: person.name,
        canonical: canonicalExpertByName.get(key) ?? null,
        roles: [],
        themes: new Set(),
        organizations: new Set(),
        dealIds: new Set(),
        sources: new Map(),
        connectedCompanies: new Map(),
      });
    }

    const expert = expertAccumulator.get(key);
    expert.roles.push({
      deal_id: deal.id,
      deal_name: deal.name,
      deal_lane: deal.lane,
      deal_priority: deal.scores.research_priority,
      deal_date: deal.completionDate ?? deal.announcementDate,
      role: person.role,
      organization: person.organization,
      target: deal.target.name,
      archetype: config.archetype,
      expert_type: config.expertType,
      role_weight: config.weight,
      evidence_sources: sourcesForDeal(deal),
    });
    expert.dealIds.add(deal.id);
    expert.organizations.add(person.organization);
    expert.themes.add(deal.theme);
    for (const theme of deal.secondaryThemes) expert.themes.add(theme);
    for (const source of sourcesForDeal(deal)) expert.sources.set(source.url, source);

    expert.connectedCompanies.set(normalizeName(person.organization), {
      name: person.organization,
      relationship: config.expertType === "investor" ? "partner" : config.relationship,
      evidence_deal_ids: unique([
        ...(expert.connectedCompanies.get(normalizeName(person.organization))?.evidence_deal_ids ?? []),
        deal.id,
      ]),
    });
    expert.connectedCompanies.set(normalizeName(deal.target.name), {
      name: deal.target.name,
      relationship: config.relationship,
      evidence_deal_ids: unique([
        ...(expert.connectedCompanies.get(normalizeName(deal.target.name))?.evidence_deal_ids ?? []),
        deal.id,
      ]),
    });
  }
}

const expertCandidates = [...expertAccumulator.values()]
  .map((expert) => {
    const primaryRole = [...expert.roles].sort((a, b) => b.role_weight - a.role_weight)[0];
    const dealPriority = Math.max(...expert.roles.map((role) => role.deal_priority));
    const roleStrength = primaryRole.role_weight;
    const towerbrookProximity = expert.roles.some((role) => role.role === "towerbrook-deal-lead")
      ? 100
      : expert.roles.some((role) => role.deal_lane === "towerbrook")
        ? 85
        : 45;
    const recency = Math.max(
      ...expert.roles.map(
        (role) =>
          peCensus.candidates.find((deal) => deal.id === role.deal_id)?.scores.recent_activity ?? 0,
      ),
    );
    const repeatActivity = Math.min(100, expert.dealIds.size * 35);
    const evidenceStrength = Math.min(100, expert.sources.size * 25 + expert.roles.length * 10);
    const researchPriority = Math.round(
      dealPriority * 0.3 +
        roleStrength * 0.25 +
        towerbrookProximity * 0.2 +
        recency * 0.1 +
        repeatActivity * 0.1 +
        evidenceStrength * 0.05,
    );

    const roleLabels = unique(expert.roles.map((role) => role.role.replaceAll("-", " ")));
    const targetNames = unique(expert.roles.map((role) => role.target));
    const organizationNames = [...expert.organizations];
    const canonical = expert.canonical;

    return {
      candidate_id: `expert-candidate:${slug(expert.name)}`,
      name: expert.name,
      expert_type: canonical?.type ?? primaryRole.expert_type,
      archetypes: unique(expert.roles.map((role) => role.archetype)),
      themes: [...expert.themes],
      organizations: organizationNames,
      headline:
        canonical?.headline ??
        `${roleLabels[0]} connected to ${targetNames.slice(0, 2).join(" and ")}`,
      why_relevant: `${expert.name} is evidenced as ${roleLabels.join(", ")} across ${expert.dealIds.size} priority PE transaction${expert.dealIds.size === 1 ? "" : "s"}, connecting ${organizationNames.join(", ")} with ${targetNames.join(", ")}.`,
      access_path:
        towerbrookProximity === 100
          ? "direct-towerbrook-dealmaker"
          : towerbrookProximity === 85
            ? "towerbrook-deal-participant"
            : "peer-deal-participant",
      canonical_match: canonical
        ? { status: "exact_name_match", expert_id: canonical.id }
        : { status: "unresolved", expert_id: null },
      deal_roles: expert.roles,
      connected_companies: [...expert.connectedCompanies.values()],
      sources: [...expert.sources.values()],
      scores: {
        deal_priority: dealPriority,
        role_strength: roleStrength,
        towerbrook_proximity: towerbrookProximity,
        recent_activity: recency,
        repeat_deal_activity: repeatActivity,
        evidence_strength: evidenceStrength,
        research_priority: researchPriority,
      },
      missing_profile_facts: unique([
        canonical?.linkedin ? null : "linkedin",
        canonical?.location ? null : "location",
        "current_role_and_employment_history",
        "specific_theme_specialties",
        "warm_relationship_path",
        "availability_and_conflicts",
      ]),
      follow_up_searches: unique([
        ...organizationNames.map((organization) => `"${expert.name}" "${organization}"`),
        ...targetNames.map((target) => `"${expert.name}" "${target}"`),
        `"${expert.name}" LinkedIn`,
        `"${expert.name}" ${[...expert.themes].map((theme) => `"${theme}"`).join(" OR ")}`,
      ]),
      review: {
        status: "needs_review",
        reviewer: null,
        notes: "Verify identity, current role, and exact deal role before promotion to the canonical expert graph.",
      },
    };
  })
  .sort((a, b) => b.scores.research_priority - a.scores.research_priority || a.name.localeCompare(b.name));

const expertByOrganization = new Map();
for (const expert of expertCandidates) {
  for (const organization of expert.organizations) {
    const key = normalizeName(organization);
    if (!expertByOrganization.has(key)) expertByOrganization.set(key, []);
    expertByOrganization.get(key).push(expert);
  }
}

const advisorGapAccumulator = new Map();
for (const deal of peCensus.candidates) {
  for (const advisor of deal.advisors) {
    const key = `${normalizeName(advisor.name)}:${advisor.role}`;
    const config = advisorConfig(advisor.role);
    if (!advisorGapAccumulator.has(key)) {
      advisorGapAccumulator.set(key, {
        organization: advisor.name,
        role: advisor.role,
        expertType: config.expertType,
        weight: config.weight,
        themes: new Set(),
        deals: [],
        sources: new Map(),
      });
    }
    const gap = advisorGapAccumulator.get(key);
    gap.themes.add(deal.theme);
    for (const theme of deal.secondaryThemes) gap.themes.add(theme);
    gap.deals.push({
      deal_id: deal.id,
      deal_name: deal.name,
      target: deal.target.name,
      lane: deal.lane,
      priority: deal.scores.research_priority,
    });
    for (const source of sourcesForDeal(deal)) gap.sources.set(source.url, source);
  }
}

const advisorExpertGaps = [...advisorGapAccumulator.values()]
  .map((gap) => {
    const namedExperts = expertByOrganization.get(normalizeName(gap.organization)) ?? [];
    const themes = [...gap.themes];
    const maxDealPriority = Math.max(...gap.deals.map((deal) => deal.priority));
    const towerbrookProximity = gap.deals.some((deal) => deal.lane === "towerbrook") ? 100 : 55;
    const searchPriority = Math.round(
      maxDealPriority * 0.45 + gap.weight * 0.3 + towerbrookProximity * 0.2 + (namedExperts.length ? 0 : 5),
    );
    return {
      gap_id: `advisor-expert-gap:${slug(gap.organization)}:${slug(gap.role)}`,
      organization: gap.organization,
      advisor_role: gap.role,
      expert_type_sought: gap.expertType,
      themes,
      coverage_status: namedExperts.length ? "partial-named-coverage" : "no-named-expert",
      named_experts_found: namedExperts.map((expert) => ({
        candidate_id: expert.candidate_id,
        name: expert.name,
      })),
      deals: gap.deals,
      sources: [...gap.sources.values()],
      search_priority: searchPriority,
      search_queries: unique(
        gap.deals.flatMap((deal) => [
          `"${deal.target}" "${gap.organization}" deal team`,
          `"${gap.organization}" "${deal.target}" partner`,
          `"${gap.organization}" "${deal.target}" ${gap.expertType}`,
          `"${gap.organization}" ${themes.map((theme) => `"${theme}"`).join(" OR ")} partner`,
        ]),
      ),
      success_condition:
        "Identify at least one named senior professional with source-grounded evidence of the exact transaction role.",
      review: { status: "needs_research", reviewer: null, notes: null },
    };
  })
  .sort((a, b) => b.search_priority - a.search_priority || a.organization.localeCompare(b.organization));

const companyAccumulator = new Map();

function addCompany(name, input) {
  if (!name || /management|founders|employees|continuing owner|shareholders/i.test(name)) return;
  const key = normalizeName(name);
  if (!companyAccumulator.has(key)) {
    companyAccumulator.set(key, {
      name,
      canonical: canonicalCompanyByName.get(key) ?? null,
      categories: new Set(),
      themes: new Set(),
      roles: new Set(),
      deals: new Map(),
      experts: new Map(),
      sources: new Map(),
      ownerNames: new Set(),
    });
  }
  const company = companyAccumulator.get(key);
  company.categories.add(input.category);
  company.roles.add(input.role);
  for (const theme of input.themes) company.themes.add(theme);
  if (input.deal) company.deals.set(input.deal.id, input.deal);
  if (input.expert) company.experts.set(input.expert.candidate_id, input.expert);
  if (input.owner) company.ownerNames.add(input.owner);
  for (const source of input.sources ?? []) company.sources.set(source.url, source);
}

for (const deal of peCensus.candidates) {
  const dealSummary = {
    id: deal.id,
    name: deal.name,
    lane: deal.lane,
    theme: deal.theme,
    priority: deal.scores.research_priority,
    date: deal.completionDate ?? deal.announcementDate,
  };
  const themes = [deal.theme, ...deal.secondaryThemes];
  const sources = sourcesForDeal(deal);
  addCompany(deal.target.name, {
    category: "target",
    role: "deal-target",
    themes,
    deal: dealSummary,
    owner: deal.sponsors
      .filter((sponsor) => !/seller|replaced/.test(sponsor.role))
      .map((sponsor) => sponsor.name)
      .join(", "),
    sources,
  });
  for (const sponsor of deal.sponsors) {
    addCompany(sponsor.name, {
      category: "investor",
      role: sponsor.role,
      themes,
      deal: dealSummary,
      sources,
    });
  }
  for (const advisor of deal.advisors) {
    const config = advisorConfig(advisor.role);
    addCompany(advisor.name, {
      category: config.companyCategory,
      role: advisor.role,
      themes,
      deal: dealSummary,
      sources,
    });
  }
}

for (const expert of expertCandidates) {
  for (const link of expert.connected_companies) {
    addCompany(link.name, {
      category: companyCategoryFromExpertType(expert.expert_type),
      role: link.relationship,
      themes: expert.themes,
      expert,
      sources: expert.sources,
    });
  }
}

const companyCandidates = [...companyAccumulator.values()]
  .filter((company) => company.experts.size > 0)
  .map((company) => {
    const categories = [...company.categories];
    const category = categories.includes("target")
      ? "target"
      : categories.includes("investor")
        ? "investor"
        : categories.includes("service-provider")
          ? "service-provider"
          : "advisory";
    const expertDensity = company.experts.size;
    const expertQuality =
      expertDensity === 0
        ? 0
        : Math.round(
            [...company.experts.values()].reduce(
              (sum, expert) => sum + expert.scores.research_priority,
              0,
            ) / expertDensity,
          );
    const dealPriority = company.deals.size
      ? Math.max(...[...company.deals.values()].map((deal) => deal.priority))
      : 0;
    const roleDiversity = Math.min(100, company.roles.size * 20);
    const actionability = category === "target" ? 95 : category === "service-provider" ? 80 : category === "advisory" ? 75 : 60;
    const researchPriority = Math.round(
      Math.min(100, expertDensity * 18) * 0.35 +
        expertQuality * 0.25 +
        dealPriority * 0.2 +
        roleDiversity * 0.1 +
        actionability * 0.1,
    );
    const canonical = company.canonical;
    const owner = unique([...company.ownerNames]).join(", ") || canonical?.owner || null;

    return {
      candidate_id: `company-candidate:${slug(company.name)}`,
      name: company.name,
      category,
      themes: [...company.themes],
      ownership_status:
        category === "target" && owner ? "sponsor-owned-or-invested" : canonical?.ownershipStatus ?? "unverified",
      owner,
      why_interesting: `${company.name} is derived from ${expertDensity} named expert connection${expertDensity === 1 ? "" : "s"} across ${company.deals.size} priority PE transaction${company.deals.size === 1 ? "" : "s"}.`,
      canonical_match: canonical
        ? { status: "exact_name_match", company_id: canonical.id }
        : { status: "unresolved", company_id: null },
      expert_connections: [...company.experts.values()]
        .map((expert) => ({
          expert_candidate_id: expert.candidate_id,
          name: expert.name,
          expert_type: expert.expert_type,
          expert_priority: expert.scores.research_priority,
        }))
        .sort((a, b) => b.expert_priority - a.expert_priority),
      deal_connections: [...company.deals.values()].sort((a, b) => b.priority - a.priority),
      roles: [...company.roles],
      sources: [...company.sources.values()],
      scores: {
        expert_density: Math.min(100, expertDensity * 18),
        expert_quality: expertQuality,
        deal_priority: dealPriority,
        role_diversity: roleDiversity,
        actionability,
        research_priority: researchPriority,
      },
      next_questions: unique([
        category === "target" ? "Is the company actionable despite its current ownership?" : null,
        "Which linked experts can provide the strongest introduction or diligence path?",
        "What adjacent companies do the linked experts consider strongest?",
        "What has changed since the most recent PE transaction?",
      ]),
      review: {
        status: "needs_review",
        reviewer: null,
        notes: "Derived from the expert graph. Verify category, ownership, and investment relevance before canonical promotion.",
      },
    };
  })
  .sort((a, b) => b.scores.research_priority - a.scores.research_priority || a.name.localeCompare(b.name));

const output = {
  schema_version: "expert-first-pe-discovery-candidates.v1",
  generated_at: generatedAt,
  generated_by: "scripts/build-expert-first-census.mjs",
  operating_principle:
    "Experts are the primary output and graph hub. PE deals provide evidence; companies are reverse-derived from expert relationships.",
  review_policy:
    "All people, relationships, and derived companies remain review-gated until identity, role, and evidence are verified.",
  score_method: {
    expert_priority:
      "30% originating-deal priority + 25% role strength + 20% TowerBrook proximity + 10% recency + 10% repeat deal activity + 5% evidence strength",
    company_priority:
      "35% expert density + 25% expert quality + 20% deal priority + 10% role diversity + 10% actionability",
  },
  coverage: {
    expert_candidates: expertCandidates.length,
    canonical_expert_matches: expertCandidates.filter(
      (expert) => expert.canonical_match.status === "exact_name_match",
    ).length,
    by_expert_type: Object.fromEntries(
      unique(expertCandidates.map((expert) => expert.expert_type)).map((type) => [
        type,
        expertCandidates.filter((expert) => expert.expert_type === type).length,
      ]),
    ),
    towerbrook_connected_experts: expertCandidates.filter(
      (expert) => expert.access_path !== "peer-deal-participant",
    ).length,
    advisor_expert_gaps: advisorExpertGaps.length,
    advisor_gaps_with_no_named_expert: advisorExpertGaps.filter(
      (gap) => gap.coverage_status === "no-named-expert",
    ).length,
    derived_companies: companyCandidates.length,
    canonical_company_matches: companyCandidates.filter(
      (company) => company.canonical_match.status === "exact_name_match",
    ).length,
  },
  expert_candidates: expertCandidates,
  advisor_expert_gaps: advisorExpertGaps,
  derived_company_candidates: companyCandidates,
};

writeFileSync(
  join(root, "data/expert-first-pe-discovery-candidates.json"),
  `${JSON.stringify(output, null, 2)}\n`,
);
console.log(
  `Wrote ${expertCandidates.length} expert candidates, ${advisorExpertGaps.length} advisor gaps, and ${companyCandidates.length} derived companies to data/expert-first-pe-discovery-candidates.json`,
);
