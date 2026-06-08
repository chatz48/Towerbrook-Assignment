import { companiesWithLinks, getCompany, getExpert, resolveExpert } from "@/lib/data";
import type { PageContext } from "@/lib/ask-types";
import type { CompanyWithLinks } from "@/lib/types";

export function buildExpertFocusContext(expertId: string): PageContext | undefined {
  const expert = getExpert(expertId);
  if (!expert) return undefined;
  const resolved = resolveExpert(expert);
  const linkedCompanies = resolved.resolvedCompanies
    .slice(0, 8)
    .map((link) => `${link.company.name} (${link.relationship})`)
    .join("; ");
  return {
    title: expert.name,
    pathname: `/experts/${expert.id}`,
    headings: [expert.headline, expert.type, ...(expert.specialties ?? [])],
    visibleText: [
      expert.whyRelevant,
      expert.bio ?? "",
      expert.org ? `Organisation: ${expert.org}` : "",
      linkedCompanies ? `Linked companies: ${linkedCompanies}` : "",
      expert.sources.slice(0, 3).map((s) => s.title).join("; "),
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

export function buildCompanyFocusContext(companyId: string): PageContext | undefined {
  const withLinks = companiesWithLinks().find((item) => item.id === companyId);
  const company: CompanyWithLinks | undefined =
    withLinks ?? (getCompany(companyId) ? { ...getCompany(companyId)!, linkedExperts: [], expertCount: 0 } : undefined);
  if (!company) return undefined;
  const linkedExperts = withLinks
    ? withLinks.linkedExperts
        .slice(0, 8)
        .map((link) => `${link.expert.name} (${link.relationship})`)
        .join("; ")
    : "";
  return {
    title: company.name,
    pathname: `/companies/${company.id}`,
    headings: [company.category, company.ownershipStatus ?? "", ...(company.specialties ?? [])],
    visibleText: [
      company.description,
      company.whyInteresting ?? "",
      linkedExperts ? `Linked experts: ${linkedExperts}` : "",
      company.sources.slice(0, 3).map((s) => s.title).join("; "),
    ]
      .filter(Boolean)
      .join("\n"),
  };
}
