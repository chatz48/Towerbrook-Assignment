import type { ExpertDiscoveryCandidate } from "@/lib/expert-discovery";
import { EXPERT_TYPE_LABEL, EXPERT_TYPE_STYLE } from "@/lib/labels";
import { Badge, DataTable } from "@/app/components/ui";
import { formatAccessPath } from "./discover-utils";
import { EmptyQueue, PriorityScore } from "./QueueShared";

export default function ExpertQueue({
  experts,
  selectedId,
  onSelect,
}: {
  experts: ExpertDiscoveryCandidate[];
  selectedId?: string;
  onSelect: (id: string) => void;
}) {
  if (!experts.length) return <EmptyQueue />;
  return (
    <DataTable minWidth={1000}>
        <thead>
          <tr>
            <th>Priority</th>
            <th>Expert</th>
            <th>Type</th>
            <th>Relationship path</th>
            <th>Companies unlocked</th>
            <th>Evidence</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {experts.slice(0, 40).map((expert) => (
            <tr
              key={expert.candidate_id}
              className={selectedId === expert.candidate_id ? "bg-[#f4f8ff]" : "hover:bg-[#fbfcff]"}
            >
              <td className="whitespace-nowrap">
                <PriorityScore value={expert.scores.research_priority} />
              </td>
              <td className="min-w-[230px]">
                <button
                  type="button"
                  onClick={() => onSelect(expert.candidate_id)}
                  className="text-left font-semibold text-accent hover:underline"
                >
                  {expert.name}
                </button>
                <div className="mt-0.5 text-[11px] text-ink-soft">{expert.headline}</div>
              </td>
              <td>
                <Badge className={EXPERT_TYPE_STYLE[expert.expert_type]}>
                  {EXPERT_TYPE_LABEL[expert.expert_type]}
                </Badge>
              </td>
              <td className="max-w-[190px] text-[11px] text-ink-soft">
                {formatAccessPath(expert.access_path)}
              </td>
              <td className="max-w-[280px] text-[11px] leading-relaxed text-ink-soft">
                <span className="line-clamp-2">
                  {expert.connected_companies
                    .slice(0, 5)
                    .map((company) => `${company.name} (${company.relationship})`)
                    .join(", ")}
                </span>
              </td>
              <td className="whitespace-nowrap text-[11px] text-ink-soft">
                {expert.sources.length} sources · {expert.deal_roles.length} deals
              </td>
              <td>
                <button
                  type="button"
                  onClick={() => onSelect(expert.candidate_id)}
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
