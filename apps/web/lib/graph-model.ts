import type {
  ExplorerCompanyNode,
  ExplorerDealNode,
  ExplorerEdge,
  ExplorerExpertNode,
  ExplorerSource,
  ExplorerTheme,
} from "@/lib/graph-types";
import { getCompanies, getExperts } from "@/lib/data";
import { DEAL_ADVISOR_LABEL, DEAL_TYPE_LABEL } from "@/lib/deals";
import { listDeals } from "@/lib/deal-repository";
import { filterTowerBrookEmployees } from "@/lib/employee-scope";
import {
  buildCompanyCanonicalMap,
  canonicalCompanyId,
  canonicalCompanyRecords,
  collapseEndpointEdges,
  normalizeExpertCompanyLinks,
} from "@/lib/graph-normalize";
import {
  COMPANY_CATEGORY_LABEL,
  EXPERT_TYPE_LABEL,
  RELATIONSHIP_LABEL,
} from "@/lib/labels";
import { THEMES } from "@/lib/themes";
import type { Company, Deal, Expert, RelationshipType, Source } from "@/lib/types";

function sourceKey(source: Source) {
  return source.url || `${source.publisher ?? "source"}:${source.title}`;
}

function sourceLabel(source: Source) {
  return source.publisher ? `${source.publisher} · ${source.title}` : source.title;
}

function buildSourceRegister(experts: Expert[], companies: Company[], deals: Deal[]) {
  const ids = new Map<string, string>();
  const sources: ExplorerSource[] = [];

  function add(source: Source) {
    const key = sourceKey(source);
    const existing = ids.get(key);
    if (existing) return existing;

    const id = String(sources.length + 1);
    ids.set(key, id);
    sources.push({
      id,
      title: source.title,
      url: source.url,
      publisher: source.publisher,
      label: sourceLabel(source),
    });
    return id;
  }

  for (const expert of experts) {
    for (const source of expert.sources) add(source);
  }
  for (const company of companies) {
    for (const source of company.sources) add(source);
  }
  for (const deal of deals) {
    for (const source of deal.sources) add(source);
  }

  return { add, sources };
}

export interface GraphModel {
  experts: ExplorerExpertNode[];
  companies: ExplorerCompanyNode[];
  deals: ExplorerDealNode[];
  edges: ExplorerEdge[];
  sources: ExplorerSource[];
  themes: ExplorerTheme[];
  canonicalMap: Map<string, string>;
}

export async function buildGraphModel(includeTowerBrookEmployees: boolean): Promise<GraphModel> {
  const experts = filterTowerBrookEmployees(getExperts(), includeTowerBrookEmployees);
  const allCompanies = getCompanies();
  const canonicalMap = buildCompanyCanonicalMap(allCompanies);
  const companies = canonicalCompanyRecords(allCompanies, canonicalMap);
  const deals = await listDeals();
  const companyById = new Map(companies.map((company) => [company.id, company]));
  const expertById = new Map(experts.map((expert) => [expert.id, expert]));
  const { add, sources } = buildSourceRegister(experts, companies, deals);

  const expertNodes: ExplorerExpertNode[] = experts.map((expert) => ({
    key: `expert:${expert.id}`,
    id: expert.id,
    kind: "expert",
    name: expert.name,
    subtitle: expert.headline,
    type: expert.type,
    typeLabel: EXPERT_TYPE_LABEL[expert.type],
    org: expert.org,
    location: expert.location,
    themes: expert.themes,
    tags: expert.specialties ?? [],
    confidence: expert.confidence,
    href: `/experts/${expert.id}`,
    sourceIds: expert.sources.map(add),
    evidence:
      expert.whyRelevant ||
      expert.bio ||
      `${expert.name} has ${expert.companies.length} mapped relationship${
        expert.companies.length === 1 ? "" : "s"
      }.`,
  }));

  const companyNodes: ExplorerCompanyNode[] = companies.map((company) => ({
    key: `company:${company.id}`,
    id: company.id,
    kind: "company",
    name: company.name,
    subtitle: company.whyInteresting ?? company.description,
    category: company.category,
    categoryLabel: COMPANY_CATEGORY_LABEL[company.category],
    themes: company.themes,
    tags: company.specialties ?? [],
    confidence: company.confidence,
    href: `/companies/${company.id}`,
    sourceIds: company.sources.map(add),
    evidence:
      company.whyInteresting ||
      `${company.name} surfaced from mapped expert relationships and source-backed company records.`,
  }));

  const dealNodes: ExplorerDealNode[] = deals.map((deal) => ({
    key: `deal:${deal.id}`,
    id: deal.id,
    kind: "deal",
    name: deal.name,
    subtitle: deal.investmentRelevance,
    typeLabel: DEAL_TYPE_LABEL[deal.dealType],
    themes: [deal.theme],
    tags: [DEAL_TYPE_LABEL[deal.dealType], deal.status, deal.geography],
    confidence: deal.confidence,
    href: `/deals/${deal.id}`,
    sourceIds: deal.sources.map(add),
    evidence: deal.investmentRelevance,
  }));

  const expertCompanyEdges: ExplorerEdge[] = normalizeExpertCompanyLinks(experts, canonicalMap)
    .map((link) => {
      const expert = expertById.get(link.expertId);
      const company = companyById.get(link.companyId);
      if (!expert || !company) return null;

      const relationshipLabel = RELATIONSHIP_LABEL[link.relationship];
      const edgeSourceIds = [...expert.sources, ...company.sources].map(add);
      return {
        id: `${link.expertId}:${link.companyId}:${link.relationship}`,
        from: `expert:${link.expertId}`,
        to: `company:${link.companyId}`,
        relationship: link.relationship,
        relationshipLabel,
        note:
          link.note ??
          `${expert.name} ${relationshipLabel} ${company.name}.`,
        themes: expert.themes.filter((theme) => company.themes.includes(theme)),
        confidence: Math.min(expert.confidence, company.confidence),
        sourceIds: Array.from(new Set(edgeSourceIds)),
      };
    })
    .filter((edge): edge is ExplorerEdge => edge !== null);

  const dealEdges: ExplorerEdge[] = deals.flatMap((deal) => {
    const baseSourceIds = deal.sources.map(add);
    const partyEdges = deal.parties.flatMap((party, index) => {
      const companyId =
        party.companyId && companyById.has(canonicalCompanyId(party.companyId, canonicalMap))
          ? canonicalCompanyId(party.companyId, canonicalMap)
          : undefined;
      const to = companyId
        ? `company:${companyId}`
        : party.personId && expertById.has(party.personId)
          ? `expert:${party.personId}`
          : undefined;
      if (!to) return [];
      const relationship: RelationshipType =
        party.role === "buyer" || party.role === "investor"
          ? "acquired"
          : party.role === "management" || party.role === "board"
            ? "served"
            : "advised";
      return [
        {
          id: `${deal.id}:party:${party.role}:${party.name}:${index}`,
          from: `deal:${deal.id}`,
          to,
          relationship,
          relationshipLabel: party.role.replaceAll("-", " "),
          note: party.note ?? `${party.name} is ${party.role.replaceAll("-", " ")} on ${deal.name}.`,
          themes: [deal.theme],
          confidence: deal.confidence,
          sourceIds: baseSourceIds,
        },
      ];
    });

    const advisorEdges = deal.advisors.flatMap((advisor, index) => {
      if (!advisor.companyId) return [];
      const companyId = canonicalCompanyId(advisor.companyId, canonicalMap);
      if (!companyById.has(companyId)) return [];
      const relationship: RelationshipType = advisor.role.startsWith("legal-counsel")
        ? "legal-counsel"
        : "banked";
      return [
        {
          id: `${deal.id}:advisor:${advisor.role}:${advisor.name}:${index}`,
          from: `company:${companyId}`,
          to: `deal:${deal.id}`,
          relationship,
          relationshipLabel: DEAL_ADVISOR_LABEL[advisor.role],
          note: advisor.note ?? `${advisor.name} served as ${DEAL_ADVISOR_LABEL[advisor.role]} on ${deal.name}.`,
          themes: [deal.theme],
          confidence: deal.confidence,
          sourceIds: baseSourceIds,
        },
      ];
    });

    return [...partyEdges, ...advisorEdges];
  });

  const edges = collapseEndpointEdges([...expertCompanyEdges, ...dealEdges]);
  const themes: ExplorerTheme[] = [
    { id: "all", name: "All themes", shortName: "All" },
    ...THEMES.map((theme) => ({
      id: theme.id,
      name: theme.name,
      shortName: theme.shortName,
    })),
  ];

  return {
    experts: expertNodes,
    companies: companyNodes,
    deals: dealNodes,
    edges,
    sources,
    themes,
    canonicalMap,
  };
}
