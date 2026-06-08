"use client";

import Link from "next/link";
import { useState } from "react";
import type { ReportSection, ReportSource } from "@/lib/report";

const INITIAL_VISIBLE = 3;

export default function MarketMapSection({
  section,
  sources,
}: {
  section: ReportSection;
  sources: ReportSource[];
}) {
  const [expanded, setExpanded] = useState(false);
  const rows = section.rows ?? [];
  const visibleRows = expanded ? rows : rows.slice(0, INITIAL_VISIBLE);
  const hiddenCount = Math.max(0, rows.length - INITIAL_VISIBLE);
  const citedSources = uniqueRefs(section.citations)
    .map((id) => sources.find((source) => source.id === id))
    .filter((source): source is ReportSource => Boolean(source));

  return (
    <div className="p-5">
      <p className="text-[13px] leading-relaxed text-ink">{section.summary}</p>

      {section.headlineStats?.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {section.headlineStats.map((stat) => (
            <div
              key={stat.label}
              className={`rounded-md border px-3 py-2 ${headlineStatTone(stat.tone)}`}
            >
              <div className="text-[16px] font-semibold tabular-nums text-ink">{stat.value}</div>
              <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-soft">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      ) : null}

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

      {visibleRows.length ? (
        <div className="mt-4 overflow-x-auto rounded-md border border-line">
          <table className="ee-table min-w-[760px]">
            <thead>
              <tr>
                <th>Cluster</th>
                <th>Density</th>
                <th>Signals</th>
                <th>Evidence / implication</th>
                <th>Coverage</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr key={`${section.id}-${row.label}`}>
                  <td className="font-semibold text-accent">
                    {row.href ? (
                      <Link href={row.href} className="hover:underline">
                        {row.label}
                      </Link>
                    ) : (
                      row.label
                    )}
                  </td>
                  <td className="whitespace-nowrap text-[11px] text-ink-soft">{row.value}</td>
                  <td>
                    {row.signals?.length ? (
                      <div className="flex flex-wrap gap-1">
                        {row.signals.map((signal) => (
                          <span
                            key={`${row.label}-${signal.label}`}
                            className="rounded border border-line bg-paper px-1.5 py-0.5 text-[10px] text-ink-soft"
                          >
                            <span className="font-semibold text-ink">{signal.value}</span>{" "}
                            {signal.label}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[11px] text-ink-faint">—</span>
                    )}
                  </td>
                  <td className="max-w-[420px] text-[11px] leading-relaxed text-ink-soft">
                    {row.detail}
                  </td>
                  <td>
                    <span
                      className={`inline-flex rounded-md border px-2 py-0.5 text-[10px] font-semibold ${metricTone(
                        row.metricTone,
                      )}`}
                    >
                      {row.metric ?? "Review"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {hiddenCount > 0 ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="ee-button ee-button-secondary min-h-8 px-3 text-[12px]"
          >
            {expanded ? "Show fewer clusters" : `View ${hiddenCount} more cluster${hiddenCount === 1 ? "" : "s"}`}
          </button>
          {section.viewMoreHref ? (
            <Link href={section.viewMoreHref} className="ee-button ee-button-primary min-h-8 px-3 text-[12px]">
              {section.viewMoreLabel ?? "View full call list"}
            </Link>
          ) : null}
        </div>
      ) : section.viewMoreHref ? (
        <div className="mt-3">
          <Link href={section.viewMoreHref} className="ee-button ee-button-primary min-h-8 px-3 text-[12px]">
            {section.viewMoreLabel ?? "View full call list"}
          </Link>
        </div>
      ) : null}

      <div className="mt-4 border-t border-line pt-3">
        <div className="ee-label text-ink-faint">Cited evidence</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {citedSources.length ? (
            citedSources.map((source) => (
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
            ))
          ) : (
            <span className="text-[11px] text-danger">No section-level evidence linked.</span>
          )}
        </div>
      </div>
    </div>
  );
}

function headlineStatTone(tone?: "strong" | "watch" | "neutral"): string {
  if (tone === "strong") return "border-emerald-200 bg-emerald-50";
  if (tone === "watch") return "border-amber-200 bg-amber-50";
  return "border-line bg-paper";
}

function metricTone(tone?: "strong" | "developing" | "thin"): string {
  if (tone === "strong") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (tone === "developing") return "border-amber-200 bg-amber-50 text-amber-800";
  if (tone === "thin") return "border-rose-200 bg-rose-50 text-rose-800";
  return "border-line bg-paper text-ink";
}

function uniqueRefs(ids: string[]): string[] {
  return [...new Set(ids)];
}
