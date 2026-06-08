import { notFound } from "next/navigation";
import Link from "next/link";
import { getCompanies, companyWithLinks, getCompany } from "@/lib/data";
import { DEAL_TYPE_LABEL, dealDate, primaryDealParty } from "@/lib/deals";
import { listDealsForCompany } from "@/lib/deal-repository";
import { towerBrookCompanyScore } from "@/lib/towerbrook";
import {
  COMPANY_CATEGORY_LABEL,
  COMPANY_CATEGORY_STYLE,
  EXPERT_TYPE_LABEL,
  EXPERT_TYPE_STYLE,
  OWNERSHIP_LABEL,
  OWNERSHIP_STYLE,
  RELATIONSHIP_LABEL,
} from "@/lib/labels";
import {
  Badge,
  BackLink,
  Chip,
  Confidence,
  NewsFeed,
  PageShell,
  SourceLinks,
  ThemeTag,
} from "@/app/components/ui";
import { CallPrepChecklist } from "@/app/components/InvestorWorkflow";
import {
  WorkspaceActionButton,
  WorkspaceSavedBadge,
} from "@/app/components/InvestorWorkspaceTray";
import { getIncludeTowerBrookEmployees } from "@/lib/employee-scope-server";
import { companyReadiness, targetScorecard } from "@/lib/investment-readiness";
import ReadinessBadge from "@/app/components/ReadinessBadge";
import ScoreHelp from "@/app/components/ScoreHelp";
import { TARGET_SCORE_FOOTNOTE, targetScorecardLines } from "@/lib/target-score-copy";

export function generateStaticParams() {
  return getCompanies().map((c) => ({ id: c.id }));
}

export default async function CompanyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const includeTowerBrookEmployees = await getIncludeTowerBrookEmployees();
  const company = companyWithLinks(id, includeTowerBrookEmployees);
  if (!company) notFound();
  const towerBrook = towerBrookCompanyScore(company, company.expertCount);
  const readiness = companyReadiness(company);
  const scorecard = targetScorecard(company);
  const relatedDeals = await listDealsForCompany(company.id);

  const similar = (company.similarCompanyIds ?? [])
    .map((sid) => getCompany(sid))
    .filter((c): c is NonNullable<typeof c> => Boolean(c));

  return (
    <PageShell innerClassName="mx-auto max-w-[1300px]">
        <BackLink href="/companies">Back to companies</BackLink>

        <header className="ee-panel mt-5 rounded-lg p-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-[28px] font-semibold tracking-tight">{company.name}</h1>
                <WorkspaceSavedBadge id={company.id} kind="target" />
                <Badge className={COMPANY_CATEGORY_STYLE[company.category]}>
                  {COMPANY_CATEGORY_LABEL[company.category]}
                </Badge>
                {company.ownershipStatus ? (
                  <Badge className={OWNERSHIP_STYLE[company.ownershipStatus]}>
                    {OWNERSHIP_LABEL[company.ownershipStatus]}
                    {company.owner ? ` · ${company.owner}` : ""}
                  </Badge>
                ) : null}
              </div>
              <p className="mt-4 max-w-3xl text-[13px] leading-relaxed text-ink-soft">
                {company.description}
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                {company.themes.map((theme) => (
                  <ThemeTag key={theme} id={theme} small />
                ))}
                {company.specialties?.map((specialty) => (
                  <Chip key={specialty}>{specialty}</Chip>
                ))}
              </div>
            </div>
            <div className="w-full min-w-0 rounded-lg border border-line bg-[#fbfcff] p-4 lg:w-auto lg:min-w-[360px]">
              <div className="ee-label text-ink">Next action</div>
              <div className="mt-2 text-[15px] font-semibold text-ink">
                Validate {company.name} through named people evidence
              </div>
              <p className="mt-2 text-[12px] leading-relaxed text-ink-soft">
                {company.expertCount} expert link{company.expertCount === 1 ? "" : "s"},
                {" "}{company.sources.length} source record{company.sources.length === 1 ? "" : "s"},
                {" "}and {company.ownershipStatus ? OWNERSHIP_LABEL[company.ownershipStatus] : "ownership to verify"}.
              </p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <Link
                  href={company.linkedExperts[0] ? `/experts/${company.linkedExperts[0].expert.id}?company=${company.id}` : `/ask?company=${company.id}`}
                  className="ee-button ee-button-primary min-h-8 px-3"
                >
                  Prepare call
                </Link>
                <WorkspaceActionButton
                  item={{
                    id: company.id,
                    kind: "target",
                    name: company.name,
                    sub: company.whyInteresting ?? company.description,
                    href: `/companies/${company.id}`,
                    theme: company.themes[0],
                    status: "watchlist",
                  }}
                >
                  Promote to target
                </WorkspaceActionButton>
                <WorkspaceActionButton
                  item={{
                    id: `${company.id}-comparable`,
                    kind: "target",
                    name: company.name,
                    sub: "Comparable only — not an active target",
                    href: `/companies/${company.id}`,
                    theme: company.themes[0],
                    status: "comparable",
                  }}
                  className="ee-button ee-button-secondary min-h-8 px-3"
                >
                  Mark comparable
                </WorkspaceActionButton>
                <Link href={`/graph?focus=company:${company.id}`} className="ee-button ee-button-secondary min-h-8 px-3">
                  View relationships
                </Link>
                <Link href={`/ask?company=${company.id}`} className="ee-button ee-button-secondary min-h-8 px-3">
                  Use in Copilot
                </Link>
                <Link href={`/reports?company=${company.id}`} className="ee-button ee-button-secondary min-h-8 px-3">
                  Use in report
                </Link>
              </div>
            </div>
          </div>
        </header>

        <section className="ee-panel mt-5 rounded-lg p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="ee-label text-accent">PE target scorecard</div>
              <h2 className="mt-2 text-[18px] font-semibold tracking-tight">{scorecard.label}</h2>
              <p className="mt-2 max-w-3xl text-[12px] leading-relaxed text-ink-soft">{scorecard.nextAction}</p>
            </div>
            <div className="flex items-center gap-3">
              <ReadinessBadge badge={readiness} />
              <div className="rounded-lg border border-line bg-paper px-4 py-2 text-right">
                <ScoreHelp
                  title="Target score"
                  display={`${scorecard.total}/100`}
                  lines={targetScorecardLines(scorecard)}
                  footnote={TARGET_SCORE_FOOTNOTE}
                  pillClassName="text-[22px] font-semibold tabular-nums text-ink cursor-help underline decoration-dotted decoration-ink-faint underline-offset-4"
                />
                <div className="text-[10px] uppercase tracking-[0.14em] text-ink-faint">Target priority</div>
              </div>
            </div>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            <ScorePart label="Market fit" value={scorecard.components.marketFit} max={20} />
            <ScorePart label="Ownership" value={scorecard.components.ownership} max={20} />
            <ScorePart label="Expert validation" value={scorecard.components.expertValidation} max={20} />
            <ScorePart label="Evidence" value={scorecard.components.evidence} max={15} />
            <ScorePart label="Scale" value={scorecard.components.scale} max={12} />
            <ScorePart label="TB path" value={scorecard.components.towerBrookPath} max={13} />
          </div>
          <div className="mt-4 rounded-md border border-line bg-[#fbfcff] p-3">
            <div className="ee-label text-ink-faint">Open risks / verification tasks</div>
            <ul className="mt-2 grid gap-1.5 text-[12px] text-ink-soft md:grid-cols-2">
              {scorecard.risks.map((risk) => <li key={risk}>• {risk}</li>)}
            </ul>
          </div>
        </section>

        <section className="mt-5 grid gap-5 md:grid-cols-3">
          <DecisionFact
            label="Investment case"
            title={company.category === "target" ? "Potential target" : COMPANY_CATEGORY_LABEL[company.category]}
            body={company.whyInteresting ?? company.description}
          />
          <DecisionFact
            label="First validation call"
            title={company.linkedExperts[0]?.expert.name ?? "No named expert mapped"}
            body={
              company.linkedExperts[0]
                ? `${RELATIONSHIP_LABEL[company.linkedExperts[0].relationship]} ${company.name}.`
                : "Find a named person before advancing the company."
            }
            href={company.linkedExperts[0] ? `/experts/${company.linkedExperts[0].expert.id}?company=${company.id}` : `/ask?company=${company.id}`}
          />
          <DecisionFact
            label="Most important gap"
            title={!company.ownershipStatus ? "Ownership" : !company.sizeBand && !company.funding ? "Scale and funding" : "Commercial diligence"}
            body={
              !company.ownershipStatus
                ? "Confirm whether the company is independent, sponsor-owned, acquired, or public."
                : !company.sizeBand && !company.funding
                  ? "Establish revenue scale, funding history, and ownership before prioritising outreach."
                  : "Validate customer urgency, budget ownership, margins, and likely acquirers."
            }
            href={`/ask?company=${company.id}&prompt=${encodeURIComponent(!company.ownershipStatus ? "Verify ownership" : !company.sizeBand && !company.funding ? "Verify scale and funding" : "Prepare commercial diligence questions")}`}
          />
        </section>

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <main className="min-w-0 space-y-5">
            {company.whyInteresting ? (
              <section className="ee-panel rounded-lg p-5">
                <div className="ee-label text-ink">Investment relevance</div>
                <p className="mt-3 text-[13px] leading-relaxed text-ink-soft">
                  {company.whyInteresting}
                </p>
              </section>
            ) : null}

            <section className="ee-panel overflow-hidden rounded-lg">
              <div className="border-b border-line px-4 py-3">
                <h2 className="ee-label text-ink">Experts connected to this company ({company.expertCount})</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="ee-table min-w-[860px]">
                  <thead>
                    <tr>
                      <th>Expert</th>
                      <th>Archetype</th>
                      <th>Relationship</th>
                      <th>Evidence</th>
                      <th>Evidence coverage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {company.linkedExperts.map((link) => (
                      <tr key={`${link.expert.id}-${link.relationship}`}>
                        <td>
                          <Link href={`/experts/${link.expert.id}`} className="ee-link">
                            {link.expert.name}
                          </Link>
                          <Link href={`/graph?focus=expert:${link.expert.id}`} className="ml-2 text-[11px] font-semibold text-accent">
                            View relationships
                          </Link>
                          <div className="mt-0.5 text-[11px] text-ink-faint">
                            {link.expert.headline}
                          </div>
                        </td>
                        <td>
                          <Badge className={EXPERT_TYPE_STYLE[link.expert.type]}>
                            {EXPERT_TYPE_LABEL[link.expert.type]}
                          </Badge>
                        </td>
                        <td>{RELATIONSHIP_LABEL[link.relationship]}</td>
                        <td className="max-w-[340px] text-[12px] text-ink-soft">
                          {link.note ?? link.expert.whyRelevant}
                        </td>
                        <td className="text-[11px] text-ink-soft">
                          {link.expert.sources.length} expert source{link.expert.sources.length === 1 ? "" : "s"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {company.news?.length ? (
              <section className="ee-panel rounded-lg p-5">
                <div className="mb-3 ee-label text-ink">In the news</div>
                <NewsFeed items={company.news} />
              </section>
            ) : null}

            {relatedDeals.length ? (
              <section className="ee-panel overflow-hidden rounded-lg">
                <div className="border-b border-line px-4 py-3">
                  <h2 className="ee-label text-ink">Related deals ({relatedDeals.length})</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="ee-table min-w-[780px]">
                    <thead>
                      <tr>
                        <th>Deal</th>
                        <th>Role</th>
                        <th>Type</th>
                        <th>Date</th>
                        <th>Completeness</th>
                      </tr>
                    </thead>
                    <tbody>
                      {relatedDeals.map((deal) => {
                        const role =
                          deal.parties.find((party) => party.companyId === company.id)?.role ??
                          deal.advisors.find((advisor) => advisor.companyId === company.id)?.role ??
                          "surfaced";
                        const counterparty =
                          primaryDealParty(deal, "buyer")?.name ??
                          primaryDealParty(deal, "investor")?.name ??
                          primaryDealParty(deal, "target")?.name;
                        return (
                          <tr key={deal.id}>
                            <td>
                              <Link href={`/deals/${deal.id}`} className="ee-link">
                                {deal.name}
                              </Link>
                              <div className="mt-0.5 text-[11px] text-ink-faint">
                                {counterparty}
                              </div>
                            </td>
                            <td>{role.replaceAll("-", " ")}</td>
                            <td>{DEAL_TYPE_LABEL[deal.dealType]}</td>
                            <td>{dealDate(deal) ?? "Missing"}</td>
                            <td>{deal.requiredFactsFound}/{deal.requiredFactsTotal} required facts</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            ) : null}

            {similar.length > 0 ? (
              <section className="ee-panel rounded-lg p-5">
                <div className="ee-label text-ink">Comparable companies</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {similar.map((item) => (
                    <Link
                      key={item.id}
                      href={`/companies/${item.id}`}
                      className="rounded-md border border-line bg-paper px-3 py-2 text-[12px] font-medium hover:border-line-strong"
                    >
                      {item.name}
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="ee-panel rounded-lg p-5">
              <div className="ee-label text-ink">Before this becomes a target</div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <CallPrepChecklist
                  title="Verify"
                  items={[
                    "Confirm ownership, scale and current strategic priorities.",
                    "Check whether expert evidence is first-hand or adjacent.",
                    "Identify any conflict from advisors, investors or sellers.",
                  ]}
                />
                <CallPrepChecklist
                  title="Ask experts"
                  items={[
                    "What customer pain makes this company durable?",
                    "Which competitors or substitutes should we map?",
                    "What diligence finding would change the investment case?",
                  ]}
                />
                <CallPrepChecklist
                  title="Decide"
                  items={[
                    "Promote to active target, comparable or advisor access point.",
                    "Add missing experts to the discovery queue.",
                    "Create memo notes only after source-backed verification.",
                  ]}
                />
              </div>
            </section>
          </main>

          <aside className="space-y-5">
            <section className="ee-panel rounded-lg p-5">
              <div className="ee-label text-ink">Relationship path</div>
              <div className="mt-3 text-[14px] font-semibold">
                {towerBrook.isDirect ? towerBrook.label : "Path not mapped"}
              </div>
              <ul className="mt-3 space-y-2 text-[12px] leading-relaxed text-ink-soft">
                {(towerBrook.isDirect && towerBrook.reasons.length
                  ? towerBrook.reasons
                  : ["Use the named experts below to validate the company and identify a public-source outreach path."]
                ).map((reason) => <li key={reason}>{reason}</li>)}
              </ul>
            </section>

            <section className="ee-panel rounded-lg p-5">
              <div className="ee-label text-ink">Company evidence</div>
              <div className="mt-4 rounded-lg border border-line bg-paper p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-semibold">Record confidence</span>
                  <span className="text-[18px] font-semibold tabular-nums">
                    {Math.round(company.confidence * 100)}%
                  </span>
                </div>
                <div className="mt-3"><Confidence value={company.confidence} /></div>
              </div>
              {company.website ? (
                <a
                  href={company.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ee-button ee-button-secondary mt-4 w-full"
                >
                  Open website
                </a>
              ) : null}
              <Link href={`/graph?focus=company:${company.id}`} className="ee-button ee-button-primary mt-3 w-full">
                View relationships
              </Link>
              <Link href={`/ask?company=${company.id}`} className="ee-button ee-button-secondary mt-3 w-full">
                Use in Copilot
              </Link>
            </section>

            <section className="ee-panel rounded-lg p-5" id="sources">
              <div className="mb-3 ee-label text-ink">Sources</div>
              <SourceLinks sources={company.sources} />
            </section>
          </aside>
        </div>
    </PageShell>
  );
}

function DecisionFact({
  label,
  title,
  body,
  href,
}: {
  label: string;
  title: string;
  body: string;
  href?: string;
}) {
  const content = (
    <>
      <div className="ee-label text-ink-faint">{label}</div>
      <div className="mt-2 text-[14px] font-semibold text-ink">{title}</div>
      <p className="mt-2 line-clamp-3 text-[12px] leading-relaxed text-ink-soft">{body}</p>
      {href ? <span className="mt-3 inline-flex text-[12px] font-semibold text-accent">Open →</span> : null}
    </>
  );

  return href ? (
    <Link href={href} className="ee-panel rounded-lg p-5 hover:border-line-strong">{content}</Link>
  ) : (
    <section className="ee-panel rounded-lg p-5">{content}</section>
  );
}


function ScorePart({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div className="rounded-md border border-line bg-white p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold text-ink">{label}</span>
        <span className="text-[11px] tabular-nums text-ink-faint">{value}/{max}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#edf1f7]">
        <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
