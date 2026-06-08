import type { Company } from "./types";
import { COMPANY_CATEGORY_LABEL } from "./labels";

const GENERIC_WHY_INTERESTING = [
  /^TowerBrook warm-path connector from a public transaction or matter page\.?$/i,
  /^TowerBrook warm-path connector or unresolved advisor organization from public transaction evidence\.?$/i,
];

function isGenericWhyInteresting(value?: string): boolean {
  const trimmed = value?.trim();
  if (!trimmed) return true;
  return GENERIC_WHY_INTERESTING.some((pattern) => pattern.test(trimmed));
}

function firstSentence(text: string): string {
  const match = text.trim().match(/^(.+?[.!?])(?:\s|$)/);
  return (match?.[1] ?? text.trim()).trim();
}

/** Prefer transaction-specific copy over boilerplate whyInteresting placeholders. */
export function companySummaryDetail(
  company: Pick<Company, "name" | "category" | "description" | "whyInteresting" | "sources">,
): string {
  const why = company.whyInteresting?.trim();
  if (why && !isGenericWhyInteresting(why)) return why;

  if (company.description?.trim()) return firstSentence(company.description);

  const towerBrookSource = company.sources?.find((source) =>
    `${source.title} ${source.url}`.toLowerCase().includes("towerbrook"),
  );
  if (towerBrookSource?.title) return firstSentence(towerBrookSource.title);

  return `${company.name} · ${COMPANY_CATEGORY_LABEL[company.category]}`;
}
