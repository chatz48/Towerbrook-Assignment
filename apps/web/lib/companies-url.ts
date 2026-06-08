export type CompaniesFilterParams = {
  theme?: string;
  category?: string;
  readiness?: string;
  q?: string;
};

export function companiesPageHref(
  params: CompaniesFilterParams,
  omit?: keyof CompaniesFilterParams,
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params) as [keyof CompaniesFilterParams, string | undefined][]) {
    if (key === omit || !value || value === "all") continue;
    search.set(key, value);
  }
  const query = search.toString();
  return query ? `/companies?${query}` : "/companies";
}
