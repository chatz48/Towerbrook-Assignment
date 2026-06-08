import type { AdvisorExpertGap } from "@/lib/expert-discovery";
import { EXPERT_TYPE_LABEL, EXPERT_TYPE_STYLE } from "@/lib/labels";
import { Badge, DataTable } from "@/app/components/ui";
import { EmptyQueue, PriorityScore } from "./QueueShared";

export default function GapQueue({
  gaps,
  selectedId,
  onSelect,
}: {
  gaps: AdvisorExpertGap[];
  selectedId?: string;
  onSelect: (id: string) => void;
}) {
  if (!gaps.length) return <EmptyQueue />;
  return (
    <DataTable minWidth={960}>
        <thead>
          <tr>
            <th>Priority</th>
            <th>Advisor organization</th>
            <th>Needed person</th>
            <th>Deal evidence</th>
            <th>Coverage</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {gaps.slice(0, 40).map((gap) => (
            <tr
              key={gap.gap_id}
              className={selectedId === gap.gap_id ? "bg-[#f4f8ff]" : "hover:bg-[#fbfcff]"}
            >
              <td className="whitespace-nowrap">
                <PriorityScore value={gap.search_priority} />
              </td>
              <td className="min-w-[240px]">
                <button
                  type="button"
                  onClick={() => onSelect(gap.gap_id)}
                  className="text-left font-semibold text-accent hover:underline"
                >
                  {gap.organization}
                </button>
                <div className="mt-0.5 text-[11px] text-ink-soft">{gap.advisor_role}</div>
              </td>
              <td>
                <Badge className={EXPERT_TYPE_STYLE[gap.expert_type_sought]}>
                  {EXPERT_TYPE_LABEL[gap.expert_type_sought]}
                </Badge>
              </td>
              <td className="max-w-[320px] text-[11px] leading-relaxed text-ink-soft">
                <span className="line-clamp-2">
                  {gap.deals.map((deal) => `${deal.target}: ${deal.deal_name}`).join(", ")}
                </span>
              </td>
              <td className="text-[11px] text-ink-soft">
                {gap.coverage_status.replaceAll("-", " ")}
              </td>
              <td>
                <button
                  type="button"
                  onClick={() => onSelect(gap.gap_id)}
                  className="ee-button ee-button-secondary min-h-8 px-3"
                >
                  Review
                </button>
              </td>
            </tr>
          ))}
        </tbody>
    </DataTable>
  );
}
