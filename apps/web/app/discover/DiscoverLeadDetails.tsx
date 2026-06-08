import type {
  AdvisorExpertGap,
  DerivedCompanyCandidate,
  ExpertDiscoveryCandidate,
} from "@/lib/expert-discovery";
import {
  COMPANY_CATEGORY_LABEL,
  COMPANY_CATEGORY_STYLE,
  EXPERT_TYPE_LABEL,
  EXPERT_TYPE_STYLE,
} from "@/lib/labels";
import { THEME_BY_ID } from "@/lib/themes";
import { Badge, ThemeTag } from "@/app/components/ui";
import { defaultCompanyQuestions } from "./discover-utils";
import { PriorityScore } from "./QueueShared";

export function ExpertDetail({ expert }: { expert?: ExpertDiscoveryCandidate }) {
  if (!expert) return <EmptyDetail />;
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_330px]">
      <div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-[20px] font-semibold tracking-tight">{expert.name}</h3>
            <p className="mt-1 text-[13px] text-ink-soft">{expert.headline}</p>
          </div>
          <Badge className={EXPERT_TYPE_STYLE[expert.expert_type]}>
            {EXPERT_TYPE_LABEL[expert.expert_type]}
          </Badge>
        </div>
        <p className="mt-4 text-[13px] leading-relaxed text-ink-soft">{expert.why_relevant}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {expert.themes.map((theme) => (
            <ThemeTag key={theme} id={theme} small />
          ))}
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <DetailPanel title="Companies this expert can unlock">
            <ul className="space-y-2">
              {expert.connected_companies.slice(0, 8).map((company) => (
                <li key={`${company.name}-${company.relationship}`} className="text-[12px]">
                  <span className="font-semibold">{company.name}</span>
                  <span className="text-ink-faint"> · {company.relationship}</span>
                </li>
              ))}
            </ul>
          </DetailPanel>
          <DetailPanel title="Deal role evidence">
            <ul className="space-y-2">
              {expert.deal_roles.slice(0, 4).map((deal) => (
                <li key={`${deal.deal_id}-${deal.role}`} className="text-[12px] leading-relaxed">
                  <span className="font-semibold">{deal.target}</span>
                  <span className="text-ink-soft"> · {deal.role} via {deal.organization}</span>
                </li>
              ))}
            </ul>
          </DetailPanel>
        </div>

        <DetailPanel title="Action plan" className="mt-4">
          <ol className="grid gap-3 text-[12px] leading-relaxed text-ink-soft md:grid-cols-3">
            <li>
              <span className="block font-semibold text-ink">1. Verify</span>
              Confirm current role, LinkedIn, availability and conflicts.
            </li>
            <li>
              <span className="block font-semibold text-ink">2. Prepare</span>
              Ask for market map, competitor set and investable company referrals.
            </li>
            <li>
              <span className="block font-semibold text-ink">3. Derive</span>
              Promote companies and public-source paths that repeat across the source trail.
            </li>
          </ol>
        </DetailPanel>
      </div>
      <EvidenceRail sources={expert.sources} missing={expert.missing_profile_facts} />
    </div>
  );
}

export function CompanyDetail({ company }: { company?: DerivedCompanyCandidate }) {
  if (!company) return <EmptyDetail />;
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_330px]">
      <div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-[20px] font-semibold tracking-tight">{company.name}</h3>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">
              {company.why_interesting}
            </p>
          </div>
          <Badge className={COMPANY_CATEGORY_STYLE[company.category]}>
            {COMPANY_CATEGORY_LABEL[company.category]}
          </Badge>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {company.themes.map((theme) => (
            <ThemeTag key={theme} id={theme} small />
          ))}
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <MiniMetric label="Ownership" value={company.ownership_status} detail={company.owner ?? "No owner mapped"} />
          <MiniMetric label="Expert edges" value={company.expert_connections.length} detail="Named people" />
          <MiniMetric label="Priority" value={company.scores.research_priority} detail="Research score" />
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <DetailPanel title="Best expert paths">
            <ul className="space-y-2">
              {company.expert_connections.slice(0, 8).map((expert) => (
                <li key={expert.expert_candidate_id} className="flex items-start justify-between gap-3 text-[12px]">
                  <span>
                    <span className="font-semibold">{expert.name}</span>
                    <span className="text-ink-faint"> · {EXPERT_TYPE_LABEL[expert.expert_type]}</span>
                  </span>
                  <span className="tabular-nums text-ink-faint">{expert.expert_priority}</span>
                </li>
              ))}
            </ul>
          </DetailPanel>
          <DetailPanel title="Deal context">
            <ul className="space-y-2">
              {company.deal_connections.slice(0, 5).map((deal) => (
                <li key={deal.id} className="text-[12px] leading-relaxed">
                  <span className="font-semibold">{deal.name}</span>
                  <span className="text-ink-soft"> · {deal.lane} · {THEME_BY_ID[deal.theme].shortName}</span>
                </li>
              ))}
            </ul>
          </DetailPanel>
        </div>

        <DetailPanel title="Next diligence questions" className="mt-4">
          <ul className="grid gap-2 text-[12px] leading-relaxed text-ink-soft md:grid-cols-2">
            {defaultCompanyQuestions(company).map((question) => (
              <li key={question}>• {question}</li>
            ))}
          </ul>
        </DetailPanel>
      </div>
      <EvidenceRail sources={"sources" in company ? company.sources ?? [] : []} />
    </div>
  );
}

export function GapDetail({ gap }: { gap?: AdvisorExpertGap }) {
  if (!gap) return <EmptyDetail />;
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_330px]">
      <div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-[20px] font-semibold tracking-tight">{gap.organization}</h3>
            <p className="mt-1 text-[13px] text-ink-soft">
              Find the named {EXPERT_TYPE_LABEL[gap.expert_type_sought].toLowerCase()} behind{" "}
              {gap.advisor_role.replaceAll("-", " ")} work.
            </p>
          </div>
          <PriorityScore value={gap.search_priority} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {gap.themes.map((theme) => (
            <ThemeTag key={theme} id={theme} small />
          ))}
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <DetailPanel title="Deals that created the gap">
            <ul className="space-y-2">
              {gap.deals.map((deal) => (
                <li key={deal.deal_id} className="text-[12px] leading-relaxed">
                  <span className="font-semibold">{deal.target}</span>
                  <span className="text-ink-soft"> · {deal.deal_name}</span>
                </li>
              ))}
            </ul>
          </DetailPanel>
          <DetailPanel title="Search strings to run">
            <ul className="space-y-2">
              {gap.search_queries.slice(0, 4).map((search) => (
                <li key={search} className="rounded-md bg-paper p-2 font-mono text-[11px] leading-relaxed text-ink-soft">
                  {search}
                </li>
              ))}
            </ul>
          </DetailPanel>
        </div>

        <DetailPanel title="Success condition" className="mt-4">
          <p className="text-[12px] leading-relaxed text-ink-soft">
            Identify at least one senior named person with source-grounded evidence for the exact
            transaction role, then promote the person into the expert queue with a call objective.
          </p>
        </DetailPanel>
      </div>
      <EvidenceRail sources={"sources" in gap ? gap.sources ?? [] : []} />
    </div>
  );
}

function EvidenceRail({
  sources,
  missing = [],
}: {
  sources: { title: string; publisher?: string; url: string; evidence: string }[];
  missing?: string[];
}) {
  return (
    <aside className="space-y-4">
      <DetailPanel title="Source evidence">
        <ul className="space-y-3">
          {sources.slice(0, 6).map((source) => (
            <li key={`${source.url}-${source.title}`} className="text-[12px] leading-relaxed">
              <a href={source.url} target="_blank" rel="noopener noreferrer" className="ee-link font-semibold">
                {source.title}
              </a>
              {source.publisher ? <div className="text-[11px] text-ink-faint">{source.publisher}</div> : null}
              <p className="mt-1 text-ink-soft">{source.evidence}</p>
            </li>
          ))}
          {!sources.length ? (
            <li className="text-[12px] text-ink-faint">No source snippets are mapped yet.</li>
          ) : null}
        </ul>
      </DetailPanel>
      {missing.length ? (
        <DetailPanel title="Facts still missing">
          <div className="flex flex-wrap gap-2">
            {missing.map((fact) => (
              <Badge key={fact} className="border-amber-200 bg-amber-50 text-amber-700">
                {fact.replaceAll("_", " ")}
              </Badge>
            ))}
          </div>
        </DetailPanel>
      ) : null}
    </aside>
  );
}

function MiniMetric({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return (
    <div className="rounded-md border border-line bg-white p-3">
      <div className="ee-label">{label}</div>
      <div className="mt-1 text-[16px] font-semibold">{value}</div>
      <p className="mt-1 text-[11px] text-ink-faint">{detail}</p>
    </div>
  );
}

function DetailPanel({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-md border border-line bg-white p-4 ${className}`}>
      <div className="ee-label">{title}</div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function EmptyDetail() {
  return (
    <div className="rounded-md border border-line bg-paper p-6 text-[13px] text-ink-soft">
      Select a lead above to see public evidence, relationship paths and next actions.
    </div>
  );
}
