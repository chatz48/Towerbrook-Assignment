import { dedupeCompanyLinks, getCompanies, getExperts } from "@/lib/data";
import { buildCompanyCanonicalMap, canonicalCompanyId } from "@/lib/graph-normalize";
import { rankExperts } from "@/lib/score";
import { specialtiesForTheme, THEME_BY_ID } from "@/lib/themes";
import { isThemeFocus, matchesThemeFocus, type ThemeFocus } from "@/lib/theme-focus";
import { getPageScope } from "@/lib/page-scope";
import { filterTowerBrookEmployees } from "@/lib/employee-scope";
import ExpertFilters, { EXPERT_FILTER_TYPES } from "./ExpertFilters";
import { expertReadiness, matchesActionableReadiness } from "@/lib/investment-readiness";
import { callObjective, expertRoleDisplay } from "@/lib/expert-copy";
import { outreachStorageKey } from "@/lib/outreach-plan";
import ExpertCallList from "./ExpertCallList";
import ExpertFilterChips from "./ExpertFilterChips";
import { DataPageHeader, PageShell } from "@/app/components/ui";
import type { ExpertsFilterParams } from "@/lib/experts-url";
import { singleParam } from "@/lib/url-params";

function expertSpecialty(specialties?: string[]) {
  if (!specialties?.length) return "—";
  return specialties.slice(0, 2).join(" · ");
}

export default async function ExpertsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { themeFocus, includeTowerBrookEmployees } = await getPageScope();
  const params: Record<string, string | string[] | undefined> = (await searchParams) ?? {};
  const selectedTheme = singleParam(params.theme);
  const rawSelectedType = singleParam(params.type) ?? "all";
  const selectedType =
    rawSelectedType === "all" ||
    EXPERT_FILTER_TYPES.includes(rawSelectedType as (typeof EXPERT_FILTER_TYPES)[number])
      ? rawSelectedType
      : "all";
  const selectedReadiness = singleParam(params.readiness) ?? "all";
  const query = (singleParam(params.q) ?? "").trim().toLowerCase();
  const activeTheme: ThemeFocus = isThemeFocus(selectedTheme) ? selectedTheme : themeFocus;
  const pinnedExpertIds = (singleParam(params.experts) ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  const pinnedSet = new Set(pinnedExpertIds);
  const specialties = specialtiesForTheme(activeTheme);
  const rawSelectedSpecialty = singleParam(params.specialty) ?? "all";
  const selectedSpecialty =
    rawSelectedSpecialty === "all" || specialties.includes(rawSelectedSpecialty)
      ? rawSelectedSpecialty
      : "all";

  const companies = getCompanies();
  const canonicalMap = buildCompanyCanonicalMap(companies);
  const companyNames = Object.fromEntries(companies.map((company) => [company.id, company.name]));
  const companiesById = new Map(companies.map((company) => [company.id, company]));

  function companyLabel(companyId: string) {
    const canonicalId = canonicalCompanyId(companyId, canonicalMap);
    return companiesById.get(canonicalId)?.name ?? companyNames[canonicalId] ?? companyId;
  }
  const scopedExperts = filterTowerBrookEmployees(
    getExperts().filter((expert) => matchesThemeFocus(expert.themes, activeTheme)),
    includeTowerBrookEmployees,
  );
  const filteredExperts = scopedExperts
    .filter((expert) => selectedType === "all" || expert.type === selectedType)
    .filter((expert) => selectedSpecialty === "all" || expert.specialties?.includes(selectedSpecialty))
    .filter((expert) => {
      const readiness = expertReadiness(expert);
      if (selectedReadiness === "all") return true;
      if (selectedReadiness === "actionable") return matchesActionableReadiness("expert", readiness.level);
      return readiness.level === selectedReadiness;
    })
    .filter((expert) => {
      if (!query) return true;
      return [
        expert.name,
        expert.headline,
        expert.org ?? "",
        expert.location ?? "",
        expert.whyRelevant,
        expert.specialties?.join(" ") ?? "",
        dedupeCompanyLinks(expert)
          .map((link) => companyLabel(link.companyId))
          .join(" "),
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  const ranked = rankExperts(filteredExperts).sort((a, b) => {
    const aPinned = pinnedSet.has(a.expert.id) ? 1 : 0;
    const bPinned = pinnedSet.has(b.expert.id) ? 1 : 0;
    return bPinned - aPinned || b.score.total - a.score.total;
  });
  const themeLabel = activeTheme === "all" ? "All themes" : THEME_BY_ID[activeTheme]?.name ?? "Selected theme";
  const callReadyCount = ranked.filter(({ expert }) => {
    const readiness = expertReadiness(expert);
    return readiness.level === "call-ready" || readiness.level === "verify-contact";
  }).length;
  const storageKey = outreachStorageKey(activeTheme, includeTowerBrookEmployees);
  const filterParams: ExpertsFilterParams = {
    theme: isThemeFocus(selectedTheme) ? selectedTheme : undefined,
    specialty: selectedSpecialty !== "all" ? selectedSpecialty : undefined,
    type: selectedType !== "all" ? selectedType : undefined,
    readiness: selectedReadiness !== "all" ? selectedReadiness : undefined,
    q: singleParam(params.q),
    experts: pinnedExpertIds.length ? pinnedExpertIds.join(",") : undefined,
  };

  return (
    <PageShell className="!py-1">
      <DataPageHeader
        title="Call list"
        meta={`${ranked.length} matches · ${callReadyCount} call-ready · ${themeLabel}`}
        className="mb-2 gap-1 border-b border-line pb-2 [&_.ee-data-page-meta]:text-[12px] [&_.ee-data-page-title]:text-[18px]"
      />

      <details className="mb-2 text-[12px] text-ink-soft">
        <summary className="cursor-pointer list-none font-semibold text-accent marker:hidden">
          How we rank experts
        </summary>
        <p className="mt-1 max-w-3xl leading-relaxed">
          Relevance combines expert type, company relationship edges, recent signals, recency, and access
          quality, then scales by source confidence. Hover any score in an expanded row for the breakdown.
          Readiness is separate — it shows whether contact details and evidence are strong enough to call.
        </p>
      </details>

      <section className="ee-panel overflow-hidden rounded-lg">
        <ExpertFilters
          compact
          embedded
          initialTheme={activeTheme}
          initialSpecialty={selectedSpecialty}
          initialType={selectedType}
          initialReadiness={selectedReadiness}
          initialQuery={singleParam(params.q) ?? ""}
        />

        <ExpertFilterChips
          embedded
          params={filterParams}
          pinnedCount={pinnedExpertIds.length}
        />

        <ExpertCallList
          themeLabel={themeLabel}
          storageKey={storageKey}
          totalCount={ranked.length}
          rows={ranked.map(({ expert, score }) => {
            const primaryLink = dedupeCompanyLinks(expert)[0];
            const primaryCompanyId = primaryLink
              ? canonicalCompanyId(primaryLink.companyId, canonicalMap)
              : undefined;
            return {
              expert,
              score: score.total,
              scoreBreakdown: score,
              readiness: expertReadiness(expert),
              callObjective: callObjective(expert),
              graphHref: `/graph?focus=${encodeURIComponent(`expert:${expert.id}`)}`,
              companyHref: primaryCompanyId ? `/companies/${primaryCompanyId}` : undefined,
              currentRole: expertRoleDisplay(
                expert,
                primaryCompanyId ? companyLabel(primaryCompanyId) : undefined,
              ),
              specialty: expertSpecialty(expert.specialties),
              pinned: pinnedSet.has(expert.id),
            };
          })}
        />
      </section>
    </PageShell>
  );
}
