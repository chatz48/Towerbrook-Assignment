import Link from "next/link";
import { THEMES } from "@/lib/themes";
import {
  companiesWithLinks,
  getCompanies,
  getExperts,
  expertsForTheme,
} from "@/lib/data";
import { buildBrief } from "@/lib/brief";
import { matchesThemeFocus } from "@/lib/theme-focus";
import { getPageScope } from "@/lib/page-scope";
import { filterTowerBrookEmployees } from "@/lib/employee-scope";
import {
  isTowerBrookWorkedWithCompany,
  isTowerBrookWorkedWithExpert,
} from "@/lib/towerbrook";
import { buildReport, type ReportModel } from "@/lib/report";
import { companySummaryDetail } from "@/lib/company-copy";
import { coverageMatrix, themeGapSummary } from "@/lib/investment-readiness";
import type { ThemeId } from "@/lib/types";
import ReportExportControls from "./components/reports/ReportExportControls";
import { Badge, PageShell } from "./components/ui";

export default async function Home() {
  const { themeFocus, includeTowerBrookEmployees } = await getPageScope();
  const report = await buildReport(themeFocus, includeTowerBrookEmployees);
  const experts = filterTowerBrookEmployees(
    getExperts().filter((expert) => matchesThemeFocus(expert.themes, themeFocus)),
    includeTowerBrookEmployees,
  );
  const companies = getCompanies().filter((company) => matchesThemeFocus(company.themes, themeFocus));
  const linkedCompanies = companiesWithLinks(
    themeFocus === "all" ? undefined : themeFocus,
    includeTowerBrookEmployees,
  );
  const visibleThemes = THEMES.filter((theme) => themeFocus === "all" || theme.id === themeFocus);
  const directCompanies = linkedCompanies.filter(
    (company) => company.id !== "towerbrook" && isTowerBrookWorkedWithCompany(company),
  );
  const directExperts = experts.filter((expert) => isTowerBrookWorkedWithExpert(expert));
  const matrixRows = coverageMatrix(themeFocus, includeTowerBrookEmployees);
  const gapCount = matrixRows.filter((row) => row.gapSeverity !== "low").length;
  const currentThemeLabel =
    themeFocus === "all"
      ? "All three themes"
      : visibleThemes[0]?.name ?? "Selected theme";
  const themeQuery = themeFocus === "all" ? "" : `?theme=${themeFocus}`;

  return (
    <PageShell>
      <header className="mb-4 flex flex-col gap-3 border-b border-line pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="ee-data-page-title text-ink">{currentThemeLabel}</h1>
          <p className="ee-data-page-meta mt-1">This week&apos;s investment decisions</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/experts${themeQuery}`} className="ee-button ee-button-primary">
            Open call list
          </Link>
          <Link href="/reports" className="ee-button ee-button-secondary">
            {gapCount > 0 ? "Continue memo" : "Preview memo"}
          </Link>
        </div>
      </header>

      <section className="ee-panel overflow-hidden rounded-lg">
        {visibleThemes.length === 1 ? (
          <SingleThemeDecisions
            theme={visibleThemes[0]!}
            includeTowerBrookEmployees={includeTowerBrookEmployees}
          />
        ) : (
          <div className="grid gap-0 divide-y divide-line lg:grid-cols-3 lg:grid-rows-[repeat(6,auto)] lg:divide-y-0">
            {visibleThemes.map((theme) => {
              const brief = buildBrief(theme.id, includeTowerBrookEmployees);
              const themeCompanies = companiesWithLinks(theme.id, includeTowerBrookEmployees);
              const firstCall = brief.callList[0];
              const leadTarget =
                themeCompanies.find(
                  (company) =>
                    company.category === "target" &&
                    company.ownershipStatus === "independent",
                ) ?? themeCompanies[0];
              const gap = themeGapSummary(theme.id, expertsForTheme(theme.id))[0];

              return (
                <article
                  key={theme.id}
                  className="grid grid-rows-subgrid overflow-hidden max-lg:divide-y max-lg:divide-line lg:row-span-6 lg:border-r lg:border-line lg:last:border-r-0"
                >
                  <div className="border-b border-line px-4 py-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="min-h-[2.5rem] text-[14px] font-semibold leading-snug">{theme.name}</h3>
                      <Badge className="shrink-0 border-line bg-paper text-ink-soft">
                        {brief.stats.experts} experts
                      </Badge>
                    </div>
                  </div>
                  <div className="border-b border-line px-4 pb-2">
                    <div
                      className="h-[3px] w-full rounded-full"
                      style={{ backgroundColor: theme.accent }}
                      aria-hidden="true"
                    />
                  </div>
                  <DecisionRow
                    label="First call"
                    title={firstCall?.expert.name ?? "No expert mapped"}
                    body={firstCall?.whyNow ?? "Build expert coverage for this theme."}
                    href={firstCall ? `/experts/${firstCall.expert.id}` : `/experts?theme=${theme.id}`}
                    copilotPrompt={
                      firstCall
                        ? `Should I call ${firstCall.expert.name} first for ${theme.name}? Summarise why, what to validate, and which companies they unlock.`
                        : `Who should I call first for ${theme.name}? Rank experts and explain the call sequence.`
                    }
                  />
                  <DecisionRow
                    label="Lead target"
                    title={leadTarget?.name ?? "No target mapped"}
                    body={
                      leadTarget?.whyInteresting ??
                      leadTarget?.description ??
                      "Derive a company from expert evidence."
                    }
                    href={leadTarget ? `/companies/${leadTarget.id}` : `/companies?theme=${theme.id}`}
                    copilotPrompt={
                      leadTarget
                        ? `Assess ${leadTarget.name} as a diligence target in ${theme.name}. Ownership, scale, expert validation path, and risks.`
                        : `Which companies should we prioritise as targets in ${theme.name}?`
                    }
                  />
                  <DecisionRow
                    label={gap ? "Coverage gap" : "Coverage check"}
                    title={gap ?? "No taxonomy gap flagged"}
                    body={
                      gap
                        ? "No mapped expert currently covers this specialty."
                        : "Review source freshness and relationship depth."
                    }
                    href={`/discover?theme=${theme.id}${gap ? `&gap=${encodeURIComponent(gap)}` : ""}`}
                    copilotPrompt={
                      gap
                        ? `Which experts should we find to cover "${gap}" in ${theme.name}? Suggest archetypes and search angles.`
                        : `Review coverage health for ${theme.name} and flag the highest-priority gaps.`
                    }
                  />
                  <div className="flex items-center justify-between gap-3 border-t border-line bg-[#fbfcff] px-4 py-2">
                    <span className="text-[12px] text-ink-faint">
                      {brief.stats.targets} targets · {brief.stats.exits} exits
                    </span>
                    <Link href={`/experts?theme=${theme.id}&readiness=actionable`} className="text-[12px] font-semibold text-accent">
                      Call list →
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <MemoStatusStrip report={report} gapCount={gapCount} />

      <details className="ee-panel mt-3 overflow-hidden rounded-lg">
        <summary className="cursor-pointer list-none px-4 py-3 marker:hidden">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[14px] font-semibold text-ink">Coverage health</div>
              <p className="mt-0.5 text-[13px] text-ink-faint">
                {experts.length} experts · {companies.length} companies · {gapCount} archetype gaps
              </p>
            </div>
            <span className="shrink-0 text-[12px] font-semibold text-accent">Expand</span>
          </div>
        </summary>
        <div className="ee-table-wrap border-t border-line">
          <table className="ee-table" style={{ minWidth: 560 }}>
            <thead>
              <tr>
                <th>Archetype</th>
                <th>Total</th>
                <th>Verified</th>
                <th>Contactable</th>
                <th>Gap</th>
              </tr>
            </thead>
            <tbody>
              {matrixRows.map((row) => (
                <tr key={row.type}>
                  <td className="font-semibold">{row.label}</td>
                  <td className="tabular-nums">{row.total}</td>
                  <td className="tabular-nums">{row.verified}</td>
                  <td className="tabular-nums">{row.contactable}</td>
                  <td>
                    <GapPill severity={row.gapSeverity} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      <details className="ee-panel mt-3 overflow-hidden rounded-lg">
        <summary className="cursor-pointer list-none px-4 py-3 marker:hidden">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[14px] font-semibold text-ink">TowerBrook relationship paths</div>
              <p className="mt-0.5 text-[13px] text-ink-faint">
                {directCompanies.length} companies · {directExperts.length} people with public paths
              </p>
            </div>
            <span className="shrink-0 text-[12px] font-semibold text-accent">Expand</span>
          </div>
        </summary>
        <div className="flex justify-end border-t border-line bg-[#fbfcff] px-4 py-2">
          <Link href="/graph" className="text-[12px] font-semibold text-accent">
            Open relationship graph →
          </Link>
        </div>
        <div className="grid border-t border-line lg:grid-cols-2">
          <RelationshipList
            title="Companies"
            items={directCompanies.slice(0, 8).map((company) => ({
              name: company.name,
              detail: companySummaryDetail(company),
              href: `/companies/${company.id}`,
            }))}
          />
          <RelationshipList
            title="People"
            items={directExperts.slice(0, 8).map((expert) => ({
              name: expert.name,
              detail: expert.headline,
              href: `/experts/${expert.id}`,
            }))}
          />
        </div>
      </details>
    </PageShell>
  );
}

function SingleThemeDecisions({
  theme,
  includeTowerBrookEmployees,
}: {
  theme: { id: ThemeId; name: string; accent: string };
  includeTowerBrookEmployees: boolean;
}) {
  const brief = buildBrief(theme.id, includeTowerBrookEmployees);
  const themeCompanies = companiesWithLinks(theme.id, includeTowerBrookEmployees);
  const firstCall = brief.callList[0];
  const leadTarget =
    themeCompanies.find(
      (company) =>
        company.category === "target" && company.ownershipStatus === "independent",
    ) ?? themeCompanies[0];
  const gap = themeGapSummary(theme.id, expertsForTheme(theme.id))[0];

  return (
    <div className="divide-y divide-line">
      <DecisionRow
        label="First call"
        title={firstCall?.expert.name ?? "No expert mapped"}
        body={firstCall?.whyNow ?? "Build expert coverage for this theme."}
        href={firstCall ? `/experts/${firstCall.expert.id}` : `/experts?theme=${theme.id}`}
        copilotPrompt={
          firstCall
            ? `Should I call ${firstCall.expert.name} first for ${theme.name}? Summarise why, what to validate, and which companies they unlock.`
            : `Who should I call first for ${theme.name}? Rank experts and explain the call sequence.`
        }
      />
      <DecisionRow
        label="Lead target"
        title={leadTarget?.name ?? "No target mapped"}
        body={
          leadTarget?.whyInteresting ??
          leadTarget?.description ??
          "Derive a company from expert evidence."
        }
        href={leadTarget ? `/companies/${leadTarget.id}` : `/companies?theme=${theme.id}`}
        copilotPrompt={
          leadTarget
            ? `Assess ${leadTarget.name} as a diligence target in ${theme.name}. Ownership, scale, expert validation path, and risks.`
            : `Which companies should we prioritise as targets in ${theme.name}?`
        }
      />
      <DecisionRow
        label={gap ? "Coverage gap" : "Coverage check"}
        title={gap ?? "No taxonomy gap flagged"}
        body={
          gap
            ? "No mapped expert currently covers this specialty."
            : "Review source freshness and relationship depth."
        }
        href={`/discover?theme=${theme.id}${gap ? `&gap=${encodeURIComponent(gap)}` : ""}`}
        copilotPrompt={
          gap
            ? `Which experts should we find to cover "${gap}" in ${theme.name}? Suggest archetypes and search angles.`
            : `Review coverage health for ${theme.name} and flag the highest-priority gaps.`
        }
      />
    </div>
  );
}

function MemoStatusStrip({
  report,
  gapCount,
}: {
  report: ReportModel;
  gapCount: number;
}) {
  const needsEvidence = report.sections.filter(
    (section) => section.status === "Needs source confirmation",
  ).length;
  const totalGaps = gapCount + needsEvidence;

  return (
    <section id="theme-memo" className="ee-panel mt-3 rounded-lg px-4 py-3 scroll-mt-28">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-[14px] font-semibold text-ink">Theme memo</div>
          <p className="mt-0.5 text-[13px] text-ink-faint">
            {report.sections.length} sections · {report.stats.experts} experts ·{" "}
            {totalGaps > 0 ? (
              <span className="font-semibold text-amber-700">{totalGaps} gaps to resolve</span>
            ) : (
              "IC pack ready"
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/reports" className="ee-button ee-button-primary">
            Open memo
          </Link>
          <ReportExportControls markdown={report.markdown} fileName={report.reportName} />
        </div>
      </div>
    </section>
  );
}

function DecisionRow({
  label,
  title,
  body,
  href,
  copilotPrompt,
}: {
  label: string;
  title: string;
  body: string;
  href: string;
  copilotPrompt?: string;
}) {
  return (
    <div className="border-b border-line px-4 py-3 hover:bg-[#fbfcff]">
      <Link href={href} className="block">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="ee-label text-ink-faint">{label}</span>
          <span className="text-[14px] font-semibold text-ink">{title}</span>
        </div>
        <p className="mt-0.5 line-clamp-2 min-h-[2.5rem] text-[13px] leading-snug text-ink-soft">{body}</p>
      </Link>
      {copilotPrompt ? (
        <Link
          href={`/ask?prompt=${encodeURIComponent(copilotPrompt)}`}
          className="mt-1.5 inline-flex text-[11px] font-semibold text-accent hover:underline"
        >
          Ask Copilot →
        </Link>
      ) : null}
    </div>
  );
}

function RelationshipList({
  title,
  items,
}: {
  title: string;
  items: { name: string; detail: string; href: string }[];
}) {
  return (
    <div className="border-b border-line last:border-b-0 lg:border-b-0 lg:odd:border-r">
      <div className="border-b border-line px-4 py-2 text-[12px] font-semibold uppercase tracking-wide text-ink-faint">
        {title}
      </div>
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="block border-b border-line px-4 py-2.5 last:border-b-0 hover:bg-[#fbfcff]"
        >
          <div className="text-[13px] font-semibold text-ink">{item.name}</div>
          <p className="mt-0.5 line-clamp-1 text-[12px] text-ink-soft">{item.detail}</p>
        </Link>
      ))}
    </div>
  );
}

function GapPill({ severity }: { severity: "low" | "medium" | "high" }) {
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
        severity === "high"
          ? "border-red-200 bg-red-50 text-red-700"
          : severity === "medium"
            ? "border-amber-200 bg-amber-50 text-amber-700"
            : "border-emerald-200 bg-emerald-50 text-emerald-700"
      }`}
    >
      {severity}
    </span>
  );
}
