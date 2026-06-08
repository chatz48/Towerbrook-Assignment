"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Expert, ExpertType, ThemeId } from "@/lib/types";
import {
  OPTIMIZATION_LABEL,
  SESSION_OBJECTIVE_LABEL,
  type RankingOptimization,
  type SessionObjective,
  rankExpertsForSession,
} from "@/lib/score";
import { EXPERT_TYPE_LABEL } from "@/lib/labels";
import { Badge } from "./ui";

export interface RankedExpert {
  expert: Expert;
  score: number;
}

export interface TowerBrookExpertScoreSummary {
  score: number;
  label: string;
  isDirect: boolean;
}

const OBJECTIVES = Object.entries(SESSION_OBJECTIVE_LABEL) as [
  SessionObjective,
  string,
][];

const OPTIMIZATIONS = Object.entries(OPTIMIZATION_LABEL) as [
  RankingOptimization,
  string,
][];

const TYPE_ORDER: ExpertType[] = [
  "operator",
  "ex-founder",
  "investor",
  "banker",
  "lawyer",
  "advisor",
  "service-provider",
];

export default function ExpertList({
  ranked,
  themeId,
  companyNames,
  towerBrookScores = {},
}: {
  ranked: RankedExpert[];
  themeId: ThemeId;
  companyNames: Record<string, string>;
  towerBrookScores?: Record<string, TowerBrookExpertScoreSummary>;
}) {
  const [objective, setObjective] = useState<SessionObjective>("market-structure");
  const [optimizeFor, setOptimizeFor] = useState<RankingOptimization>("balanced");
  const [preferredTypes, setPreferredTypes] = useState<ExpertType[]>([
    "operator",
    "ex-founder",
  ]);
  const [spec, setSpec] = useState<string | "all">("all");
  const [towerBrookOnly, setTowerBrookOnly] = useState(false);

  const experts = useMemo(() => ranked.map((r) => r.expert), [ranked]);

  const specialties = useMemo(() => {
    const counts = new Map<string, number>();
    for (const expert of experts) {
      for (const s of expert.specialties ?? []) {
        counts.set(s, (counts.get(s) ?? 0) + 1);
      }
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [experts]);

  const sessionRanked = useMemo(
    () => {
      const scored = rankExpertsForSession(
        spec === "all"
          ? experts
          : experts.filter((expert) => expert.specialties?.includes(spec)),
        {
          objective,
          optimizeFor,
          preferredTypes,
          theme: themeId,
          geography: "global",
        },
      ).map((row) => ({
        ...row,
        towerBrook: towerBrookScores[row.expert.id] ?? {
          score: 0,
          label: "Theme fit",
          isDirect: false,
        },
      }));

      const visible = towerBrookOnly
        ? scored.filter((row) => row.towerBrook.isDirect)
        : scored;

      return visible.sort(
        (a, b) =>
          (towerBrookOnly
            ? b.towerBrook.score - a.towerBrook.score
            : b.score.total - a.score.total) ||
          b.score.total - a.score.total,
      );
    },
    [
      experts,
      objective,
      optimizeFor,
      preferredTypes,
      spec,
      themeId,
      towerBrookOnly,
      towerBrookScores,
    ],
  );

  function toggleType(type: ExpertType) {
    setPreferredTypes((current) =>
      current.includes(type)
        ? current.filter((candidate) => candidate !== type)
        : [...current, type],
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="ee-panel overflow-hidden rounded-lg">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <div>
            <h2 className="ee-label text-ink">Experts in theme ({sessionRanked.length})</h2>
            <p className="mt-1 text-[12px] text-ink-faint">
              Ordered for the selected call objective. Open the profile to review sources before outreach.
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="ee-table min-w-[1080px]">
            <thead>
              <tr>
                <th>Priority</th>
                <th>Expert</th>
                <th>Archetype</th>
                <th>Why call</th>
                <th>Relationship path</th>
                <th>Connected companies</th>
                <th>Evidence</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {sessionRanked.map(({ expert, towerBrook }, index) => (
                <tr key={expert.id} className="hover:bg-[#fbfcff]">
                  <td>
                    <span className="inline-grid h-8 w-8 place-items-center rounded bg-[#f1f4f9] text-[16px] font-semibold text-accent tabular-nums">
                      {index + 1}
                    </span>
                  </td>
                  <td className="min-w-[220px]">
                    <Link href={`/experts/${expert.id}`} className="ee-link">
                      {expert.name}
                    </Link>
                    <div className="mt-0.5 text-[11px] leading-snug text-ink-soft">
                      {expert.headline}
                    </div>
                    {expert.org ? (
                      <div className="mt-0.5 text-[11px] text-ink-faint">
                        {expert.org}
                      </div>
                    ) : null}
                  </td>
                  <td>{EXPERT_TYPE_LABEL[expert.type]}</td>
                  <td className="max-w-[340px] text-[11px] leading-relaxed text-ink-soft">
                    <span className="line-clamp-3">
                      {expert.news?.[0]?.headline ?? expert.signals?.[0] ?? expert.whyRelevant}
                    </span>
                  </td>
                  <td>
                    <Badge
                      className={
                        towerBrook.isDirect
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-line bg-white text-ink-soft"
                      }
                    >
                      {towerBrook.isDirect ? towerBrook.label : "No public TowerBrook path mapped"}
                    </Badge>
                  </td>
                  <td className="max-w-[190px]">
                    <span className="line-clamp-2">
                      {expert.companies
                        .map((link) => companyNames[link.companyId] ?? link.companyId)
                        .join(", ")}
                    </span>
                  </td>
                  <td className="whitespace-nowrap text-[11px] text-ink-soft">
                    {expert.sources.length} source{expert.sources.length === 1 ? "" : "s"}
                    {expert.news?.length ? ` · ${expert.news.length} dated signal${expert.news.length === 1 ? "" : "s"}` : ""}
                  </td>
                  <td>
                    <Link href={`/experts/${expert.id}`} className="ee-button ee-button-secondary min-h-8 px-3">
                      Prepare call
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <aside className="space-y-4">
        <section className="ee-panel rounded-lg p-4">
          <div className="ee-label text-ink">Call-list calibration</div>
          <p className="mt-1 text-[12px] text-ink-faint">
            What kind of expert matters for this session?
          </p>

          <label className="mt-4 block text-[12px] font-medium text-ink-soft">
            What are you trying to learn?
            <select
              value={objective}
              onChange={(event) => setObjective(event.target.value as SessionObjective)}
              className="mt-1 w-full rounded-md border border-line-strong bg-white px-3 py-2 text-[13px] outline-none focus:border-accent"
            >
              {OBJECTIVES.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <div className="mt-4">
            <div className="text-[12px] font-medium text-ink-soft">
              Which expert types matter most?
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {TYPE_ORDER.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => toggleType(type)}
                  className={`rounded-md border px-3 py-2 text-left text-[12px] transition-colors ${
                    preferredTypes.includes(type)
                      ? "border-accent bg-[#edf5ff] text-accent"
                      : "border-line bg-white text-ink-soft hover:border-line-strong"
                  }`}
                >
                  {EXPERT_TYPE_LABEL[type]}
                </button>
              ))}
            </div>
          </div>

          <label className="mt-4 block text-[12px] font-medium text-ink-soft">
            What should we optimize for?
            <select
              value={optimizeFor}
              onChange={(event) =>
                setOptimizeFor(event.target.value as RankingOptimization)
              }
              className="mt-1 w-full rounded-md border border-line-strong bg-white px-3 py-2 text-[13px] outline-none focus:border-accent"
            >
              {OPTIMIZATIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </section>

        <section className="ee-panel rounded-lg p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
          <div className="ee-label text-ink">Existing relationship paths</div>
              <p className="mt-1 text-[12px] leading-relaxed text-ink-faint">
                Show only experts with a direct TowerBrook, portfolio, or named advisor link.
              </p>
            </div>
            <button
              type="button"
              aria-pressed={towerBrookOnly}
              onClick={() => setTowerBrookOnly((value) => !value)}
              className={`shrink-0 rounded-md border px-3 py-2 text-[12px] font-semibold ${
                towerBrookOnly
                  ? "border-accent bg-[#edf5ff] text-accent"
                  : "border-line bg-white text-ink-soft hover:border-line-strong"
              }`}
            >
              {towerBrookOnly ? "On" : "Off"}
            </button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[12px]">
            <div className="rounded-md border border-line bg-paper p-2">
              <div className="ee-label">Direct links</div>
              <div className="mt-1 text-[18px] font-semibold tabular-nums">
                {
                  ranked.filter((row) => towerBrookScores[row.expert.id]?.isDirect)
                    .length
                }
              </div>
            </div>
            <div className="rounded-md border border-line bg-paper p-2">
              <div className="ee-label">Visible rows</div>
              <div className="mt-1 text-[18px] font-semibold tabular-nums">
                {sessionRanked.length}
              </div>
            </div>
          </div>
        </section>

        <section className="ee-panel rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="ee-label text-ink">Specialty filter</div>
            <button
              type="button"
              onClick={() => setSpec("all")}
              className="text-[12px] text-accent"
            >
              Clear
            </button>
          </div>
          <div className="mt-3 space-y-2">
            <button
              type="button"
              onClick={() => setSpec("all")}
              className={`w-full rounded-md border px-3 py-2 text-left text-[12px] ${
                spec === "all"
                  ? "border-accent bg-[#edf5ff] text-accent"
                  : "border-line bg-white text-ink-soft"
              }`}
            >
              All specialties
            </button>
            {specialties.map(([name, count]) => (
              <button
                key={name}
                type="button"
                onClick={() => setSpec(name)}
                className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-[12px] ${
                  spec === name
                    ? "border-accent bg-[#edf5ff] text-accent"
                    : "border-line bg-white text-ink-soft"
                }`}
              >
                <span>{name}</span>
                <span className="text-ink-faint">{count}</span>
              </button>
            ))}
          </div>
        </section>
      </aside>
    </div>
  );
}
