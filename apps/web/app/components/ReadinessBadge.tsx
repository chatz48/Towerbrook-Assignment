import type { ReadinessBadgeModel } from "@/lib/investment-readiness";

const TONE_STYLE: Record<ReadinessBadgeModel["tone"], string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  danger: "border-rose-200 bg-rose-50 text-rose-700",
  neutral: "border-line bg-paper text-ink-soft",
  accent: "border-blue-200 bg-blue-50 text-blue-700",
};

export default function ReadinessBadge({ badge, compact = false }: { badge: ReadinessBadgeModel; compact?: boolean }) {
  const detailLabels = ["Profile", "Company edges", "Contact", "Evidence"];
  return (
    <span className="group relative inline-flex">
      <span
        className={`inline-flex items-center rounded-full border font-semibold ${TONE_STYLE[badge.tone]} ${
          compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]"
        }`}
        tabIndex={0}
        aria-label={`${badge.label}: ${badge.reasons.join(", ")}`}
      >
        {badge.label}
      </span>
      <span className="pointer-events-none absolute left-0 top-full z-20 mt-2 hidden w-64 rounded-md border border-line bg-white p-3 text-left shadow-lg group-focus-within:block group-hover:block">
        <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-ink">
          Readiness
        </span>
        <span className="mt-2 grid gap-1.5">
          {badge.reasons.slice(0, 4).map((reason, index) => (
            <span key={reason} className="grid grid-cols-[88px_minmax(0,1fr)] gap-2 text-[11px] leading-snug">
              <span className="font-semibold text-ink-soft">{detailLabels[index] ?? "Check"}</span>
              <span className="text-ink">{reason}</span>
            </span>
          ))}
        </span>
      </span>
    </span>
  );
}
