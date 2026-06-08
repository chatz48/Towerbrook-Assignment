import Link from "next/link";
import { EXPERT_TYPE_LABEL } from "@/lib/labels";
import { expertsPageHref, type ExpertsFilterParams } from "@/lib/experts-url";
import { THEME_BY_ID } from "@/lib/themes";

const READINESS_CHIP_LABEL: Record<string, string> = {
  actionable: "Actionable now",
  "call-ready": "Call-ready",
  "verify-contact": "Find contact path",
  "verify-identity": "Verify identity",
  "research-needed": "Research needed",
};

export default function ExpertFilterChips({
  params,
  pinnedCount,
  embedded = false,
}: {
  params: ExpertsFilterParams;
  pinnedCount: number;
  embedded?: boolean;
}) {
  const chips: { key: keyof ExpertsFilterParams | "pinned"; label: string; href: string }[] = [];

  if (params.theme && params.theme !== "all") {
    chips.push({
      key: "theme",
      label: THEME_BY_ID[params.theme as keyof typeof THEME_BY_ID]?.name ?? params.theme,
      href: expertsPageHref(params, "theme"),
    });
  }
  if (params.specialty && params.specialty !== "all") {
    chips.push({
      key: "specialty",
      label: params.specialty,
      href: expertsPageHref(params, "specialty"),
    });
  }
  if (params.type && params.type !== "all") {
    chips.push({
      key: "type",
      label: EXPERT_TYPE_LABEL[params.type as keyof typeof EXPERT_TYPE_LABEL] ?? params.type,
      href: expertsPageHref(params, "type"),
    });
  }
  if (params.readiness && params.readiness !== "all") {
    chips.push({
      key: "readiness",
      label: READINESS_CHIP_LABEL[params.readiness] ?? params.readiness,
      href: expertsPageHref(params, "readiness"),
    });
  }
  if (params.q?.trim()) {
    chips.push({
      key: "q",
      label: `“${params.q.trim()}”`,
      href: expertsPageHref(params, "q"),
    });
  }
  if (pinnedCount > 0) {
    chips.push({
      key: "pinned",
      label: `${pinnedCount} pinned`,
      href: expertsPageHref(params, "experts"),
    });
  }

  if (!chips.length) return null;

  return (
    <div
      className={`flex flex-wrap items-center gap-2 ${
        embedded ? "border-b border-line bg-white px-3 py-1.5" : "mb-2"
      }`}
    >
      <span className="text-[11px] font-medium text-ink-faint">Filters</span>
      {chips.map((chip) => (
        <span
          key={chip.key}
          className="inline-flex items-center gap-1 rounded-full border border-line bg-white py-0.5 pl-2.5 pr-1 text-[11px] text-ink"
        >
          {chip.label}
          <Link
            href={chip.href}
            className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[14px] leading-none text-ink-faint hover:bg-[#edf5ff] hover:text-accent"
            aria-label={`Remove filter: ${chip.label}`}
          >
            ×
          </Link>
        </span>
      ))}
    </div>
  );
}
