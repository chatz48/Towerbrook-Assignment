#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, "..");
const generatedAt = "2026-06-04";

const discovery = JSON.parse(
  readFileSync(join(root, "data/expert-first-pe-discovery-candidates.json"), "utf8"),
);
const canonicalExperts = JSON.parse(readFileSync(join(root, "data/experts.json"), "utf8"));
const canonicalCompanies = JSON.parse(readFileSync(join(root, "data/companies.json"), "utf8"));
const deals = JSON.parse(readFileSync(join(root, "data/deals.json"), "utf8"));

const requestedAdvisorOrganizations = new Set([
  "Canaccord Genuity",
  "Bridgepoint Credit",
  "EY",
  "Fried Frank",
  "PwC",
  "Baringa",
  "Eight Advisory",
  "Roland Berger",
]);

const companyById = new Map(canonicalCompanies.map((company) => [company.id, company]));
const companyDealIds = new Set(
  deals.flatMap((deal) => [
    deal.targetCompanyId,
    deal.buyerCompanyId,
    deal.investorCompanyId,
    deal.sellerCompanyId,
    ...deal.companiesSurfaced,
  ]),
);

function normalize(value) {
  return value
    .toLowerCase()
    .replaceAll("&", "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function slug(value) {
  return normalize(value).replaceAll(" ", "-");
}

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

function hasInvestmentEvidence(company) {
  return Boolean(
    company &&
      (company.funding ||
        company.owner ||
        companyDealIds.has(company.id) ||
        ["sponsor-owned", "acquired", "public"].includes(company.ownershipStatus)),
  );
}

function founderQueries(name, companies, themes) {
  const companyExpression = companies.map((company) => `"${company}"`).join(" OR ");
  const themeExpression = themes.map((theme) => `"${theme}"`).join(" OR ");
  return unique([
    `"${name}" (${companyExpression}) (founder OR co-founder) (investment OR acquisition OR "private equity" OR "growth equity")`,
    `"${name}" ("new company" OR founded OR launched OR startup OR portfolio) after (${companyExpression})`,
    `"${name}" (angel OR investor OR board OR advisor) (${themeExpression})`,
    `(${companyExpression}) founder (investment OR acquisition OR funding)`,
  ]);
}

const founderSeeds = new Map();

for (const candidate of discovery.expert_candidates) {
  if (!candidate.archetypes.includes("founder-operator")) continue;
  founderSeeds.set(normalize(candidate.name), {
    name: candidate.name,
    companies: unique(candidate.organizations),
    themes: candidate.themes,
    priority: Math.min(100, candidate.scores.research_priority + 8),
    source: "pe-deal-founder-candidate",
    seedCandidateId: candidate.candidate_id,
    canonicalExpertId: candidate.canonical_match.expert_id,
  });
}

for (const expert of canonicalExperts) {
  if (expert.type !== "ex-founder") continue;
  const fundedCompanies = expert.companies
    .map((link) => companyById.get(link.companyId))
    .filter(hasInvestmentEvidence);
  if (!fundedCompanies.length) continue;
  const key = normalize(expert.name);
  const existing = founderSeeds.get(key);
  founderSeeds.set(key, {
    name: expert.name,
    companies: unique([
      ...(existing?.companies ?? []),
      ...fundedCompanies.map((company) => company.name),
    ]),
    themes: unique([...(existing?.themes ?? []), ...expert.themes]),
    priority: Math.max(existing?.priority ?? 0, 82),
    source: existing ? "pe-deal-and-canonical-ex-founder" : "canonical-ex-founder",
    seedCandidateId: existing?.seedCandidateId ?? null,
    canonicalExpertId: expert.id,
  });
}

const founderJobs = [...founderSeeds.values()]
  .map((founder) => ({
    external_job_id: `founder-origination:${slug(founder.name)}`,
    job_type: "founder_origination",
    theme_id: founder.themes[0] ?? null,
    priority: founder.priority,
    query: founderQueries(founder.name, founder.companies, founder.themes)[0],
    metadata: {
      category: "founder-origination",
      objective:
        "Verify the founder's prior investment or exit history, then identify new companies, boards, investments, advisory roles, and founder referrals that could reveal new investment opportunities.",
      queries: founderQueries(founder.name, founder.companies, founder.themes),
      target_name: founder.name,
      target_organizations: founder.companies,
      target_themes: founder.themes,
      seed_source: founder.source,
      seed_candidate_id: founder.seedCandidateId,
      canonical_expert_id: founder.canonicalExpertId,
      expected_outputs: [
        "verified_founder_profile",
        "past_investment_or_exit",
        "new_company_opportunities",
        "current_board_and_advisory_roles",
        "investments_and_founder_referrals",
      ],
      review_gated: true,
    },
  }))
  .sort((a, b) => b.priority - a.priority || a.metadata.target_name.localeCompare(b.metadata.target_name));

const advisorJobs = discovery.advisor_expert_gaps
  .filter((gap) => requestedAdvisorOrganizations.has(gap.organization))
  .map((gap) => ({
    external_job_id: `advisor-gap:${slug(gap.organization)}:${slug(gap.advisor_role)}`,
    job_type: "advisor_expert_gap",
    theme_id: gap.themes[0] ?? null,
    priority: gap.search_priority,
    query: gap.search_queries[0],
    metadata: {
      category: "advisor-expert-gap",
      objective:
        "Identify the named senior professionals who performed the evidenced transaction role, verify their exact role, and map other relevant sector transactions and relationships.",
      queries: gap.search_queries,
      target_organization: gap.organization,
      target_role: gap.advisor_role,
      target_themes: gap.themes,
      target_deals: gap.deals,
      gap_id: gap.gap_id,
      expected_outputs: [
        "named_professionals",
        "exact_transaction_roles",
        "other_relevant_transactions",
        "current_role_and_contact_path",
      ],
      review_gated: true,
    },
  }))
  .sort((a, b) => b.priority - a.priority || a.metadata.target_organization.localeCompare(b.metadata.target_organization));

const identityJobs = discovery.expert_candidates
  .filter((candidate) => candidate.canonical_match.status === "unresolved")
  .map((candidate) => {
    const organizationExpression = candidate.organizations
      .map((organization) => `"${organization}"`)
      .join(" OR ");
    const themeExpression = candidate.themes.map((theme) => `"${theme}"`).join(" OR ");
    const queries = unique([
      `"${candidate.name}" (${organizationExpression})`,
      `"${candidate.name}" LinkedIn (${organizationExpression})`,
      `"${candidate.name}" (${themeExpression})`,
      ...candidate.deal_roles.slice(0, 2).map(
        (role) => `"${candidate.name}" "${role.target}" "${role.role.replaceAll("-", " ")}"`,
      ),
    ]);
    return {
      external_job_id: `identity-resolution:${slug(candidate.name)}`,
      job_type: "identity_resolution",
      theme_id: candidate.themes[0] ?? null,
      priority: candidate.scores.research_priority,
      query: queries[0],
      metadata: {
        category: "identity-resolution",
        objective:
          "Verify this person's identity, current role, employment history, LinkedIn profile, exact PE-deal roles, and whether the person matches an existing canonical expert.",
        queries,
        target_name: candidate.name,
        target_organizations: candidate.organizations,
        target_themes: candidate.themes,
        seed_candidate_id: candidate.candidate_id,
        target_deal_roles: candidate.deal_roles,
        expected_outputs: [
          "verified_identity",
          "current_role",
          "employment_history",
          "linkedin_profile",
          "canonical_match_candidate",
        ],
        review_gated: true,
      },
    };
  })
  .sort((a, b) => b.priority - a.priority || a.metadata.target_name.localeCompare(b.metadata.target_name));

const jobs = [...founderJobs, ...advisorJobs, ...identityJobs];
const output = {
  schema_version: "origination-research-jobs.v1",
  generated_at: generatedAt,
  generated_by: "scripts/build-origination-research-jobs.mjs",
  operating_principle:
    "Use previously funded founders and PE-deal experts to uncover new investment opportunities; keep all live discoveries review-gated.",
  required_pipeline: ["KeiroLabs search and fetch", "DeepSeek structured extraction", "Supabase candidate and match persistence"],
  execution_policy:
    "Do not execute live jobs unless KeiroLabs, DeepSeek, and Supabase are all configured. Dry runs may inspect queries without provider credentials.",
  coverage: {
    total_jobs: jobs.length,
    founder_origination: founderJobs.length,
    advisor_expert_gaps: advisorJobs.length,
    identity_resolution: identityJobs.length,
    advisor_organizations: unique(advisorJobs.map((job) => job.metadata.target_organization)),
  },
  queues: {
    founder_origination: founderJobs,
    advisor_expert_gaps: advisorJobs,
    identity_resolution: identityJobs,
  },
  jobs,
};

writeFileSync(
  join(root, "data/origination-research-jobs.json"),
  `${JSON.stringify(output, null, 2)}\n`,
);
console.log(
  `Wrote ${jobs.length} origination research job(s): ${founderJobs.length} founder, ${advisorJobs.length} advisor-gap, ${identityJobs.length} identity-resolution`,
);
