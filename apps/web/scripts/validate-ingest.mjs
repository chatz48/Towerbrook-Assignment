import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const dealsPath = path.join(root, "data", "deals.json");
const companiesPath = path.join(root, "data", "companies.json");
const expertsPath = path.join(root, "data", "experts.json");

const deals = JSON.parse(fs.readFileSync(dealsPath, "utf8"));
const companies = JSON.parse(fs.readFileSync(companiesPath, "utf8"));
const experts = JSON.parse(fs.readFileSync(expertsPath, "utf8"));

const companyIds = new Set(companies.map((company) => company.id));
const expertIds = new Set(experts.map((expert) => expert.id));
const errors = [];

for (const deal of deals) {
  check(deal.id, "id", deal.id);
  check(deal.id, "name", deal.name);
  check(deal.id, "theme", deal.theme);
  check(deal.id, "dealType", deal.dealType);
  check(deal.id, "investmentRelevance", deal.investmentRelevance);
  check(deal.id, "source", Array.isArray(deal.sources) && deal.sources.length > 0);
  check(deal.id, "relationship edge", deal.parties.length + deal.advisors.length > 1);

  const hasTarget = deal.parties.some((party) => party.role === "target") || deal.targetCompanyId;
  const hasBuyer =
    deal.parties.some((party) => party.role === "buyer" || party.role === "investor") ||
    deal.buyerCompanyId ||
    deal.investorCompanyId;
  check(deal.id, "target", hasTarget);
  check(deal.id, "buyer/investor", hasBuyer);
  check(deal.id, "date", deal.announcementDate || deal.completionDate);

  for (const companyId of [
    deal.targetCompanyId,
    deal.buyerCompanyId,
    deal.investorCompanyId,
    deal.sellerCompanyId,
    ...(deal.companiesSurfaced ?? []),
    ...deal.parties.map((party) => party.companyId),
    ...deal.advisors.map((advisor) => advisor.companyId),
  ].filter(Boolean)) {
    if (!companyIds.has(companyId)) {
      errors.push(`${deal.id}: unknown company id ${companyId}`);
    }
  }

  for (const expertId of [
    ...(deal.expertsSurfaced ?? []),
    ...deal.parties.map((party) => party.personId),
  ].filter(Boolean)) {
    if (!expertIds.has(expertId)) {
      errors.push(`${deal.id}: unknown expert id ${expertId}`);
    }
  }

  for (const fact of deal.facts ?? []) {
    check(deal.id, `fact ${fact.id} confidence`, typeof fact.confidence === "number");
    check(deal.id, `fact ${fact.id} status`, fact.reviewStatus);
    if (fact.reviewStatus === "verified" && !fact.evidenceText) {
      errors.push(`${deal.id}: verified fact ${fact.id} is missing evidenceText`);
    }
  }
}

if (errors.length) {
  console.error(`Deal ingestion validation failed with ${errors.length} issue(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Validated ${deals.length} deal record(s).`);

function check(dealId, label, value) {
  if (!value) errors.push(`${dealId}: missing ${label}`);
}
