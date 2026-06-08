import Link from "next/link";
import { companiesWithLinks } from "@/lib/data";
import { dealCoverage } from "@/lib/deal-repository";
import { getDerivedCompanyCandidates } from "@/lib/expert-discovery";
import { THEME_BY_ID } from "@/lib/themes";
import { DataPageHeader, PageShell } from "@/app/components/ui";
import CompanyTargetTable, { type TargetCompanyRow } from "./CompanyTargetTable";
import CompaniesFilterForm from "./CompaniesFilterForm";
import DerivedCandidatesSection from "./DerivedCandidatesSection";
import CompanyDirectorySection from "./CompanyDirectorySection";
import { buildGraphModel } from "@/lib/graph-model";
import { toEntityGraphModel } from "@/lib/entity-graph";
import { isThemeFocus, matchesThemeFocus, type ThemeFocus } from "@/lib/theme-focus";
import { getPageScope } from "@/lib/page-scope";
import { askHref } from "@/lib/links";
import { companyReadiness, matchesActionableReadiness } from "@/lib/investment-readiness";
import { singleParam } from "@/lib/url-params";

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { themeFocus, includeTowerBrookEmployees } = await getPageScope();
  const params: Record<string, string | string[] | undefined> = (await searchParams) ?? {};
  const selectedTheme = singleParam(params.theme);
  const activeTheme: ThemeFocus = isThemeFocus(selectedTheme) ? selectedTheme : themeFocus;
  const query = (singleParam(params.q) ?? "").trim().toLowerCase();
  const selectedCategory = singleParam(params.category) ?? "all";
  const selectedReadiness = singleParam(params.readiness) ?? "all";
  const allCompanies = companiesWithLinks(
    activeTheme === "all" ? undefined : activeTheme,
    includeTowerBrookEmployees,
  );
  const companies = allCompanies
    .filter((company) => selectedCategory === "all" || company.category === selectedCategory)
    .filter((company) => {
      const readiness = companyReadiness(company);
      if (selectedReadiness === "all") return true;
      if (selectedReadiness === "actionable") return matchesActionableReadiness("company", readiness.level);
      return readiness.level === selectedReadiness;
    })
    .filter((company) => {
      if (!query) return true;
      return [
        company.name,
        company.description,
        company.whyInteresting ?? "",
        company.owner ?? "",
        company.hq ?? "",
        company.website ?? "",
        company.specialties?.join(" ") ?? "",
        company.linkedExperts.map((link) => link.expert.name).join(" "),
      ].join(" ").toLowerCase().includes(query);
    });
  const actionableTargets = companies
    .filter(
      (company) =>
        company.category === "target" &&
        company.ownershipStatus === "independent",
    )
    .slice(0, 12);
  const graphModel = await buildGraphModel(includeTowerBrookEmployees);
  const targetRows: TargetCompanyRow[] = actionableTargets.map((company) => ({
    company,
    graph: toEntityGraphModel(graphModel, `company:${company.id}`, activeTheme),
  }));
  const derivedCandidates = getDerivedCompanyCandidates().filter((company) =>
    matchesThemeFocus(company.themes, activeTheme),
  );
  const companyById = new Map(companies.map((company) => [company.id, company]));
  const dealCounts = await dealCoverage();
  const themeLabel = activeTheme === "all" ? "All three themes" : THEME_BY_ID[activeTheme].name;
  const targetReviewPrompt = [
    `Prioritise the company validation workflow for ${themeLabel}.`,
    `Actionable targets: ${actionableTargets.slice(0, 8).map((company) => `${company.name} (${company.expertCount} expert links)`).join("; ")}`,
    `Research candidates awaiting review: ${derivedCandidates.slice(0, 8).map((company) => company.name).join("; ") || "None"}`,
    "Recommend which companies should go into the basket, which experts to call first, and what evidence gaps block a memo.",
  ].join("\n");

  return (
    <PageShell>
      <DataPageHeader
        title="Targets"
        meta={`${companies.length} companies · ${actionableTargets.length} actionable · ${themeLabel}`}
        actions={
          <>
            <Link href="/experts?readiness=actionable" className="ee-button ee-button-secondary">
              Open call list
            </Link>
            <Link href={askHref(targetReviewPrompt)} className="ee-button ee-button-secondary">
              Ask Copilot
            </Link>
          </>
        }
      />

      <CompaniesFilterForm
        activeTheme={activeTheme}
        query={singleParam(params.q) ?? ""}
        selectedCategory={selectedCategory}
        selectedReadiness={selectedReadiness}
        companiesCount={companies.length}
      />

      <details className="mb-3 text-[12px] text-ink-soft">
        <summary className="cursor-pointer list-none font-semibold text-accent marker:hidden">
          How we score targets
        </summary>
        <p className="mt-1 max-w-3xl leading-relaxed">
          Target score combines market fit, ownership status, named expert validation, source evidence,
          scale signals, and TowerBrook relationship path. Hover any score for the component breakdown.
          Readiness is separate — it flags whether ownership and scale are verified enough to diligence.
        </p>
      </details>

      <section className="ee-panel mb-5 overflow-hidden rounded-lg">
        <div className="border-b border-line px-4 py-3">
          <h2 className="text-[14px] font-semibold text-ink">Actionable targets</h2>
          <p className="mt-0.5 text-[13px] text-ink-faint">
            Independent targets with named expert links — click a row to expand.
          </p>
        </div>
        <CompanyTargetTable rows={targetRows} themeLabel={themeLabel} />
      </section>

      <DerivedCandidatesSection
        derivedCandidates={derivedCandidates}
        companyById={companyById}
        themeLabel={themeLabel}
      />

      <CompanyDirectorySection
        companies={companies}
        dealCounts={dealCounts}
        themeLabel={themeLabel}
      />
    </PageShell>
  );
}
