import seedSourcesRaw from "@/data/sources.json";
import { companiesWithLinks, expertsForTheme, getExperts, themeStats } from "@/lib/data";
import { DEAL_TYPE_LABEL, dealDate } from "@/lib/deals";
import { listDeals } from "@/lib/deal-repository";
import { rankExperts } from "@/lib/score";
import { getTheme } from "@/lib/themes";
import type { CompanyWithLinks, Expert, Source, ThemeId } from "@/lib/types";
import type { ThemeFocus } from "@/lib/theme-focus";
import { filterTowerBrookEmployees } from "@/lib/employee-scope";
import { expertsPageHref } from "@/lib/experts-url";
import { bestWarmPathForExpert } from "@/lib/warm-paths";

export type ReportTemplateId =
  | "theme-memo"
  | "expert-call-plan"
  | "company-brief"
  | "deal-brief"
  | "deal-relationship-map"
  | "red-team-thesis"
  | "ic-appendix";

export interface ReportTemplate {
  id: ReportTemplateId;
  name: string;
  description: string;
  sections: string[];
}

export interface ReportSource {
  id: string;
  ref: number;
  title: string;
  publisher: string;
  date: string;
  type: string;
  url: string;
  confidence: number;
  entities: string[];
  citedIn: string[];
}

export interface ReportSection {
  id: string;
  order: number;
  title: string;
  status: "Evidence-backed draft" | "Ready for analyst review" | "Needs source confirmation";
  confidence: number;
  wordCount: number;
  citations: string[];
  summary: string;
  bullets?: string[];
  rows?: {
    label: string;
    value: string;
    detail: string;
    metric?: string;
    citations: string[];
    href?: string;
    signals?: { label: string; value: string | number }[];
    metricTone?: "strong" | "developing" | "thin";
  }[];
  headlineStats?: { label: string; value: string | number; tone?: "strong" | "watch" | "neutral" }[];
  viewMoreHref?: string;
  viewMoreLabel?: string;
  actions: string[];
}

export interface ReportModel {
  reportName: string;
  themeName: string;
  themeHref: string;
  templateId: ReportTemplateId;
  generatedAt: string;
  wordCount: number;
  stats: {
    experts: number;
    companies: number;
    sources: number;
    highConfidenceSources: number;
  };
  templates: ReportTemplate[];
  savedReports: { name: string; updated: string; status: string }[];
  sections: ReportSection[];
  sources: ReportSource[];
  markdown: string;
}

type SeedSource = {
  source_id: string;
  theme: ThemeId | "all";
  url: string;
  source_type: string;
  publisher: string;
  date: string;
  why_useful: string;
  expected_entities: string[];
  priority: number;
  status: string;
};

type SeedSourcesFile = {
  sources: SeedSource[];
};

export const REPORT_TEMPLATES: ReportTemplate[] = [
  {
    id: "theme-memo",
    name: "Theme memo",
    description: "Thesis, market map, experts",
    sections: [
      "Executive summary",
      "Market map",
      "Priority experts",
      "Company longlist",
      "Deal / advisor activity",
      "Key risks",
      "Next actions",
    ],
  },
  {
    id: "expert-call-plan",
    name: "Expert call plan",
    description: "Call plan and questions",
    sections: [
      "Call objective",
      "Sequenced experts",
      "Questions to ask",
      "What to listen for",
      "Follow-up paths",
    ],
  },
  {
    id: "company-brief",
    name: "Company brief",
    description: "Company, market, risks",
    sections: [
      "Company snapshot",
      "Why surfaced",
      "Linked experts",
      "Ownership and maturity",
      "Diligence questions",
    ],
  },
  {
    id: "deal-brief",
    name: "Deal brief",
    description: "Parties, facts, gaps",
    sections: [
      "Deal scorecard",
      "Parties and advisors",
      "Fact rubric",
      "Investment relevance",
      "Missing facts",
      "Follow-up searches",
    ],
  },
  {
    id: "deal-relationship-map",
    name: "Deal relationship map",
    description: "People, firms, paths",
    sections: [
      "Deal node",
      "Buyer and target",
      "Advisors and counsel",
      "Experts surfaced",
      "Source evidence",
      "Next calls",
    ],
  },
  {
    id: "red-team-thesis",
    name: "Red-team thesis",
    description: "Contrarian view and risks",
    sections: [
      "Downside case",
      "Disconfirming evidence",
      "Competitive pressure",
      "Policy and timing risk",
      "Kill criteria",
    ],
  },
  {
    id: "ic-appendix",
    name: "IC appendix",
    description: "Data room for IC",
    sections: [
      "Source register",
      "Expert roster",
      "Company register",
      "Entity-edge evidence",
      "Confidence notes",
    ],
  },
];

const REPORT_DATE = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/London",
}).format(new Date());

export async function buildReport(
  themeId: ThemeFocus = "all",
  includeTowerBrookEmployees = false,
): Promise<ReportModel> {
  const theme =
    themeId === "all"
      ? {
          name: "All Investment Themes",
          shortName: "All Themes",
        }
      : getTheme(themeId);
  if (!theme) throw new Error(`Unknown theme: ${themeId}`);

  const experts = filterTowerBrookEmployees(
    themeId === "all" ? getExperts() : expertsForTheme(themeId),
    includeTowerBrookEmployees,
  );
  const rankedExperts = rankExperts(experts).slice(0, 6);
  const companies = companiesWithLinks(
    themeId === "all" ? undefined : themeId,
    includeTowerBrookEmployees,
  );
  const deals = (await listDeals()).filter((deal) => themeId === "all" || deal.theme === themeId);
  const stats =
    themeId === "all"
      ? { expertCount: experts.length, companyCount: companies.length }
      : themeStats(themeId, includeTowerBrookEmployees);
  const sources = buildSourceRegister(themeId, rankedExperts.map((r) => r.expert), companies, deals);

  const sourceIds = {
    primary: sources.slice(0, 4).map((s) => s.id),
    expert: sources.filter((s) => s.type === "Expert profile").slice(0, 4).map((s) => s.id),
    company: sources.filter((s) => s.type === "Company source").slice(0, 4).map((s) => s.id),
    register: sources.filter((s) => s.type !== "Expert profile").slice(0, 5).map((s) => s.id),
    deals: sources.filter((s) => s.type === "Deal fact").slice(0, 5).map((s) => s.id),
  };

  const topExperts = rankedExperts.map(({ expert }) => ({ expert }));
  const topCompanies = companies.slice(0, 8);
  const topDeals = deals.slice(0, 5);
  const specialties = topSpecialties(experts, companies);
  const clusterStats = specialties.map((specialty) =>
    specialtyClusterStats(experts, companies, specialty),
  );
  const warmClusterCount = clusterStats.filter((cluster) => cluster.warmPathCount > 0).length;
  const thinClusterCount = clusterStats.filter((cluster) => cluster.tier === "thin").length;

  const sections: ReportSection[] = [
    {
      id: "executive-summary",
      order: 1,
      title: "Executive summary",
      status: "Evidence-backed draft",
      confidence: averageConfidence([...topExperts.map((e) => e.expert), ...topCompanies]),
      wordCount: 412,
      citations: sourceIds.primary,
      summary: `${theme.name} has ${stats.expertCount} mapped experts and ${stats.companyCount} derived companies. The investable angle is strongest where expert density, recent signals, and specialist company edges overlap.`,
      bullets: [
        `${topExperts[0]?.expert.name ?? "The first expert"} is the first call because their role and mapped company relationships directly address the theme.`,
        `${topCompanies[0]?.name ?? "The leading company"} is the highest-density company surfaced by the current graph.`,
        `Current source coverage is strongest across ${specialties.slice(0, 3).join(", ")}.`,
      ],
      actions: ["Prepare partner readout", "Open evidence"],
    },
    {
      id: "market-map",
      order: 2,
      title: "Market map",
      status: "Evidence-backed draft",
      confidence: 0.84,
      wordCount: 1024,
      citations: sourceIds.register,
      summary: `${specialties.length} specialty clusters are mapped across ${stats.expertCount} experts and ${stats.companyCount} companies. Strongest density sits in ${specialties.slice(0, 3).join(", ")}; thin areas need primary calls before treating the graph as complete.`,
      headlineStats: [
        { label: "Clusters tracked", value: specialties.length, tone: "neutral" },
        { label: "Warm-path clusters", value: warmClusterCount, tone: warmClusterCount > 0 ? "strong" : "watch" },
        { label: "Thin coverage", value: thinClusterCount, tone: thinClusterCount > 2 ? "watch" : "neutral" },
      ],
      bullets: [
        `${clusterStats[0]?.topExpert?.name ?? "The lead expert"} is the highest-signal entry point for ${clusterStats[0]?.specialty ?? "the top cluster"}.`,
        `${warmClusterCount} cluster${warmClusterCount === 1 ? "" : "s"} include TowerBrook warm-path connectors for faster outreach.`,
        thinClusterCount > 0
          ? `${thinClusterCount} cluster${thinClusterCount === 1 ? "" : "s"} have thin expert + company density — validate before sizing the market.`
          : "No cluster is flagged as thin on current graph density.",
      ],
      rows: clusterStats.slice(0, 8).map((cluster) => ({
        label: cluster.specialty,
        value: `${cluster.expertCount} expert${cluster.expertCount === 1 ? "" : "s"} · ${cluster.companyCount} compan${cluster.companyCount === 1 ? "y" : "ies"}`,
        detail: cluster.implication,
        metric: cluster.tierLabel,
        metricTone: cluster.tier,
        signals: [
          { label: "Experts", value: cluster.expertCount },
          { label: "Companies", value: cluster.companyCount },
          { label: "Warm paths", value: cluster.warmPathCount },
          { label: "Sources", value: cluster.sourceCount },
        ],
        href: expertsPageHref({
          theme: themeId === "all" ? undefined : themeId,
          specialty: cluster.specialty,
        }),
        citations: sourceIds.register.slice(0, 2),
      })),
      viewMoreHref: expertsPageHref({ theme: themeId === "all" ? undefined : themeId }),
      viewMoreLabel: "View full call list by cluster",
      actions: ["Review coverage gaps", "Open evidence"],
    },
    {
      id: "priority-experts",
      order: 3,
      title: "Priority experts",
      status: "Evidence-backed draft",
      confidence: averageConfidence(topExperts.map((e) => e.expert)),
      wordCount: 1312,
      citations: sourceIds.expert,
      summary: "Priority experts are sequenced for a first diligence pass. Open each profile to verify the public relationship path and supporting sources before outreach.",
      rows: topExperts.slice(0, 5).map(({ expert }) => ({
        label: expert.name,
        value: expert.headline,
        detail: expert.whyRelevant,
        metric: `${expert.sources.length} source${expert.sources.length === 1 ? "" : "s"}`,
        citations: citationIdsForEntity(sources, expert.name),
      })),
      actions: ["Build call plan", "Open evidence"],
    },
    {
      id: "company-longlist",
      order: 4,
      title: "Company longlist",
      status: "Evidence-backed draft",
      confidence: averageConfidence(topCompanies),
      wordCount: 1648,
      citations: sourceIds.company,
      summary: `${topCompanies.length} companies are prioritized by expert density first and source confidence second. The list is intended as a diligence starting point, not a market census.`,
      rows: topCompanies.slice(0, 6).map((company) => ({
        label: company.name,
        value: company.stage ?? company.category,
        detail: company.whyInteresting ?? company.description,
        metric: `${company.expertCount} experts`,
        citations: citationIdsForEntity(sources, company.name),
      })),
      actions: ["Export longlist", "Open evidence"],
    },
    {
      id: "deal-advisor-activity",
      order: 5,
      title: "Deal / advisor activity",
      status: "Ready for analyst review",
      confidence: topDeals.length ? averageConfidence(topDeals) : 0.78,
      wordCount: 842,
      citations: sourceIds.deals.length ? sourceIds.deals : sourceIds.register,
      summary: topDeals.length
        ? `${topDeals.length} source-backed deal records are mapped for this theme. Use the missing-fact checklist to prioritize advisor, counsel, valuation and completion-date follow-up.`
        : "Advisor activity is concentrated in bankers, lawyers, investors, and service providers with explicit company edges. This section should be analyst-reviewed before IC circulation.",
      rows: topDeals.length ? dealRows(topDeals, sources) : advisorRows(experts, sources),
      actions: ["Check advisors", "Open evidence"],
    },
    {
      id: "key-risks",
      order: 6,
      title: "Key risks",
      status: "Needs source confirmation",
      confidence: 0.69,
      wordCount: 612,
      citations: sourceIds.register.slice(1, 5),
      summary: "The main risk is over-reading a sourced people graph as a complete market map. Coverage gaps, stale ownership data, and survivorship bias should be tested in primary calls.",
      bullets: [
        "Thin subsegments may reflect ingestion gaps rather than unattractive markets.",
        "Company ownership and funding status can change faster than the seed register.",
        "Expert confidence is record-level confidence, not endorsement of the investment thesis.",
      ],
      actions: ["Red-team", "Open evidence"],
    },
    {
      id: "next-actions",
      order: 7,
      title: "Next actions",
      status: "Evidence-backed draft",
      confidence: 0.82,
      wordCount: 368,
      citations: sourceIds.primary.slice(0, 3),
      summary: "The next step is a short call sequence that tests bottlenecks, company quality, and the highest-uncertainty assumptions before expanding the source set.",
      bullets: [
        `Call ${topExperts[0]?.expert.name ?? "the top-ranked expert"} and ${topExperts[1]?.expert.name ?? "the second-ranked expert"} this week.`,
        `Deep dive on ${topCompanies[0]?.name ?? "the highest-density company"} and two adjacent comparables.`,
        "Add analyst notes back to the source register after each call.",
      ],
      actions: ["Prepare call sequence", "Copy markdown"],
    },
  ];

  const citedSources = applyCitedIn(sources, sections);
  const wordCount = sections.reduce((sum, section) => sum + section.wordCount, 0);
  const report: Omit<ReportModel, "markdown"> = {
    reportName: `${theme.shortName} - Partner Memo`,
    themeName: theme.name,
    themeHref: themeId === "all" ? "/" : `/themes/${themeId}`,
    templateId: "theme-memo",
    generatedAt: REPORT_DATE,
    wordCount,
    stats: {
      experts: stats.expertCount,
      companies: stats.companyCount,
      sources: citedSources.length,
      highConfidenceSources: citedSources.filter((source) => source.confidence >= 0.82).length,
    },
    templates: REPORT_TEMPLATES,
    savedReports: [],
    sections,
    sources: citedSources,
  };

  return {
    ...report,
    markdown: buildMarkdown(report),
  };
}

function buildSourceRegister(
  themeId: ThemeFocus,
  rankedExperts: Expert[],
  companies: CompanyWithLinks[],
  deals: Awaited<ReturnType<typeof listDeals>>,
): ReportSource[] {
  const rawSources = seedSourcesRaw as SeedSourcesFile;
  const byKey = new Map<string, Omit<ReportSource, "ref">>();

  const add = (source: Omit<ReportSource, "id" | "ref" | "citedIn">) => {
    const key = source.url || source.title;
    if (byKey.has(key)) return;
    const id = `src-${byKey.size + 1}`;
    byKey.set(key, { ...source, id, citedIn: [] });
  };

  for (const expert of rankedExperts) {
    for (const source of expert.sources) {
      add(entitySource(source, "Expert profile", expert.confidence, [
        expert.name,
        expert.org ?? expert.type,
      ]));
    }
  }

  for (const company of companies.slice(0, 10)) {
    for (const source of company.sources) {
      add(entitySource(source, "Company source", company.confidence, [
        company.name,
        company.category,
      ]));
    }
  }

  for (const deal of deals) {
    for (const source of deal.sources) {
      add(entitySource(source, "Deal fact", deal.confidence, [
        deal.name,
        DEAL_TYPE_LABEL[deal.dealType],
        ...deal.companiesSurfaced,
      ]));
    }
  }

  for (const source of rawSources.sources) {
    if (
      (themeId === "all" || source.theme === themeId || source.theme === "all") &&
      source.priority <= 2
    ) {
      add({
        title: source.why_useful,
        publisher: source.publisher,
        date: source.date,
        type: sourceTypeLabel(source.source_type),
        url: source.url,
        confidence: source.status === "done" ? 0.86 : source.priority === 1 ? 0.8 : 0.72,
        entities: source.expected_entities,
      });
    }
  }

  return [...byKey.values()].map((source, index) => ({
    ...source,
    ref: index + 1,
  }));
}

function entitySource(
  source: Source,
  type: string,
  confidence: number,
  entities: string[],
): Omit<ReportSource, "id" | "ref" | "citedIn"> {
  return {
    title: source.title,
    publisher: source.publisher ?? "Source",
    date: "Verified seed",
    type,
    url: source.url,
    confidence,
    entities: entities.filter(Boolean),
  };
}

function sourceTypeLabel(type: string): string {
  return type
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function topSpecialties(experts: Expert[], companies: CompanyWithLinks[]): string[] {
  const counts = new Map<string, number>();
  for (const expert of experts) {
    for (const specialty of expert.specialties ?? []) {
      counts.set(specialty, (counts.get(specialty) ?? 0) + 2);
    }
  }
  for (const company of companies) {
    for (const specialty of company.specialties ?? []) {
      counts.set(specialty, (counts.get(specialty) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([specialty]) => specialty);
}

type SpecialtyClusterStats = {
  specialty: string;
  expertCount: number;
  companyCount: number;
  warmPathCount: number;
  sourceCount: number;
  topExpert?: Expert;
  topCompany?: CompanyWithLinks;
  tier: "strong" | "developing" | "thin";
  tierLabel: string;
  implication: string;
};

function specialtyClusterStats(
  experts: Expert[],
  companies: CompanyWithLinks[],
  specialty: string,
): SpecialtyClusterStats {
  const clusterExperts = experts.filter((expert) => expert.specialties?.includes(specialty));
  const clusterCompanies = companies.filter((company) => company.specialties?.includes(specialty));
  const warmPathCount = clusterExperts.filter((expert) => bestWarmPathForExpert(expert.id)).length;
  const sourceCount =
    clusterExperts.reduce((sum, expert) => sum + expert.sources.length, 0) +
    clusterCompanies.reduce((sum, company) => sum + company.sources.length, 0);
  const topExpert = rankExperts(clusterExperts)[0]?.expert;
  const topCompany = clusterCompanies[0];

  const tier =
    (clusterExperts.length >= 3 && clusterCompanies.length >= 2) ||
    warmPathCount >= 2 ||
    clusterExperts.length + clusterCompanies.length >= 8
      ? "strong"
      : clusterExperts.length >= 2 || clusterCompanies.length >= 2 || warmPathCount >= 1
        ? "developing"
        : "thin";

  const tierLabel =
    tier === "strong" ? "Strong" : tier === "developing" ? "Developing" : "Thin";

  const leads = [
    topExpert ? `Lead expert: ${topExpert.name}` : null,
    topCompany ? `Lead company: ${topCompany.name}` : null,
  ].filter(Boolean);

  const implication =
    tier === "strong"
      ? `${leads.join(" · ") || "Multiple mapped entities"}. Enough density for immediate diligence calls.`
      : tier === "developing"
        ? `${leads.join(" · ") || "Early coverage"}. Validate with 1–2 primary calls before expanding the longlist.`
        : `${leads.join(" · ") || "Sparse graph coverage"}. Treat as a watchlist until more experts or companies are ingested.`;

  return {
    specialty,
    expertCount: clusterExperts.length,
    companyCount: clusterCompanies.length,
    warmPathCount,
    sourceCount,
    topExpert,
    topCompany,
    tier,
    tierLabel,
    implication,
  };
}

function averageConfidence(items: { confidence: number }[]): number {
  if (items.length === 0) return 0.7;
  return Number(
    (items.reduce((sum, item) => sum + item.confidence, 0) / items.length).toFixed(2),
  );
}

function citationIdsForEntity(sources: ReportSource[], entity: string): string[] {
  const matches = sources
    .filter((source) => source.entities.some((value) => value === entity))
    .slice(0, 3)
    .map((source) => source.id);
  return matches.length ? matches : sources.slice(0, 2).map((source) => source.id);
}

function advisorRows(experts: Expert[], sources: ReportSource[]): ReportSection["rows"] {
  const advisors = experts
    .filter((expert) =>
      [
        "advisor",
        "strategy-consultant",
        "commercial-dd",
        "technical-dd",
        "engineering-consultant",
        "regulatory-policy",
        "banker",
        "lawyer",
        "investor",
        "service-provider",
      ].includes(expert.type),
    )
    .slice(0, 5);

  return advisors.map((expert) => ({
    label: expert.name,
    value: expert.headline,
    detail: expert.companies
      .slice(0, 2)
      .map((company) => `${company.relationship}${company.note ? `: ${company.note}` : ""}`)
      .join(" | "),
    metric: expert.type,
    citations: citationIdsForEntity(sources, expert.name),
  }));
}

function dealRows(deals: Awaited<ReturnType<typeof listDeals>>, sources: ReportSource[]): ReportSection["rows"] {
  return deals.map((deal) => ({
    label: deal.name,
    value: `${DEAL_TYPE_LABEL[deal.dealType]}${dealDate(deal) ? ` / ${dealDate(deal)}` : ""}`,
    detail: `${deal.investmentRelevance} Missing: ${
      deal.missingFacts.slice(0, 3).map((item) => item.replaceAll("_", " ")).join(", ") || "none flagged"
    }.`,
    metric: `${Math.round(deal.completionScore * 100)}% complete`,
    citations: citationIdsForEntity(sources, deal.name),
  }));
}

function applyCitedIn(sources: ReportSource[], sections: ReportSection[]): ReportSource[] {
  return sources.map((source) => ({
    ...source,
    citedIn: sections
      .filter((section) => section.citations.includes(source.id))
      .map((section) => section.title),
  }));
}

function buildMarkdown(report: Omit<ReportModel, "markdown">): string {
  const lines = [
    `# ${report.reportName}`,
    "",
    `Drafted: ${report.generatedAt}`,
    `Theme: ${report.themeName}`,
    "",
  ];

  for (const section of report.sections) {
    lines.push(`## ${section.order}. ${section.title}`);
    lines.push(`Status: ${section.status} | Confidence: ${Math.round(section.confidence * 100)}%`);
    lines.push("");
    lines.push(withMarkers(section.summary, section.citations, report.sources));
    if (section.bullets?.length) {
      for (const bullet of section.bullets) lines.push(`- ${bullet}`);
    }
    if (section.rows?.length) {
      for (const row of section.rows) {
        lines.push(
          `- ${row.label}: ${row.value}. ${row.detail} ${
            row.metric ? `(${row.metric})` : ""
          } ${markerList(row.citations, report.sources)}`.trim(),
        );
      }
    }
    lines.push("");
  }

  lines.push("## Source register");
  for (const source of report.sources) {
    lines.push(
      `[${source.ref}] ${source.title} - ${source.publisher}, ${source.date}. ${source.url}`,
    );
  }

  return lines.join("\n");
}

function withMarkers(text: string, citations: string[], sources: ReportSource[]): string {
  return `${text} ${markerList(citations, sources)}`.trim();
}

function markerList(citations: string[], sources: ReportSource[]): string {
  const refs = citations
    .map((id) => sources.find((source) => source.id === id)?.ref)
    .filter((ref): ref is number => Boolean(ref));
  return refs.map((ref) => `[${ref}]`).join("");
}
