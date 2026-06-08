import Link from "next/link";
import type { ReportModel, ReportSection, ReportSource } from "@/lib/report";
import { WorkspaceActionButton } from "@/app/components/InvestorWorkspaceTray";
import ReportExportControls from "./ReportExportControls";
import LiveReportEnhance from "./LiveReportEnhance";
import MarketMapSection from "./MarketMapSection";
import MemoBasketPanel from "./MemoBasketPanel";
import { DataPageHeader, PageShell } from "@/app/components/ui";

interface FocusContext {
  kind: "expert" | "company";
  name: string;
  href: string;
  detail: string;
}

export default function ReportWorkspace({
  report,
  focusContext,
  themeId = "all",
}: {
  report: ReportModel;
  focusContext?: FocusContext;
  themeId?: string;
}) {
  return (
    <PageShell>
        <DataPageHeader
          title={report.reportName}
          meta={`Drafted ${report.generatedAt} · ${report.stats.sources} sources · ${report.stats.experts} experts · ${report.stats.companies} companies`}
          actions={
            <div className="flex flex-col items-end gap-2">
              <ReportExportControls markdown={report.markdown} fileName={report.reportName} />
              <LiveReportEnhance themeId={themeId} fileName={report.reportName} />
            </div>
          }
        />

        {focusContext ? (
          <section className="mt-5 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="ee-label text-blue-700">
                  Selected {focusContext.kind === "expert" ? "expert" : "company"} for this memo
                </div>
                <Link href={focusContext.href} className="mt-1 inline-flex text-[15px] font-semibold text-blue-800 hover:underline">
                  {focusContext.name}
                </Link>
                <p className="mt-1 max-w-4xl text-[12px] leading-relaxed text-blue-900">
                  {focusContext.detail}
                </p>
              </div>
              <WorkspaceActionButton
                item={{
                  id: `${focusContext.kind}:${focusContext.name}`,
                  kind: "memo",
                  name: focusContext.name,
                  sub: focusContext.detail,
                  href: focusContext.href,
                  status: "selected for memo",
                }}
                className="ee-button ee-button-secondary shrink-0"
              >
                Add to memo basket
              </WorkspaceActionButton>
            </div>
          </section>
        ) : null}

        <section className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_340px]">
          <main className="space-y-3">
            {report.sections.map((section) => (
              <ReportSectionCard
                key={section.id}
                section={section}
                sources={report.sources}
              />
            ))}
          </main>

          <aside className="space-y-3 xl:sticky xl:top-20 xl:self-start">
            <MemoBasketPanel themeLabel={report.reportName.replace(/^Theme memo — /, "")} />

            <section className="ee-panel rounded-lg p-3">
              <div className="ee-label text-ink">Review before circulation</div>
              <ul className="mt-2 space-y-1.5 text-[11px] leading-snug text-ink-soft">
                <li>Confirm every material claim has a source that supports that exact claim.</li>
                <li>Validate ownership, scale, and recent activity directly with named experts.</li>
                <li>Separate graph coverage from a complete market census.</li>
                <li>Record disconfirming evidence and unresolved diligence gaps.</li>
              </ul>
            </section>

            <section className="ee-panel rounded-lg p-3">
              <div className="ee-label text-ink">Use this memo</div>
              <div className="mt-2 space-y-2">
                <Link href={report.themeHref} className="ee-button ee-button-secondary w-full">
                  Open Command Centre
                </Link>
                <Link href="/experts" className="ee-button ee-button-secondary w-full">
                  Prepare expert calls
                </Link>
                <Link href="/companies" className="ee-button ee-button-secondary w-full">
                  Prioritize targets
                </Link>
                <Link href="/discover" className="ee-button ee-button-primary w-full">
                  Fill evidence gaps
                </Link>
              </div>
            </section>

            <section className="ee-panel rounded-lg p-3">
              <div className="ee-label text-ink">Evidence coverage</div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <EvidenceMetric label="Sources" value={report.stats.sources} />
                <EvidenceMetric label="High confidence" value={report.stats.highConfidenceSources} />
                <EvidenceMetric label="Experts" value={report.stats.experts} />
                <EvidenceMetric label="Companies" value={report.stats.companies} />
              </div>
            </section>
          </aside>
        </section>

        <SourceRegister sources={report.sources} />
    </PageShell>
  );
}

function ReportSectionCard({
  section,
  sources,
}: {
  section: ReportSection;
  sources: ReportSource[];
}) {
  const citedSources = uniqueRefs(section.citations)
    .map((id) => sources.find((source) => source.id === id))
    .filter((source): source is ReportSource => Boolean(source));

  return (
    <article className="ee-panel overflow-hidden rounded-lg">
      <div className="flex flex-col gap-3 border-b border-line px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="ee-label text-ink-faint">Section {section.order}</div>
          <h2 className="mt-1 text-[17px] font-semibold text-ink">{section.title}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge status={section.status} />
          <span className="rounded-md border border-line bg-paper px-2 py-1 text-[10px] font-semibold text-ink-soft">
            {Math.round(section.confidence * 100)}% record confidence
          </span>
        </div>
      </div>

      {section.id === "market-map" ? (
        <MarketMapSection section={section} sources={sources} />
      ) : (
      <div className="p-5">
        <p className="text-[13px] leading-relaxed text-ink">{section.summary}</p>

        {section.bullets?.length ? (
          <ul className="mt-4 space-y-2 text-[12px] leading-relaxed text-ink-soft">
            {section.bullets.map((bullet) => (
              <li key={bullet} className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        ) : null}

        {section.rows?.length ? (
          <div className="mt-4 overflow-x-auto rounded-md border border-line">
            <table className="ee-table min-w-[760px]">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Signal</th>
                  <th>Evidence / implication</th>
                  <th>Metric</th>
                </tr>
              </thead>
              <tbody>
                {section.rows.map((row) => (
                  <tr key={`${section.id}-${row.label}`}>
                    <td className="font-semibold text-accent">{row.label}</td>
                    <td className="text-[11px] text-ink-soft">{row.value}</td>
                    <td className="max-w-[420px] text-[11px] leading-relaxed text-ink-soft">
                      {row.detail}
                    </td>
                    <td className="whitespace-nowrap text-[11px] font-semibold text-ink">
                      {row.metric ?? "Review"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        <div className="mt-4 border-t border-line pt-3">
          <div className="ee-label text-ink-faint">Cited evidence</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {citedSources.length ? citedSources.map((source) => (
              <a
                key={source.id}
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="rounded-md border border-line bg-paper px-2 py-1 text-[11px] font-semibold text-accent hover:border-line-strong"
                title={source.title}
              >
                [{source.ref}] {source.publisher}
              </a>
            )) : (
              <span className="text-[11px] text-danger">No section-level evidence linked.</span>
            )}
          </div>
        </div>
      </div>
      )}
    </article>
  );
}

function StatusBadge({ status }: { status: ReportSection["status"] }) {
  const style =
    status === "Needs source confirmation"
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : status === "Ready for analyst review"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-blue-200 bg-blue-50 text-blue-700";
  return <span className={`rounded-md border px-2 py-1 text-[10px] font-semibold ${style}`}>{status}</span>;
}

function EvidenceMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-line bg-paper p-3">
      <div className="text-[20px] font-semibold tabular-nums">{value}</div>
      <div className="mt-1 text-[10px] text-ink-faint">{label}</div>
    </div>
  );
}

function SourceRegister({ sources }: { sources: ReportSource[] }) {
  return (
    <section className="ee-panel mt-5 overflow-hidden rounded-lg">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <h2 className="ee-label text-ink">Source register</h2>
        <span className="text-[11px] text-ink-faint">{sources.length} records</span>
      </div>
      <div className="overflow-x-auto">
        <table className="ee-table min-w-[980px]">
          <thead>
            <tr>
              <th>#</th>
              <th>Source</th>
              <th>Publisher</th>
              <th>Type</th>
              <th>Entities</th>
              <th>Confidence</th>
              <th>Cited in</th>
            </tr>
          </thead>
          <tbody>
            {sources.map((source) => (
              <tr key={source.id}>
                <td className="font-semibold tabular-nums">{source.ref}</td>
                <td className="max-w-[360px]">
                  <a href={source.url} target="_blank" rel="noreferrer" className="ee-link">
                    {source.title}
                  </a>
                </td>
                <td>{source.publisher}</td>
                <td>{source.type}</td>
                <td className="max-w-[260px] text-[11px] text-ink-soft">
                  {source.entities.slice(0, 3).join(", ")}
                </td>
                <td>{Math.round(source.confidence * 100)}%</td>
                <td className="max-w-[260px] text-[11px] text-ink-soft">
                  {source.citedIn.join(", ") || "Register only"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function uniqueRefs(ids: string[]): string[] {
  return [...new Set(ids)];
}
