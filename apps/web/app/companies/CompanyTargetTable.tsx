"use client";

import Link from "next/link";
import { Fragment, useState } from "react";
import type { CompanyWithLinks } from "@/lib/types";
import ReadinessBadge from "@/app/components/ReadinessBadge";
import { DataTable } from "@/app/components/ui";
import { WorkspaceActionButton, WorkspaceSavedBadge } from "@/app/components/InvestorWorkspaceTray";
import RelationshipGraphPanel from "@/app/components/table/RelationshipGraphPanel";
import {
  ExpandChevron,
  ExpandedRowPanel,
  rowExpandClass,
} from "@/app/components/table/ExpandableTableRow";
import type { EntityGraphModel } from "@/lib/entity-graph";
import ScoreHelp from "@/app/components/ScoreHelp";
import { companyReadiness, targetScorecard } from "@/lib/investment-readiness";
import { askHref } from "@/lib/links";
import { TARGET_SCORE_FOOTNOTE, targetScorecardLines } from "@/lib/target-score-copy";

const COL_SPAN = 7;

export interface TargetCompanyRow {
  company: CompanyWithLinks;
  graph: EntityGraphModel;
}

export default function CompanyTargetTable({
  rows,
  themeLabel,
}: {
  rows: TargetCompanyRow[];
  themeLabel: string;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function toggleExpand(id: string) {
    setExpandedId((current) => (current === id ? null : id));
  }

  if (!rows.length) {
    return (
      <div className="px-4 py-8 text-center">
        <div className="text-[13px] font-semibold text-ink">No actionable targets in this filtered scope.</div>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
          Broaden the company filters or open coverage gaps to validate derived companies.
        </p>
        <div className="mt-3 flex justify-center gap-2">
          <Link href="/companies" className="ee-button ee-button-secondary min-h-8 px-3">
            Clear filters
          </Link>
          <Link href="/discover" className="ee-button ee-button-primary min-h-8 px-3">
            Coverage gaps
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <p className="border-b border-line px-4 py-2 text-[12px] text-ink-faint">
        Click a row for diligence context and relationship graph. Use actions for quick navigation.
      </p>
      <div className="hidden lg:block">
        <DataTable minWidth={1040}>
          <thead>
            <tr>
              <th>Company</th>
              <th>Why investigate</th>
              <th>Named experts</th>
              <th>Readiness</th>
              <th>Score</th>
              <th>Action</th>
              <th className="w-10" aria-label="Expand" />
            </tr>
          </thead>
          <tbody>
            {rows.map(({ company, graph }) => {
              const readiness = companyReadiness(company);
              const scorecard = targetScorecard(company);
              const expanded = expandedId === company.id;
              return (
                <Fragment key={company.id}>
                  <tr
                    className={rowExpandClass(expanded)}
                    onClick={() => toggleExpand(company.id)}
                    aria-expanded={expanded}
                  >
                    <td className="min-w-[200px]">
                      <Link
                        href={`/companies/${company.id}`}
                        className="font-semibold text-accent hover:underline"
                        onClick={(event) => event.stopPropagation()}
                      >
                        {company.name}
                      </Link>
                      <div className="mt-0.5 text-[12px] text-ink-soft">
                        {company.hq ?? company.sizeBand ?? "Independent target"}
                      </div>
                    </td>
                    <td className="max-w-[360px] text-[13px] leading-relaxed text-ink-soft">
                      <span className="line-clamp-2">
                        {company.whyInteresting ?? company.description}
                      </span>
                    </td>
                    <td className="max-w-[240px] text-[13px] text-ink-soft">
                      <span className="line-clamp-2">
                        {company.linkedExperts
                          .map((link) => link.expert.name)
                          .slice(0, 4)
                          .join(", ") || "No named expert"}
                      </span>
                    </td>
                    <td className="max-w-[140px]">
                      <ReadinessBadge badge={readiness} compact />
                    </td>
                    <td className="whitespace-nowrap tabular-nums" onClick={(event) => event.stopPropagation()}>
                      <ScoreHelp
                        title="Target score"
                        display={String(scorecard.total)}
                        lines={targetScorecardLines(scorecard)}
                        footnote={TARGET_SCORE_FOOTNOTE}
                        pillClassName="text-[15px] font-semibold text-ink cursor-help underline decoration-dotted decoration-ink-faint underline-offset-2"
                      />
                      <div className="mt-0.5 text-[12px] text-ink-faint">{scorecard.label}</div>
                    </td>
                    <td onClick={(event) => event.stopPropagation()}>
                      <div className="flex flex-wrap gap-1.5">
                        <Link
                          href={`/companies/${company.id}`}
                          className="ee-button ee-button-primary min-h-8 px-2.5 text-[12px]"
                        >
                          Profile
                        </Link>
                        <Link
                          href={graph.fullGraphHref}
                          className="ee-button ee-button-secondary min-h-8 px-2.5 text-[12px]"
                        >
                          Graph
                        </Link>
                        <WorkspaceActionButton
                          item={{
                            id: company.id,
                            kind: "target",
                            name: company.name,
                            sub: company.whyInteresting ?? company.description,
                            href: `/companies/${company.id}`,
                            theme: company.themes[0],
                          }}
                          className="min-h-8 px-2.5 text-[12px]"
                        >
                          Plan
                        </WorkspaceActionButton>
                      </div>
                    </td>
                    <td className="text-center">
                      <ExpandChevron expanded={expanded} />
                    </td>
                  </tr>
                  {expanded ? (
                    <ExpandedRowPanel colSpan={COL_SPAN}>
                      <CompanyRowDetail
                        company={company}
                        graph={graph}
                        readiness={readiness}
                        scorecard={scorecard}
                        themeLabel={themeLabel}
                        expanded
                      />
                    </ExpandedRowPanel>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </DataTable>
      </div>

      <div className="space-y-2 p-4 lg:hidden">
        {rows.map(({ company, graph }) => {
          const readiness = companyReadiness(company);
          const scorecard = targetScorecard(company);
          const expanded = expandedId === company.id;
          return (
            <article
              key={company.id}
              className={`overflow-hidden rounded-lg border bg-white ${
                expanded ? "border-accent ring-1 ring-accent/20" : "border-line"
              }`}
            >
              <button
                type="button"
                className="w-full p-4 text-left"
                onClick={() => toggleExpand(company.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[15px] font-semibold text-ink">{company.name}</div>
                    <p className="mt-1 line-clamp-2 text-[13px] text-ink-soft">
                      {company.whyInteresting ?? company.description}
                    </p>
                  </div>
                  <ExpandChevron expanded={expanded} />
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <ReadinessBadge badge={readiness} compact />
                  <ScoreHelp
                    title="Target score"
                    display={String(scorecard.total)}
                    lines={targetScorecardLines(scorecard)}
                    footnote={TARGET_SCORE_FOOTNOTE}
                    pillClassName="text-[13px] font-semibold tabular-nums text-ink cursor-help underline decoration-dotted decoration-ink-faint underline-offset-2"
                  />
                </div>
              </button>
              <div className="flex flex-wrap gap-2 border-t border-line px-4 py-2">
                <Link href={`/companies/${company.id}`} className="ee-button ee-button-primary min-h-8 px-3 text-[12px]">
                  Profile
                </Link>
                <Link href={graph.fullGraphHref} className="ee-button ee-button-secondary min-h-8 px-3 text-[12px]">
                  Graph
                </Link>
              </div>
              {expanded ? (
                <div className="border-t border-line bg-[#f7f9fc] p-4">
                  <CompanyRowDetail
                    company={company}
                    graph={graph}
                    readiness={readiness}
                    scorecard={scorecard}
                    themeLabel={themeLabel}
                    expanded
                  />
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </>
  );
}

function CompanyRowDetail({
  company,
  graph,
  readiness,
  scorecard,
  themeLabel,
  expanded,
}: {
  company: CompanyWithLinks;
  graph: EntityGraphModel;
  readiness: ReturnType<typeof companyReadiness>;
  scorecard: ReturnType<typeof targetScorecard>;
  themeLabel: string;
  expanded: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
            Investment angle
          </div>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">
            {company.whyInteresting ?? company.description}
          </p>
        </div>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
            Diligence signal
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-[13px] text-ink-soft">
            <ScoreHelp
              title="Target score"
              display={`Score ${scorecard.total}`}
              lines={targetScorecardLines(scorecard)}
              footnote={TARGET_SCORE_FOOTNOTE}
              compact
            />
            <span>{scorecard.label}</span>
          </p>
          <ul className="mt-2 space-y-1 text-[13px] text-ink-soft">
            {readiness.reasons.slice(0, 3).map((reason) => (
              <li key={reason}>• {reason}</li>
            ))}
          </ul>
          <p className="mt-2 text-[13px] text-ink-faint">
            {company.expertCount} expert link{company.expertCount === 1 ? "" : "s"} ·{" "}
            {company.sources.length} source{company.sources.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      {company.linkedExperts.length ? (
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
            Expert paths
          </div>
          <ul className="mt-2 space-y-1">
            {company.linkedExperts.slice(0, 6).map((link) => (
              <li key={link.expert.id} className="text-[13px]">
                <Link
                  href={`/experts/${link.expert.id}`}
                  className="font-semibold text-accent hover:underline"
                  onClick={(event) => event.stopPropagation()}
                >
                  {link.expert.name}
                </Link>
                <span className="text-ink-faint"> · {link.expert.headline}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <RelationshipGraphPanel graph={graph} active={expanded} />

      <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
        <WorkspaceSavedBadge id={company.id} kind="target" />
        <Link
          href={`/companies/${company.id}`}
          className="ee-button ee-button-primary min-h-8 px-3"
          onClick={(event) => event.stopPropagation()}
        >
          Open full profile
        </Link>
        <WorkspaceActionButton
          item={{
            id: company.id,
            kind: "target",
            name: company.name,
            sub: company.whyInteresting ?? company.description,
            href: `/companies/${company.id}`,
            theme: company.themes[0],
          }}
        >
          Add to plan
        </WorkspaceActionButton>
        <Link
          href={askHref(
            `Prepare a diligence brief for ${company.name} in ${themeLabel}. Which experts to call first and what evidence gaps remain?`,
          )}
          className="ee-button ee-button-secondary min-h-8 px-3"
          onClick={(event) => event.stopPropagation()}
        >
          Ask Copilot
        </Link>
      </div>
    </div>
  );
}
