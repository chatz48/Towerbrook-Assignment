import { getCompanies, getExperts } from "@/lib/data";
import { filterTowerBrookEmployees } from "@/lib/employee-scope";
import type { SearchItem } from "@/app/components/SearchBox";

export function buildSearchIndex(
  themeFocus: string,
  includeTowerBrookEmployees: boolean,
): SearchItem[] {
  const experts = filterTowerBrookEmployees(getExperts(), includeTowerBrookEmployees)
    .filter((expert) => themeFocus === "all" || expert.themes.includes(themeFocus as never))
    .map((expert) => ({
      id: expert.id,
      name: expert.name,
      sub: expert.headline,
      kind: "expert" as const,
      href: `/experts/${expert.id}`,
      keywords: [expert.name, expert.headline, expert.org ?? "", ...(expert.specialties ?? [])]
        .join(" ")
        .toLowerCase(),
    }));

  const companies = getCompanies()
    .filter((company) => themeFocus === "all" || company.themes.includes(themeFocus as never))
    .map((company) => ({
      id: company.id,
      name: company.name,
      sub: company.description?.slice(0, 80) ?? company.category,
      kind: "company" as const,
      href: `/companies/${company.id}`,
      keywords: [company.name, company.description ?? "", company.whyInteresting ?? ""]
        .join(" ")
        .toLowerCase(),
    }));

  return [...experts, ...companies];
}
