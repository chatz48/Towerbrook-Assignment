export type ExpertsFilterParams = {
  theme?: string;
  specialty?: string;
  type?: string;
  readiness?: string;
  q?: string;
  experts?: string;
};

export function expertsPageHref(
  params: ExpertsFilterParams,
  omit?: keyof ExpertsFilterParams,
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params) as [keyof ExpertsFilterParams, string | undefined][]) {
    if (key === omit || !value || value === "all") continue;
    search.set(key, value);
  }
  const query = search.toString();
  return query ? `/experts?${query}` : "/experts";
}

/** @deprecated Use expertsPageHref — it already omits "all" values. */
export function expertsFilterHref(filters: ExpertsFilterParams): string {
  return expertsPageHref(filters);
}
