"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import type { ScoreBreakdown } from "@/lib/score";
import { RELEVANCE_SCORE_FOOTNOTE, relevanceScoreLines } from "@/lib/score-copy";
import type { Expert } from "@/lib/types";
import ScoreHelp from "@/app/components/ScoreHelp";
import { DataTable } from "@/app/components/ui";
import { EXPERT_TYPE_LABEL, EXPERT_TYPE_STYLE } from "@/lib/labels";
import { callPhase, formatExpertRoleLine, type ExpertRoleDisplay } from "@/lib/expert-copy";
import type { ReadinessBadgeModel } from "@/lib/investment-readiness";
import ReadinessBadge from "@/app/components/ReadinessBadge";
import {
  ExpandChevron,
  ExpandedRowPanel,
  rowExpandClass,
} from "@/app/components/table/ExpandableTableRow";
import {
  bestWarmPathForExpert,
  warmPathStatusLabel,
  warmPathTone,
} from "@/lib/warm-paths";
import {
  buildExpertCallListCsv,
  buildExpertCallListExportRows,
  buildExpertCallListMeetingPack,
} from "@/lib/expert-call-list-export";
import {
  DEFAULT_OUTREACH_STATE,
  effectiveCallObjective,
  OUTREACH_OWNERS,
  OUTREACH_STATUSES,
  outreachItemKey,
  outreachRowState,
  outreachStats,
  readOutreachState,
  subscribeOutreach,
  type OutreachPlanState,
  writeOutreachState,
} from "@/lib/outreach-plan";
import {
  pulseWorkspaceBasket,
  removeWorkspaceItem,
  toggleWorkspaceItem,
  updateWorkspaceItem,
  useWorkspaceItems,
} from "@/lib/workspace";

const PAGE_SIZE = 36;
const COL_SPAN = 7;

export interface RankedExpertRow {
  expert: Expert;
  score: number;
  scoreBreakdown: ScoreBreakdown;
  readiness: ReadinessBadgeModel;
  callObjective: string;
  graphHref: string;
  companyHref?: string;
  currentRole: ExpertRoleDisplay;
  specialty: string;
  pinned?: boolean;
}

function basketPrompt(names: string[]) {
  return encodeURIComponent(
    names.length
      ? `Draft an investment memo and call plan using these experts: ${names.join(", ")}. Summarise what each person unlocks, recommended call order, and evidence gaps.`
      : "",
  );
}

function stopRowExpand(event: { stopPropagation: () => void }) {
  event.stopPropagation();
}

export default function ExpertCallList({
  rows,
  themeLabel,
  storageKey,
  totalCount,
}: {
  rows: RankedExpertRow[];
  themeLabel: string;
  storageKey: string;
  totalCount: number;
}) {
  const [planState, setPlanState] = useState<OutreachPlanState>({});
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [savedExpertId, setSavedExpertId] = useState<string | null>(null);
  const selectAllRef = useRef<HTMLInputElement>(null);
  const workspaceItems = useWorkspaceItems();

  useEffect(() => {
    const load = () => setPlanState(readOutreachState(storageKey));
    load();
    return subscribeOutreach(storageKey, load);
  }, [storageKey]);

  const visibleRows = useMemo(() => rows.slice(0, visibleCount), [rows, visibleCount]);
  const basketIds = useMemo(
    () => new Set(workspaceItems.filter((item) => item.kind === "call").map((item) => item.id)),
    [workspaceItems],
  );
  const basketNames = useMemo(
    () => workspaceItems.filter((item) => item.kind === "call").map((item) => item.name),
    [workspaceItems],
  );
  const expertIds = useMemo(() => rows.map((row) => row.expert.id), [rows]);
  const stats = useMemo(() => outreachStats(planState, expertIds), [expertIds, planState]);
  const someInBasket = visibleRows.some((row) => basketIds.has(row.expert.id));
  const allInBasket = visibleRows.length > 0 && visibleRows.every((row) => basketIds.has(row.expert.id));

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someInBasket && !allInBasket;
    }
  }, [allInBasket, someInBasket]);

  const selectedRows = useMemo(
    () => rows.filter((row) => basketIds.has(row.expert.id)),
    [basketIds, rows],
  );
  const hasSelection = selectedRows.length > 0;

  const exportRows = useMemo(
    () => buildExpertCallListExportRows(selectedRows, planState),
    [planState, selectedRows],
  );

  function updateExpert(expertId: string, patch: Partial<typeof DEFAULT_OUTREACH_STATE>) {
    setPlanState((current) => {
      const key = outreachItemKey(expertId);
      const next = {
        ...current,
        [key]: {
          ...outreachRowState(current, expertId),
          ...patch,
        },
      };
      writeOutreachState(storageKey, next);

      const row = rows.find((item) => item.expert.id === expertId);
      if (row && basketIds.has(expertId) && (patch.note !== undefined || patch.objective !== undefined)) {
        updateWorkspaceItem(
          { id: expertId, kind: "call" },
          {
            note: effectiveCallObjective(next, expertId, row.callObjective),
          },
        );
      }

      return next;
    });
  }

  function resetPlan() {
    const assigned = stats.assigned + stats.active;
    if (assigned > 0 && !window.confirm("Clear all owners, statuses, and notes on this call list?")) {
      return;
    }
    setPlanState({});
    window.localStorage.removeItem(storageKey);
  }

  function toggleExpand(expertId: string) {
    setExpandedId((current) => (current === expertId ? null : expertId));
  }

  function confirmNotesSaved(expertId: string) {
    setSavedExpertId(expertId);
    window.setTimeout(() => {
      setSavedExpertId((current) => (current === expertId ? null : current));
    }, 1800);
  }

  function toggleBasket(row: RankedExpertRow) {
    const added = toggleWorkspaceItem({
      id: row.expert.id,
      kind: "call",
      name: row.expert.name,
      sub: formatExpertRoleLine(row.currentRole),
      href: `/experts/${row.expert.id}`,
      theme: row.expert.themes[0],
      note: effectiveCallObjective(planState, row.expert.id, row.callObjective),
    });
    if (added) pulseWorkspaceBasket();
  }

  function toggleAllBasket() {
    if (allInBasket || someInBasket) {
      for (const row of visibleRows) {
        removeWorkspaceItem(row.expert.id, "call");
      }
      return;
    }
    for (const row of visibleRows) {
      if (!basketIds.has(row.expert.id)) {
        toggleWorkspaceItem({
          id: row.expert.id,
          kind: "call",
          name: row.expert.name,
          sub: formatExpertRoleLine(row.currentRole),
          href: `/experts/${row.expert.id}`,
          theme: row.expert.themes[0],
          note: effectiveCallObjective(planState, row.expert.id, row.callObjective),
        });
      }
    }
    pulseWorkspaceBasket();
  }

  async function copyMeetingPack() {
    if (!hasSelection) return;
    try {
      const text = buildExpertCallListMeetingPack(
        themeLabel,
        exportRows,
        typeof window !== "undefined" ? window.location.origin : "",
      );
      await navigator.clipboard.writeText(text);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1800);
    } catch {
      setCopyState("failed");
    }
  }

  function downloadCsv() {
    if (!hasSelection) return;
    const csv = buildExpertCallListCsv(exportRows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "towerbrook-call-list.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  if (!rows.length) {
    return (
      <div className="border-t border-line px-5 py-10 text-center">
        <h3 className="text-[15px] font-semibold text-ink">No experts match your filters</h3>
        <p className="mt-2 text-[13px] text-ink-soft">
          Try broadening your theme, specialty, or readiness selection.
        </p>
        <Link href="/experts" className="ee-button ee-button-primary mt-4 inline-flex">
          Clear all filters
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-[#fbfcff] px-3 py-1.5 text-[11px] text-ink-soft">
        <div className="flex flex-wrap gap-3">
          <span>
            Showing <strong className="text-ink">{visibleRows.length}</strong> of{" "}
            <strong className="text-ink">{totalCount}</strong>
          </span>
          <span>
            <strong className="text-ink">{stats.assigned}</strong> assigned
          </span>
          <span>
            <strong className="text-ink">{stats.active}</strong> in outreach
          </span>
          <span>
            <strong className="text-ink">{basketNames.length}</strong> in basket
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={copyMeetingPack}
            disabled={!hasSelection}
            title={hasSelection ? undefined : "Select experts using the checkboxes"}
            className="ee-button ee-button-secondary min-h-7 px-2.5 text-[11px] disabled:cursor-not-allowed disabled:opacity-45"
          >
            {copyState === "copied" ? "Copied" : copyState === "failed" ? "Copy failed" : "Copy"}
          </button>
          <button
            type="button"
            onClick={downloadCsv}
            disabled={!hasSelection}
            title={hasSelection ? undefined : "Select experts using the checkboxes"}
            className="ee-button ee-button-secondary min-h-7 px-2.5 text-[11px] disabled:cursor-not-allowed disabled:opacity-45"
          >
            CSV
          </button>
          <button type="button" onClick={resetPlan} className="ee-button ee-button-secondary min-h-7 px-2.5 text-[11px]">
            Reset
          </button>
        </div>
      </div>

      {basketNames.length ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-line bg-[#edf5ff] px-3 py-1.5">
          <span className="text-[11px] font-semibold text-ink">{basketNames.length} in basket</span>
          <Link href={`/ask?prompt=${basketPrompt(basketNames)}`} className="ee-button ee-button-primary min-h-7 px-2.5 text-[11px]">
            Ask Copilot
          </Link>
          <Link href="/reports" className="ee-button ee-button-secondary min-h-7 px-2.5 text-[11px]">
            Draft memo
          </Link>
        </div>
      ) : null}

      <DataTable minWidth={1040} dense>
        <caption className="sr-only">
          Click a row to expand notes, call objective, readiness, score, and warm intro path.
        </caption>
        <thead>
          <tr>
            <th className="min-w-[180px]">Name</th>
            <th className="w-[118px]">Type</th>
            <th className="min-w-[220px]">Current role</th>
            <th className="min-w-[160px]">Speciality</th>
            <th className="w-[120px]">Assigned</th>
            <th className="w-[130px]">Status</th>
            <th className="w-[72px] text-center">
              <span className="sr-only">Add to basket</span>
              <input
                ref={selectAllRef}
                type="checkbox"
                checked={allInBasket}
                onChange={toggleAllBasket}
                onClick={stopRowExpand}
                aria-label={allInBasket || someInBasket ? "Deselect all visible experts" : "Select all visible experts"}
                className="h-3.5 w-3.5"
              />
            </th>
          </tr>
        </thead>
        <tbody>
          {visibleRows.map((row) => {
            const current = outreachRowState(planState, row.expert.id);
            const inBasket = basketIds.has(row.expert.id);
            const expanded = expandedId === row.expert.id;
            const warmPath = bestWarmPathForExpert(row.expert.id);
            const objectiveValue = current.objective || row.callObjective;

            return (
              <Fragment key={row.expert.id}>
                <tr
                  className={rowExpandClass(expanded, row.pinned)}
                  onClick={() => toggleExpand(row.expert.id)}
                  aria-expanded={expanded}
                >
                  <td>
                    <div className="flex items-center gap-1.5">
                      <ExpandChevron expanded={expanded} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/experts/${row.expert.id}`}
                            className="font-semibold text-ink hover:text-accent"
                            onClick={stopRowExpand}
                          >
                            {row.expert.name}
                          </Link>
                          {row.pinned ? (
                            <span className="rounded border border-accent/20 bg-[#eef5ff] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-accent">
                              Pin
                            </span>
                          ) : null}
                        </div>
                        <Link
                          href={row.graphHref}
                          className="mt-0.5 inline-block text-[10px] font-medium text-accent hover:underline"
                          onClick={stopRowExpand}
                        >
                          Relationships
                        </Link>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`ee-type-pill ${EXPERT_TYPE_STYLE[row.expert.type]}`}>
                      {EXPERT_TYPE_LABEL[row.expert.type]}
                    </span>
                  </td>
                  <td>
                    {row.currentRole.company ? (
                      <>
                        {row.companyHref ? (
                          <Link
                            href={row.companyHref}
                            className="font-semibold text-ink hover:text-accent"
                            onClick={stopRowExpand}
                          >
                            {row.currentRole.company}
                          </Link>
                        ) : (
                          <span className="font-semibold text-ink">{row.currentRole.company}</span>
                        )}
                        {row.currentRole.role ? (
                          <span className="text-ink-soft"> {row.currentRole.role}</span>
                        ) : null}
                      </>
                    ) : (
                      <span className="text-ink-soft">{row.currentRole.role}</span>
                    )}
                  </td>
                  <td className="text-ink-soft">{row.specialty}</td>
                  <td onClick={stopRowExpand}>
                    <select
                      value={current.owner}
                      onChange={(event) => updateExpert(row.expert.id, { owner: event.target.value })}
                      aria-label={`Assign owner for ${row.expert.name}`}
                      className="ee-cell-input"
                    >
                      {OUTREACH_OWNERS.map((owner) => (
                        <option key={owner} value={owner}>
                          {owner}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td onClick={stopRowExpand}>
                    <select
                      value={current.status}
                      onChange={(event) => updateExpert(row.expert.id, { status: event.target.value })}
                      aria-label={`Status for ${row.expert.name}`}
                      className="ee-cell-input"
                    >
                      {OUTREACH_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="text-center" onClick={stopRowExpand}>
                    <input
                      type="checkbox"
                      checked={inBasket}
                      onChange={() => toggleBasket(row)}
                      aria-label={`Add ${row.expert.name} to basket`}
                      className="h-3.5 w-3.5"
                    />
                  </td>
                </tr>
                {expanded ? (
                  <ExpandedRowPanel colSpan={COL_SPAN}>
                      <div onClick={stopRowExpand}>
                        <div className="flex flex-wrap items-center gap-2">
                          <ReadinessBadge badge={row.readiness} compact />
                          <span className="ee-type-pill border-line bg-paper text-ink-soft">
                            {callPhase(row.expert)}
                          </span>
                          <ScoreHelp
                            title="Relevance score"
                            display={`Score ${row.score}`}
                            lines={relevanceScoreLines(row.scoreBreakdown)}
                            footnote={RELEVANCE_SCORE_FOOTNOTE}
                            compact
                          />
                          {warmPath ? (
                            <span
                              className={`ee-type-pill ${warmPathTone(warmPath.status)}`}
                              title={warmPath.intro_route}
                            >
                              {warmPathStatusLabel(warmPath.status)}
                            </span>
                          ) : (
                            <span className="text-[10px] text-ink-faint">No warm intro path</span>
                          )}
                        </div>
                        {warmPath ? (
                          <p className="mt-1.5 line-clamp-2 text-[11px] leading-snug text-ink-soft">
                            {warmPath.recommended_intro}
                          </p>
                        ) : null}
                        <div className="mt-3 rounded-lg border border-line bg-white p-3 shadow-sm">
                          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <h4 className="text-[12px] font-semibold text-ink">Call prep notes</h4>
                              <p className="mt-0.5 text-[11px] text-ink-faint">
                                Objective and outreach notes are saved to this call list.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                updateExpert(row.expert.id, {
                                  objective: objectiveValue,
                                  note: current.note,
                                });
                                confirmNotesSaved(row.expert.id);
                              }}
                              className="ee-button ee-button-primary min-h-7 px-3 text-[11px]"
                            >
                              {savedExpertId === row.expert.id ? "Saved" : "Save notes"}
                            </button>
                          </div>
                          <div className="grid gap-3 md:grid-cols-2">
                            <label className="block">
                              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-ink-faint">
                                Call objective
                              </span>
                              <textarea
                                value={objectiveValue}
                                onChange={(event) =>
                                  updateExpert(row.expert.id, { objective: event.target.value })
                                }
                                rows={3}
                                aria-label={`Call objective for ${row.expert.name}`}
                                className="min-h-24 w-full resize-y rounded-md border border-line-strong bg-[#fbfcff] px-3 py-2 text-[12px] leading-relaxed text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-accent focus:bg-white focus:ring-2 focus:ring-accent/10"
                              />
                            </label>
                            <label className="block">
                              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-ink-faint">
                                Notes
                              </span>
                              <textarea
                                value={current.note}
                                onChange={(event) => updateExpert(row.expert.id, { note: event.target.value })}
                                placeholder="Outreach notes, intro path, scheduling…"
                                rows={3}
                                aria-label={`Notes for ${row.expert.name}`}
                                className="min-h-24 w-full resize-y rounded-md border border-line-strong bg-[#fbfcff] px-3 py-2 text-[12px] leading-relaxed text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-accent focus:bg-white focus:ring-2 focus:ring-accent/10"
                              />
                            </label>
                          </div>
                        </div>
                      </div>
                  </ExpandedRowPanel>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </DataTable>

      {visibleCount < rows.length ? (
        <div className="border-t border-line px-3 py-2 text-center">
          <button
            type="button"
            onClick={() => setVisibleCount((count) => Math.min(count + PAGE_SIZE, rows.length))}
            className="ee-button ee-button-secondary min-h-8 px-4 text-[12px]"
          >
            Show more ({rows.length - visibleCount} remaining)
          </button>
        </div>
      ) : null}
    </>
  );
}
