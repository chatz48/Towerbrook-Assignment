import ReportWorkspace from "@/app/components/reports/ReportWorkspace";
import { getCompany, getExpert } from "@/lib/data";
import { buildReport } from "@/lib/report";
import { getPageScope } from "@/lib/page-scope";
import { singleParam } from "@/lib/url-params";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { themeFocus, includeTowerBrookEmployees } = await getPageScope();
  const params = (await searchParams) ?? {};
  const expertId = singleParam(params.expert);
  const companyId = singleParam(params.company);
  const expert = expertId ? getExpert(expertId) : undefined;
  const company = companyId ? getCompany(companyId) : undefined;
  const report = await buildReport(themeFocus, includeTowerBrookEmployees);

  return (
    <ReportWorkspace
      key={`${themeFocus}:${includeTowerBrookEmployees}`}
      report={report}
      themeId={themeFocus}
      focusContext={
        expert
          ? {
              kind: "expert",
              name: expert.name,
              href: `/experts/${expert.id}`,
              detail: expert.whyRelevant,
            }
          : company
            ? {
                kind: "company",
                name: company.name,
                href: `/companies/${company.id}`,
                detail: company.whyInteresting ?? company.description,
              }
            : undefined
      }
    />
  );
}
