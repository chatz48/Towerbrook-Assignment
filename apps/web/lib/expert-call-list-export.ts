import type { ExpertRoleDisplay } from "./expert-copy";
import type { ReadinessBadgeModel } from "./investment-readiness";
import { EXPERT_TYPE_LABEL } from "./labels";
import {
  effectiveCallObjective,
  outreachRowState,
  type OutreachPlanState,
} from "./outreach-plan";
import type { Expert } from "./types";
import {
  bestWarmPathForExpert,
  warmPathStatusLabel,
} from "./warm-paths";

export interface ExpertCallListExportSourceRow {
  expert: Expert;
  score: number;
  readiness: ReadinessBadgeModel;
  callObjective: string;
  graphHref: string;
  currentRole: ExpertRoleDisplay;
  specialty: string;
  pinned?: boolean;
}

export interface ExpertCallListExportRow {
  id: string;
  name: string;
  type: string;
  company: string;
  role: string;
  specialty: string;
  readiness: string;
  readinessReasons: string;
  score: number;
  callObjective: string;
  notes: string;
  owner: string;
  status: string;
  warmPathStatus: string;
  warmPathRoute: string;
  warmPathIntro: string;
  warmPathEvidence: string;
  href: string;
  graphHref: string;
  pinned: boolean;
}

const CSV_COLUMNS: (keyof ExpertCallListExportRow)[] = [
  "name",
  "type",
  "company",
  "role",
  "specialty",
  "readiness",
  "readinessReasons",
  "score",
  "callObjective",
  "notes",
  "owner",
  "status",
  "warmPathStatus",
  "warmPathRoute",
  "warmPathIntro",
  "warmPathEvidence",
  "pinned",
  "href",
  "graphHref",
  "id",
];

function csvEscape(value: string | number | boolean) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

export function buildExpertCallListExportRows(
  rows: ExpertCallListExportSourceRow[],
  planState: OutreachPlanState,
): ExpertCallListExportRow[] {
  return rows.map((row) => {
    const current = outreachRowState(planState, row.expert.id);
    const warmPath = bestWarmPathForExpert(row.expert.id);

    return {
      id: row.expert.id,
      name: row.expert.name,
      type: EXPERT_TYPE_LABEL[row.expert.type],
      company: row.currentRole.company,
      role: row.currentRole.role,
      specialty: row.specialty,
      readiness: row.readiness.label,
      readinessReasons: row.readiness.reasons.join("; "),
      score: row.score,
      callObjective: effectiveCallObjective(planState, row.expert.id, row.callObjective),
      notes: current.note,
      owner: current.owner,
      status: current.status,
      warmPathStatus: warmPath ? warmPathStatusLabel(warmPath.status) : "No warm intro path",
      warmPathRoute: warmPath?.intro_route ?? "",
      warmPathIntro: warmPath?.recommended_intro ?? "",
      warmPathEvidence: warmPath?.evidence ?? "",
      href: `/experts/${row.expert.id}`,
      graphHref: row.graphHref,
      pinned: row.pinned ?? false,
    };
  });
}

export function buildExpertCallListCsv(exportRows: ExpertCallListExportRow[]): string {
  const lines = [
    CSV_COLUMNS.join(","),
    ...exportRows.map((row) =>
      CSV_COLUMNS.map((column) => csvEscape(row[column])).join(","),
    ),
  ];
  return lines.join("\n");
}

export function buildExpertCallListMeetingPack(
  themeLabel: string,
  exportRows: ExpertCallListExportRow[],
  baseUrl = "",
): string {
  const abs = (path: string) => (baseUrl ? `${baseUrl}${path}` : path);
  const header = [
    `TowerBrook call list — ${themeLabel}`,
    `Exported: ${new Date().toISOString().slice(0, 10)}`,
    `Experts: ${exportRows.length}`,
    "",
  ];

  const blocks = exportRows.map((row, index) =>
    [
      `--- ${index + 1}. ${row.name}${row.pinned ? " [PINNED]" : ""} ---`,
      `Type: ${row.type}`,
      `Company: ${row.company || "—"}`,
      `Role: ${row.role || "—"}`,
      `Specialty: ${row.specialty}`,
      `Readiness: ${row.readiness}`,
      row.readinessReasons ? `Readiness detail: ${row.readinessReasons}` : null,
      `Score: ${row.score}`,
      `Call objective: ${row.callObjective}`,
      `Notes: ${row.notes || "—"}`,
      `Assigned: ${row.owner}`,
      `Status: ${row.status}`,
      `Warm path: ${row.warmPathStatus}`,
      row.warmPathRoute ? `Intro route: ${row.warmPathRoute}` : null,
      row.warmPathIntro ? `Recommended intro: ${row.warmPathIntro}` : null,
      row.warmPathEvidence ? `Path evidence: ${row.warmPathEvidence}` : null,
      `Profile: ${abs(row.href)}`,
      `Graph: ${abs(row.graphHref)}`,
    ]
      .filter(Boolean)
      .join("\n"),
  );

  return [...header, ...blocks].join("\n\n");
}
