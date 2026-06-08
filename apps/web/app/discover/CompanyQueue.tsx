import type { DerivedCompanyCandidate } from "@/lib/expert-discovery";
import { COMPANY_CATEGORY_LABEL, COMPANY_CATEGORY_STYLE } from "@/lib/labels";
import { Badge, DataTable } from "@/app/components/ui";
import { EmptyQueue, PriorityScore } from "./QueueShared";

export default function CompanyQueue({
  companies,
  selectedId,
  onSelect,
}: {
  companies: DerivedCompanyCandidate[];
  selectedId?: string;
  onSelect: (id: string) => void;
}) {
  if (!companies.length) return <EmptyQueue />;
  return (
    <DataTable minWidth={1000}>
        <thead>
          <tr>
            <th>Priority</th>
            <th>Company</th>
            <th>Category</th>
            <th>Ownership</th>
            <th>Expert density</th>
            <th>Evidence deals</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {companies.slice(0, 40).map((company) => (
            <tr
              key={company.candidate_id}
              className={selectedId === company.candidate_id ? "bg-[#f4f8ff]" : "hover:bg-[#fbfcff]"}
            >
              <td className="whitespace-nowrap">
                <PriorityScore value={company.scores.research_priority} />
              </td>
              <td className="min-w-[240px]">
                <button
                  type="button"
                  onClick={() => onSelect(company.candidate_id)}
                  className="text-left font-semibold text-accent hover:underline"
                >
                  {company.name}
                </button>
                <div className="mt-0.5 text-[11px] leading-relaxed text-ink-soft">
                  <span className="line-clamp-2">{company.why_interesting}</span>
                </div>
              </td>
              <td>
                <Badge className={COMPANY_CATEGORY_STYLE[company.category]}>
                  {COMPANY_CATEGORY_LABEL[company.category]}
                </Badge>
              </td>
              <td className="max-w-[180px] text-[11px] text-ink-soft">
                {company.ownership_status}
                {company.owner ? <span> · {company.owner}</span> : null}
              </td>
              <td className="text-[11px] text-ink-soft">
                {company.expert_connections.length} named experts
              </td>
              <td className="max-w-[250px] text-[11px] leading-relaxed text-ink-soft">
                <span className="line-clamp-2">
                  {company.deal_connections.map((deal) => deal.name).join(", ")}
                </span>
              </td>
              <td>
                <button
                  type="button"
                  onClick={() => onSelect(company.candidate_id)}
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
