"use client";

import type { ScoreHelpLine } from "@/lib/score-copy";

export default function ScoreHelp({
  title,
  display,
  lines,
  footnote,
  compact = false,
  className = "",
  pillClassName = "ee-score-pill",
}: {
  title: string;
  display: string;
  lines: ScoreHelpLine[];
  footnote?: string;
  compact?: boolean;
  className?: string;
  pillClassName?: string;
}) {
  const summary = lines.map((line) => `${line.label}: ${line.value}`).join(", ");

  return (
    <span className={`group relative inline-flex max-w-full ${className}`}>
      <span
        className={`${pillClassName} cursor-help ${compact ? "" : ""}`}
        tabIndex={0}
        aria-label={`${title}: ${display}. ${summary}`}
      >
        {display}
      </span>
      <span
        className="pointer-events-none absolute left-0 top-full z-30 mt-2 hidden w-72 rounded-md border border-line bg-white p-3 text-left shadow-lg group-focus-within:block group-hover:block"
        role="tooltip"
      >
        <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-ink">
          {title}
        </span>
        {footnote ? (
          <p className="mt-1 text-[11px] leading-snug text-ink-faint">{footnote}</p>
        ) : null}
        <span className="mt-2 grid gap-1.5">
          {lines.map((line) => (
            <span
              key={`${line.label}-${line.value}`}
              className="grid grid-cols-[108px_minmax(0,1fr)] gap-2 text-[11px] leading-snug"
            >
              <span className="font-semibold text-ink-soft">{line.label}</span>
              <span className="text-ink">{line.value}</span>
            </span>
          ))}
        </span>
      </span>
    </span>
  );
}
