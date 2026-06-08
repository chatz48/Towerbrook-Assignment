import Link from "next/link";
import type { Signal, Source, ThemeId } from "@/lib/types";
import { THEME_BY_ID } from "@/lib/themes";
import { confidenceLabel } from "@/lib/labels";

export function Badge({
  children,
  className = "",
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium ${className}`}
    >
      {children}
    </span>
  );
}

export function Panel({
  children,
  className = "",
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return <section className={`ee-panel rounded-lg ${className}`}>{children}</section>;
}

export function PageShell({
  children,
  className = "",
  innerClassName = "mx-auto max-w-[1540px]",
}: {
  children?: React.ReactNode;
  className?: string;
  innerClassName?: string;
}) {
  return (
    <div className={`ee-shell px-3 py-2 sm:px-4 ${className}`}>
      <div className={innerClassName}>{children}</div>
    </div>
  );
}

export function PanelHeader({
  title,
  action,
}: {
  title: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between border-b border-line px-3 py-2">
      <h2 className="ee-label text-ink">{title}</h2>
      {action ? <div className="text-[12px]">{action}</div> : null}
    </div>
  );
}

/** Single-line panel title row — label, heading, optional hint, optional trailing badge/actions. */
export function PanelIntro({
  label,
  title,
  hint,
  trailing,
  labelClassName = "text-accent",
  titleClassName = "text-[13px]",
}: {
  label: string;
  title?: string;
  hint?: string;
  trailing?: React.ReactNode;
  labelClassName?: string;
  titleClassName?: string;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <div className={`ee-label ${labelClassName}`}>{label}</div>
        {title ? (
          <h2 className={`font-semibold tracking-tight text-ink ${titleClassName}`}>{title}</h2>
        ) : null}
        {hint ? <p className="text-[10px] text-ink-soft">{hint}</p> : null}
      </div>
      {trailing}
    </div>
  );
}

/** Data-first page header — consistent title scale for table-heavy views. */
export function DataPageHeader({
  title,
  meta,
  actions,
  className = "",
}: {
  title: string;
  meta?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={`mb-3 flex flex-col gap-2 border-b border-line pb-3 sm:flex-row sm:items-end sm:justify-between ${className}`}
    >
      <div className="min-w-0">
        <h1 className="ee-data-page-title text-ink">{title}</h1>
        {meta ? <p className="ee-data-page-meta mt-1">{meta}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}

/** Scrollable table shell with consistent min-width scaling. */
export function DataTable({
  children,
  minWidth = 960,
  className = "",
  dense = false,
}: {
  children: React.ReactNode;
  minWidth?: number;
  className?: string;
  dense?: boolean;
}) {
  return (
    <div className={`ee-table-wrap ${className}`}>
      <table className={`ee-table ${dense ? "ee-table-dense" : ""}`} style={{ minWidth }}>
        {children}
      </table>
    </div>
  );
}

export function GraphLink({
  href,
  label = "Graph",
  className = "ee-button ee-button-secondary min-h-8 px-3",
}: {
  href: string;
  label?: string;
  className?: string;
}) {
  return (
    <Link href={href} className={className} title="View in relationship graph">
      {label}
    </Link>
  );
}

/** Compact page hero — keeps primary content above the fold on list/workspace pages. */
export function PageHeader({
  label,
  title,
  description,
  actions,
  className = "",
}: {
  label?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={`ee-panel mb-3 rounded-lg px-3 py-2.5 ${className}`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
          {label ? <div className="ee-label text-accent">{label}</div> : null}
          <h1 className="text-[15px] font-semibold tracking-tight text-ink">{title}</h1>
          {description ? <p className="text-[11px] text-ink-soft">{description}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}

export function ThemeTag({ id, small = false }: { id: ThemeId; small?: boolean }) {
  const t = THEME_BY_ID[id];
  return (
    <span
      className={`inline-flex items-center gap-1.5 ${small ? "text-[11px]" : "text-xs"}`}
      style={{ color: t.accent }}
    >
      <span
        className="inline-block rounded-full"
        style={{ width: 7, height: 7, background: t.accent }}
      />
      {small ? t.shortName : t.name}
    </span>
  );
}

export function Confidence({ value }: { value: number }) {
  const { label, style } = confidenceLabel(value);
  return (
    <span
      className={`inline-flex items-center gap-2 text-[11px] ${style}`}
      title={`Data confidence: ${(value * 100).toFixed(0)}%`}
    >
      <span className="h-2 w-2 rounded-full bg-current" />
      {label.replace(" confidence", "")} · {(value * 100).toFixed(0)}%
    </span>
  );
}

export function ConfidenceBars({
  value,
  max = 5,
}: {
  value: number;
  max?: number;
}) {
  const filled = Math.max(0, Math.min(max, Math.round(value * max)));
  return (
    <span className="inline-flex items-center gap-2">
      <span className="ee-metric-bar" aria-hidden="true">
        {Array.from({ length: max }).map((_, i) => (
          <span key={i} style={{ opacity: i < filled ? 1 : 0 }} />
        ))}
      </span>
      <span className="sr-only">{Math.round(value * 100)}%</span>
    </span>
  );
}

export function SourceLinks({ sources }: { sources: Source[] }) {
  return (
    <ul className="space-y-1.5">
      {sources.map((s, i) => (
        <li key={i} className="text-sm flex gap-2">
          <span className="text-ink-faint select-none">{i + 1}.</span>
          <a
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            className="ee-link break-words"
          >
            {s.title}
            {s.publisher ? <span className="text-ink-faint"> — {s.publisher}</span> : null}
          </a>
        </li>
      ))}
    </ul>
  );
}

export function Stat({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div className="border-r border-line px-6 py-5 first:pl-0 last:border-r-0">
      <span className="block text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
        {label}
      </span>
      <span className="mt-2 block text-2xl font-semibold tracking-tight tabular-nums">
        {value}
      </span>
    </div>
  );
}

export function SectionTitle({
  children,
  hint,
}: {
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="flex items-baseline justify-between mb-3">
      <h2 className="ee-label">
        {children}
      </h2>
      {hint ? <span className="text-xs text-ink-faint">{hint}</span> : null}
    </div>
  );
}

/** Plain, low-emphasis tag — used for specialty labels. */
export function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block rounded-md border border-line bg-paper px-2 py-0.5 text-[11px] text-ink-soft">
      {children}
    </span>
  );
}

function formatSignalDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

/** Dated, sourced news items (the timeliness layer). */
export function NewsFeed({ items }: { items: Signal[] }) {
  return (
    <ul className="space-y-2">
      {items
        .slice()
        .sort((a, b) => (a.date < b.date ? 1 : -1))
        .map((s, i) => (
          <li key={i} className="flex gap-3 text-sm">
            <span className="text-ink-faint tabular-nums shrink-0 w-16">
              {formatSignalDate(s.date)}
            </span>
            <div>
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline underline-offset-2"
              >
                {s.headline}
              </a>
              <span className="text-ink-faint"> · {s.source}</span>
            </div>
          </li>
        ))}
    </ul>
  );
}

export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-sm text-ink-soft hover:text-ink transition-colors"
    >
      <span aria-hidden="true">←</span> {children}
    </Link>
  );
}

export function MetricBars({ value }: { value: number }) {
  const normalized = value > 1 ? value / 100 : value;
  return <ConfidenceBars value={normalized} max={4} />;
}
