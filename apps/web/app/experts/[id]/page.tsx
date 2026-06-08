import { notFound } from "next/navigation";
import Link from "next/link";
import { getCompanies, getExperts, getExpert, resolveExpert } from "@/lib/data";
import { DEAL_TYPE_LABEL, dealDate } from "@/lib/deals";
import { listDealsForExpert } from "@/lib/deal-repository";
import ScoreHelp from "@/app/components/ScoreHelp";
import { RELEVANCE_SCORE_FOOTNOTE, relevanceScoreLines } from "@/lib/score-copy";
import { scoreExpert } from "@/lib/score";
import { towerBrookExpertScore } from "@/lib/towerbrook";
import { TOWERBROOK_SCORE_FOOTNOTE, towerBrookScoreLines } from "@/lib/target-score-copy";
import {
  warmPathsForExpert,
  warmPathStatusLabel,
  warmPathTone,
} from "@/lib/warm-paths";
import {
  EXPERT_TYPE_LABEL,
  EXPERT_TYPE_STYLE,
  RELATIONSHIP_LABEL,
} from "@/lib/labels";
import {
  Badge,
  BackLink,
  Chip,
  NewsFeed,
  PageShell,
  SourceLinks,
  ThemeTag,
} from "@/app/components/ui";
import ExpertActions from "@/app/components/ExpertActions";
import CallNotesPanel from "@/app/components/CallNotesPanel";
import { WorkspaceActionButton } from "@/app/components/InvestorWorkspaceTray";
import { expertReadiness } from "@/lib/investment-readiness";
import ReadinessBadge from "@/app/components/ReadinessBadge";
import { callObjective, expertCallAngle } from "@/lib/expert-copy";
import { outreachStorageKey } from "@/lib/outreach-plan";
import { getPageScope } from "@/lib/page-scope";
import ExpertOutreachPanel from "@/app/components/ExpertOutreachPanel";

export function generateStaticParams() {
  return getExperts().map((e) => ({ id: e.id }));
}

export default async function ExpertPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { themeFocus, includeTowerBrookEmployees } = await getPageScope();
  const base = getExpert(id);
  if (!base) notFound();
  const expert = resolveExpert(base);
  const outreachKey = outreachStorageKey(themeFocus, includeTowerBrookEmployees);
  const companiesById = new Map(getCompanies().map((company) => [company.id, company]));
  const towerBrook = towerBrookExpertScore(base, companiesById);
  const relevance = scoreExpert(base);
  const warmPaths = warmPathsForExpert(expert.id);
  const bestWarmPath = warmPaths[0] ?? null;
  const readiness = expertReadiness(expert);
  const relatedDeals = await listDealsForExpert(expert.id);
  return (
    <PageShell>
        <BackLink href="/experts">Back to call list</BackLink>

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
          <main className="min-w-0 space-y-5">
            <header className="ee-panel rounded-lg p-5">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-[28px] font-semibold tracking-tight">
                      {expert.name}
                    </h1>
                    <Badge className={EXPERT_TYPE_STYLE[expert.type]}>
                      {EXPERT_TYPE_LABEL[expert.type]}
                    </Badge>
                  </div>
                  <p className="mt-2 text-[15px] font-medium text-ink-soft">
                    {expert.headline}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-4 text-[13px] text-ink-faint">
                    {expert.org ? <span>{expert.org}</span> : null}
                    {expert.location ? <span>{expert.location}</span> : null}
                    <ReadinessBadge badge={readiness} compact />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {expert.themes.map((t) => (
                      <ThemeTag key={t} id={t} small />
                    ))}
                    {expert.specialties?.map((s) => (
                      <Chip key={s}>{s}</Chip>
                    ))}
                  </div>
                </div>
                <div className="w-full min-w-0 rounded-lg border border-line bg-[#fbfcff] p-4 lg:w-auto lg:min-w-[360px]">
                  <div className="ee-label text-ink">Next action</div>
                  <div className="mt-2 text-[15px] font-semibold text-ink">
                    Prepare a source-backed call with {expert.name.split(" ")[0]}
                  </div>
                  <p className="mt-2 text-[12px] leading-relaxed text-ink-soft">
                    {expert.resolvedCompanies.length} company edge{expert.resolvedCompanies.length === 1 ? "" : "s"},
                    {" "}{expert.sources.length} source record{expert.sources.length === 1 ? "" : "s"},
                    {" "}and {bestWarmPath ? warmPathStatusLabel(bestWarmPath.status).toLowerCase() : towerBrook.isDirect ? towerBrook.label : "no public TowerBrook path mapped"}.
                  </p>
                  <ul className="mt-3 space-y-1 text-[11px] leading-relaxed text-ink-faint">
                    {readiness.reasons.slice(0, 4).map((reason) => <li key={reason}>• {reason}</li>)}
                  </ul>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                    <a href="#call-actions" className="ee-button ee-button-primary min-h-8 px-3">
                      Prepare call
                    </a>
                    <WorkspaceActionButton
                      item={{
                        id: expert.id,
                        kind: "call",
                        name: expert.name,
                        sub: expert.headline,
                        href: `/experts/${expert.id}`,
                        theme: expert.themes[0],
                        note: expert.whyRelevant,
                      }}
                    >
                      Add to plan
                    </WorkspaceActionButton>
                    <Link href={`/graph?focus=expert:${expert.id}`} className="ee-button ee-button-secondary min-h-8 px-3">
                      View relationships
                    </Link>
                    <Link href={`/ask?expert=${expert.id}`} className="ee-button ee-button-secondary min-h-8 px-3">
                      Use in Copilot
                    </Link>
                    <Link href={`/reports?expert=${expert.id}`} className="ee-button ee-button-secondary min-h-8 px-3">
                      Use in report
                    </Link>
                  </div>
                </div>
              </div>
            </header>

            <section className="ee-panel rounded-lg">
              <div className="flex items-center justify-between border-b border-line px-4 py-3">
                <h2 className="ee-label text-ink">Why call {expert.name.split(" ")[0]}</h2>
                <a href="#sources" className="text-[12px] font-semibold text-accent">Review sources</a>
              </div>
              <div className="px-5 py-4">
                <ul className="space-y-2 text-[13px] leading-relaxed text-ink">
                  <li className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-ink" />
                    <span>{expertCallAngle(expert)}</span>
                  </li>
                  {expert.bio ? (
                    <li className="flex gap-3">
                      <span className="mt-2 h-1.5 w-1.5 rounded-full bg-ink" />
                      <span>{expert.bio}</span>
                    </li>
                  ) : null}
                  {expert.signals?.slice(0, 2).map((signal) => (
                    <li key={signal} className="flex gap-3">
                      <span className="mt-2 h-1.5 w-1.5 rounded-full bg-success" />
                      <span>{signal}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            <section className="ee-panel overflow-hidden rounded-lg">
              <div className="border-b border-line px-4 py-3">
                <h2 className="ee-label text-ink">What to listen for</h2>
              </div>
              <div className="grid gap-3 p-4 lg:grid-cols-3">
                {callListeningPrompts(expert).map((item) => (
                  <article key={item.claim} className="rounded-md border border-line bg-white p-3">
                    <div className="text-[12px] font-semibold leading-snug text-ink">
                      {item.claim}
                    </div>
                    <div className="mt-3 space-y-2 text-[11px] leading-relaxed text-ink-soft">
                      <p>
                        <span className="font-semibold text-emerald-700">Raises conviction:</span>{" "}
                        {item.raises}
                      </p>
                      <p>
                        <span className="font-semibold text-amber-700">Reduces conviction:</span>{" "}
                        {item.reduces}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="ee-panel overflow-hidden rounded-lg">
              <div className="border-b border-line px-4 py-3">
                <h2 className="ee-label text-ink">Company / deal connections ({expert.resolvedCompanies.length})</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="ee-table min-w-[760px]">
                  <thead>
                    <tr>
                      <th>Company / deal</th>
                      <th>Relationship</th>
                      <th>Evidence</th>
                      <th>Evidence coverage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expert.resolvedCompanies.map((rc) => (
                      <tr key={`${rc.company.id}-${rc.relationship}`}>
                        <td>
                          <Link href={`/companies/${rc.company.id}`} className="ee-link">
                            {rc.company.name}
                          </Link>
                          <Link href={`/graph?focus=company:${rc.company.id}`} className="ml-2 text-[11px] font-semibold text-accent">
                            View relationships
                          </Link>
                          <div className="mt-0.5 text-[11px] text-ink-faint">
                            {rc.company.category}
                          </div>
                        </td>
                        <td>{RELATIONSHIP_LABEL[rc.relationship]}</td>
                        <td className="max-w-[320px] text-[12px] text-ink-soft">
                          {rc.note ?? rc.company.whyInteresting ?? rc.company.description}
                        </td>
                        <td className="text-[11px] text-ink-soft">
                          {rc.company.sources.length} company source{rc.company.sources.length === 1 ? "" : "s"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {expert.news?.length ? (
              <section className="ee-panel rounded-lg p-5">
                <div className="mb-3 ee-label text-ink">News & momentum signals</div>
                <NewsFeed items={expert.news} />
              </section>
            ) : null}

            {relatedDeals.length ? (
              <section className="ee-panel overflow-hidden rounded-lg">
                <div className="border-b border-line px-4 py-3">
                  <h2 className="ee-label text-ink">Deal involvement ({relatedDeals.length})</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="ee-table min-w-[840px]">
                    <thead>
                      <tr>
                        <th>Deal</th>
                        <th>Role</th>
                        <th>Type</th>
                        <th>Date</th>
                        <th>Why call</th>
                      </tr>
                    </thead>
                    <tbody>
                      {relatedDeals.map((deal) => {
                        const partyRole =
                          deal.parties.find((party) => party.personId === expert.id)?.role ??
                          "surfaced expert";
                        return (
                          <tr key={deal.id}>
                            <td>
                              <Link href={`/deals/${deal.id}`} className="ee-link">
                                {deal.name}
                              </Link>
                              <div className="mt-0.5 text-[11px] text-ink-faint">
                                Completeness {Math.round(deal.completionScore * 100)}%
                              </div>
                            </td>
                            <td>{partyRole.replaceAll("-", " ")}</td>
                            <td>{DEAL_TYPE_LABEL[deal.dealType]}</td>
                            <td>{dealDate(deal) ?? "Missing"}</td>
                            <td className="max-w-[360px] text-[12px] leading-relaxed text-ink-soft">
                              Ask who advised the deal, what diligence mattered, and which similar companies should be mapped next.
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            ) : null}

          </main>

          <aside className="space-y-5 xl:sticky xl:top-20 xl:self-start">
            <section className="ee-panel rounded-lg p-5">
              <div className="ee-label text-ink">Trust dossier</div>
              <div className="mt-3 flex flex-wrap gap-2">
                <ReadinessBadge badge={readiness} />
                <ScoreHelp
                  title="Relevance score"
                  display={`Score ${relevance.total}`}
                  lines={relevanceScoreLines(relevance)}
                  footnote={RELEVANCE_SCORE_FOOTNOTE}
                  compact
                />
                <span className="rounded-full border border-line bg-paper px-2.5 py-1 text-[11px] font-semibold text-ink-soft">
                  {Math.round(expert.confidence * 100)}% profile confidence
                </span>
              </div>
              <ul className="mt-3 space-y-2 text-[12px] leading-relaxed text-ink-soft">
                {readiness.reasons.map((reason) => <li key={reason}>• {reason}</li>)}
              </ul>
            </section>
            <section className="ee-panel rounded-lg p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="ee-label text-ink">TowerBrook warm path</div>
                {bestWarmPath ? (
                  <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${warmPathTone(bestWarmPath.status)}`}>
                    {warmPathStatusLabel(bestWarmPath.status)}
                  </span>
                ) : null}
              </div>
              {bestWarmPath ? (
                <div className="mt-3 space-y-4">
                  <div>
                    <div className="text-[14px] font-semibold text-ink">
                      {bestWarmPath.intro_route}
                    </div>
                    <div className="mt-1 text-[11px] text-ink-faint">
                      Strength {bestWarmPath.strength}/100 · Confidence {Math.round(bestWarmPath.confidence * 100)}%
                    </div>
                  </div>
                  <p className="text-[12px] leading-relaxed text-ink-soft">
                    {bestWarmPath.recommended_intro}
                  </p>
                  <div>
                    <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
                      Path
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {bestWarmPath.path_nodes.map((node, index) => (
                        <span key={`${node}-${index}`} className="contents">
                          <span className="rounded border border-line bg-white px-2 py-1 text-[11px] text-ink-soft">
                            {node}
                          </span>
                          {index < bestWarmPath.path_nodes.length - 1 ? (
                            <span className="text-[11px] text-ink-faint">-&gt;</span>
                          ) : null}
                        </span>
                      ))}
                    </div>
                  </div>
                  <p className="border-t border-line pt-3 text-[12px] leading-relaxed text-ink-soft">
                    {bestWarmPath.evidence}
                  </p>
                  <div className="space-y-1">
                    {bestWarmPath.sources.slice(0, 3).map((source) => (
                      <a
                        key={`${source.title}-${source.url}`}
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block truncate text-[12px] font-semibold text-accent"
                      >
                        {source.title}
                      </a>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <ScoreHelp
                      title="TowerBrook relationship"
                      display={
                        towerBrook.isDirect
                          ? `${towerBrook.score} · ${towerBrook.label}`
                          : "No public path"
                      }
                      lines={towerBrookScoreLines(towerBrook)}
                      footnote={TOWERBROOK_SCORE_FOOTNOTE}
                      pillClassName="text-[14px] font-semibold text-ink cursor-help underline decoration-dotted decoration-ink-faint underline-offset-2"
                    />
                  </div>
                  <ul className="mt-3 space-y-2 text-[12px] leading-relaxed text-ink-soft">
                    {(towerBrook.isDirect && towerBrook.reasons.length
                      ? towerBrook.reasons
                      : ["Use sourced outreach or verify an introduction path through public deal evidence."]
                    ).map((reason) => <li key={reason}>{reason}</li>)}
                  </ul>
                </>
              )}
            </section>
            <ExpertOutreachPanel
              expertId={expert.id}
              expertName={expert.name}
              storageKey={outreachKey}
              defaultObjective={callObjective(expert)}
            />
            <CallNotesPanel expertId={expert.id} expertName={expert.name} />
            <div id="call-actions">
              <ExpertActions expertId={expert.id} expertName={expert.name} />
            </div>
            <section className="ee-panel rounded-lg p-5" id="sources">
              <div className="mb-3 ee-label text-ink">Sources used</div>
              <SourceLinks sources={expert.sources} />
            </section>
          </aside>
        </div>
    </PageShell>
  );
}

function callListeningPrompts(expert: ReturnType<typeof resolveExpert>) {
  const firstCompany = expert.resolvedCompanies[0]?.company.name ?? "their strongest mapped company";
  const specialty = expert.specialties?.[0]?.toLowerCase() ?? "the market";

  const base = [
    {
      claim: `${expert.name.split(" ")[0]} can validate whether ${specialty} demand is investable now.`,
      raises:
        "They name specific buyers, budgets, procurement blockers, or recent projects from first-hand work.",
      reduces:
        "They stay at market-level commentary and cannot name companies, customers, advisers, or implementation constraints.",
    },
    {
      claim: `${firstCompany} is useful because it is tied to sourced expert evidence.`,
      raises:
        "The call confirms current ownership, growth, customer traction, and a reachable decision-maker or adviser path.",
      reduces:
        "The company edge is stale, the ownership has changed, or the relationship is too distant for access.",
    },
  ];

  if (expert.type === "banker" || expert.type === "lawyer" || expert.type === "advisor") {
    return [
      ...base,
      {
        claim: "The adviser network can reveal live transaction angles.",
        raises:
          "They identify active processes, likely buyers, counsel, valuation pressure, or conflicts that shape access.",
        reduces:
          "They only discuss historical transactions and cannot say who controls current conversations.",
      },
    ];
  }

  if (expert.type === "ex-founder" || expert.type === "operator") {
    return [
      ...base,
      {
        claim: "The operating evidence can separate product pull from sector hype.",
        raises:
          "They quantify adoption friction, sales cycles, unit economics, and the conditions that changed customer behavior.",
        reduces:
          "They describe a compelling product but cannot show repeatable buyer urgency or implementation economics.",
      },
    ];
  }

  return [
    ...base,
    {
      claim: "The call should convert coverage into named next steps.",
      raises:
        "They provide two named referrals, a company to validate, and a specific source or deal record to check.",
      reduces:
        "The discussion ends with broad themes and no named follow-up path.",
    },
  ];
}
