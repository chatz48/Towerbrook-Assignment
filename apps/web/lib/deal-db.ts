import { getSupabaseServiceClient, hasSupabaseConfig } from "./supabase";
import { chunkText, embedText, estimateTokenCount, hasEmbeddingConfig } from "./embeddings";
import {
  averageConfidence,
  extractDealFromText,
  scoreDeal,
  type DealExtractionResult,
} from "./deals";
import type {
  Deal,
  DealAdvisor,
  DealFact,
  DealParty,
  DealWithScore,
  Source,
  ThemeId,
} from "./types";

type Json = Record<string, unknown>;

type DealRow = {
  id: string;
  external_id: string | null;
  name: string;
  theme: ThemeId;
  geography: string;
  status: Deal["status"];
  deal_type: Deal["dealType"];
  announcement_date: string | null;
  completion_date: string | null;
  investment_relevance: string;
  strategic_rationale: string | null;
  confidence: number;
  completion_score: number;
  missing_facts: string[] | null;
  follow_up_searches: string[] | null;
  metadata: Json;
};

type SourceRow = {
  id: string;
  title: string;
  url: string | null;
  publisher: string | null;
};

type EntityRow = {
  id: string;
  entity_type: string;
  external_id: string | null;
  name: string;
};

type PartyRow = {
  role: DealParty["role"];
  name: string;
  note: string | null;
  source_id: string | null;
  graph_entities?: EntityRow | EntityRow[] | null;
};

type AdvisorRow = {
  role: DealAdvisor["role"];
  name: string;
  note: string | null;
  source_id: string | null;
  graph_entities?: EntityRow | EntityRow[] | null;
};

type FactRow = {
  id: string;
  deal_id: string;
  fact_type: string;
  fact_value: string;
  normalized_value: string | null;
  source_id: string | null;
  evidence_chunk_id: string | null;
  evidence_text: string | null;
  confidence: number;
  extraction_method: DealFact["extractionMethod"];
  review_status: DealFact["reviewStatus"];
};

type ConflictRow = {
  fact_type: string;
  values: string[];
  note: string;
};

export function hasDealDatabase(): boolean {
  return hasSupabaseConfig();
}

export async function listDbDeals(): Promise<DealWithScore[]> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("deals")
    .select("*")
    .order("completion_date", { ascending: false, nullsFirst: false })
    .order("announcement_date", { ascending: false, nullsFirst: false });

  if (error) throw new Error(error.message);
  const deals = await Promise.all((data as DealRow[]).map((row) => loadDealByRow(row)));
  return deals.sort(
    (a, b) =>
      (b.completionDate ?? b.announcementDate ?? "").localeCompare(
        a.completionDate ?? a.announcementDate ?? "",
      ) || b.completionScore - a.completionScore,
  );
}

export async function getDbDeal(id: string): Promise<DealWithScore | undefined> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("deals")
    .select("*")
    .eq("external_id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? loadDealByRow(data as DealRow) : undefined;
}

export async function dbDealsForCompany(companyId: string): Promise<DealWithScore[]> {
  const deals = await listDbDeals();
  return deals.filter(
    (deal) =>
      deal.targetCompanyId === companyId ||
      deal.buyerCompanyId === companyId ||
      deal.investorCompanyId === companyId ||
      deal.sellerCompanyId === companyId ||
      deal.companiesSurfaced.includes(companyId) ||
      deal.parties.some((party) => party.companyId === companyId) ||
      deal.advisors.some((advisor) => advisor.companyId === companyId),
  );
}

export async function dbDealsForExpert(expertId: string): Promise<DealWithScore[]> {
  const deals = await listDbDeals();
  return deals.filter(
    (deal) =>
      deal.expertsSurfaced.includes(expertId) ||
      deal.parties.some((party) => party.personId === expertId),
  );
}

export async function getDbDealCoverageByCompany(): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  for (const deal of await listDbDeals()) {
    for (const companyId of new Set(deal.companiesSurfaced)) {
      counts.set(companyId, (counts.get(companyId) ?? 0) + 1);
    }
  }
  return counts;
}

async function loadDealByRow(row: DealRow): Promise<DealWithScore> {
  const supabase = getSupabaseServiceClient();
  const [partiesResult, advisorsResult, factsResult, conflictsResult] = await Promise.all([
    supabase
      .from("deal_parties")
      .select("role,name,note,source_id,graph_entities(id,entity_type,external_id,name)")
      .eq("deal_id", row.id),
    supabase
      .from("deal_advisors")
      .select("role,name,note,source_id,graph_entities(id,entity_type,external_id,name)")
      .eq("deal_id", row.id),
    supabase.from("deal_facts").select("*").eq("deal_id", row.id),
    supabase.from("deal_fact_conflicts").select("fact_type,values,note").eq("deal_id", row.id),
  ]);

  for (const result of [partiesResult, advisorsResult, factsResult, conflictsResult]) {
    if (result.error) throw new Error(result.error.message);
  }

  const sourceIds = new Set<string>();
  const partyRows = (partiesResult.data ?? []) as unknown as PartyRow[];
  const advisorRows = (advisorsResult.data ?? []) as unknown as AdvisorRow[];
  for (const party of partyRows) if (party.source_id) sourceIds.add(party.source_id);
  for (const advisor of advisorRows) if (advisor.source_id) sourceIds.add(advisor.source_id);
  for (const fact of (factsResult.data ?? []) as FactRow[]) if (fact.source_id) sourceIds.add(fact.source_id);

  const sources = await loadSources([...sourceIds]);
  const parties = partyRows.map(mapParty);
  const advisors = advisorRows.map(mapAdvisor);
  const facts = ((factsResult.data ?? []) as FactRow[]).map(mapFact);
  const metadata = row.metadata ?? {};
  const deal: Deal = {
    id: row.external_id ?? row.id,
    name: row.name,
    theme: row.theme,
    geography: row.geography,
    status: row.status,
    dealType: row.deal_type,
    announcementDate: row.announcement_date ?? undefined,
    completionDate: row.completion_date ?? undefined,
    targetCompanyId: stringValue(metadata.targetCompanyId),
    buyerCompanyId: stringValue(metadata.buyerCompanyId),
    investorCompanyId: stringValue(metadata.investorCompanyId),
    sellerCompanyId: stringValue(metadata.sellerCompanyId),
    parties,
    advisors,
    facts,
    sourceIds: [...sourceIds],
    sources,
    investmentRelevance: row.investment_relevance,
    strategicRationale: row.strategic_rationale ?? undefined,
    companiesSurfaced: stringArray(metadata.companiesSurfaced),
    expertsSurfaced: stringArray(metadata.expertsSurfaced),
    comparableDealIds: stringArray(metadata.comparableDealIds),
    missingFacts: row.missing_facts ?? [],
    contradictoryFacts: ((conflictsResult.data ?? []) as ConflictRow[]).map((conflict) => ({
      factType: conflict.fact_type,
      values: conflict.values,
      note: conflict.note,
    })),
    followUpSearches: row.follow_up_searches ?? [],
    confidence: row.confidence,
  };

  return scoreDeal(deal);
}

async function loadSources(ids: string[]): Promise<Source[]> {
  if (!ids.length) return [];
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase.from("sources").select("id,title,url,publisher").in("id", ids);
  if (error) throw new Error(error.message);
  return ((data ?? []) as SourceRow[]).map((source) => ({
    title: source.title,
    url: source.url ?? "",
    publisher: source.publisher ?? undefined,
  }));
}

function mapParty(row: PartyRow): DealParty {
  const entity = normalizeEntity(row.graph_entities);
  return {
    role: row.role,
    name: row.name,
    companyId: entity?.entity_type === "company" ? entity.external_id ?? undefined : undefined,
    personId: entity?.entity_type === "person" ? entity.external_id ?? undefined : undefined,
    note: row.note ?? undefined,
    sourceId: row.source_id ?? undefined,
  };
}

function mapAdvisor(row: AdvisorRow): DealAdvisor {
  const entity = normalizeEntity(row.graph_entities);
  return {
    role: row.role,
    name: row.name,
    companyId: entity?.external_id ?? undefined,
    note: row.note ?? undefined,
    sourceId: row.source_id ?? undefined,
  };
}

function normalizeEntity(value: EntityRow | EntityRow[] | null | undefined): EntityRow | undefined {
  return Array.isArray(value) ? value[0] : value ?? undefined;
}

function mapFact(row: FactRow): DealFact {
  return {
    id: row.id,
    dealId: row.deal_id,
    factType: row.fact_type,
    factValue: row.fact_value,
    normalizedValue: row.normalized_value ?? undefined,
    sourceId: row.source_id ?? undefined,
    evidenceChunkId: row.evidence_chunk_id ?? undefined,
    evidenceText: row.evidence_text ?? undefined,
    confidence: row.confidence,
    extractionMethod: row.extraction_method,
    reviewStatus: row.review_status,
  };
}

export async function persistDealIngestion(input: {
  text: string;
  title?: string;
  url?: string;
  extraction?: DealExtractionResult;
}): Promise<DealExtractionResult & { persisted: true; dealId: string }> {
  const supabase = getSupabaseServiceClient();
  const extraction = input.extraction ?? extractDealFromText(input);
  const deal = extraction.deal;
  const source = deal.sources[0] ?? {
    title: input.title ?? deal.name,
    url: input.url ?? "user-submitted-text",
    publisher: input.url ? new URL(input.url).hostname.replace(/^www\./, "") : "User submitted",
  };

  const sourceId = await upsertSource({
    title: source.title,
    url: source.url,
    publisher: source.publisher,
    sourceType: "submitted",
    rawText: input.text,
    metadata: { dealName: deal.name },
  });
  const firstChunkId = await persistSourceChunks(sourceId, input.text, {
    dealName: deal.name,
    theme: deal.theme,
  });

  const parties = await Promise.all(
    deal.parties.map(async (party) => ({
      ...party,
      entityId: await upsertEntity(entityTypeForParty(party.role), party.name, party.companyId ?? party.personId, [deal.theme]),
    })),
  );
  const advisors = await Promise.all(
    deal.advisors.map(async (advisor) => ({
      ...advisor,
      entityId: await upsertEntity(advisor.role.startsWith("legal-counsel") ? "law_firm" : "bank", advisor.name, advisor.companyId, [deal.theme]),
    })),
  );

  const externalId = uniqueSlug(deal.name);
  const metadata = {
    targetCompanyId: deal.targetCompanyId,
    buyerCompanyId: deal.buyerCompanyId,
    investorCompanyId: deal.investorCompanyId,
    sellerCompanyId: deal.sellerCompanyId,
    companiesSurfaced: deal.companiesSurfaced,
    expertsSurfaced: deal.expertsSurfaced,
    comparableDealIds: deal.comparableDealIds ?? [],
  };

  const { data: dealRow, error: dealError } = await supabase
    .from("deals")
    .upsert(
      {
        external_id: externalId,
        name: deal.name,
        theme: deal.theme,
        geography: deal.geography,
        status: deal.status,
        deal_type: deal.dealType,
        announcement_date: deal.announcementDate ?? null,
        completion_date: deal.completionDate ?? null,
        investment_relevance: deal.investmentRelevance,
        strategic_rationale: deal.strategicRationale ?? null,
        confidence: deal.confidence,
        completion_score: deal.completionScore,
        missing_facts: deal.missingFacts,
        follow_up_searches: deal.followUpSearches,
        metadata,
      },
      { onConflict: "external_id" },
    )
    .select("id")
    .single();

  if (dealError) throw new Error(dealError.message);
  const dealId = dealRow.id as string;

  await Promise.all([
    supabase.from("deal_parties").delete().eq("deal_id", dealId),
    supabase.from("deal_advisors").delete().eq("deal_id", dealId),
    supabase.from("deal_facts").delete().eq("deal_id", dealId),
    supabase.from("graph_edges").delete().eq("deal_id", dealId),
  ]);

  if (parties.length) {
    const { error } = await supabase.from("deal_parties").insert(
      parties.map((party) => ({
        deal_id: dealId,
        role: party.role,
        entity_id: party.entityId,
        name: party.name,
        note: party.note ?? null,
        source_id: sourceId,
      })),
    );
    if (error) throw new Error(error.message);
  }

  if (advisors.length) {
    const { error } = await supabase.from("deal_advisors").insert(
      advisors.map((advisor) => ({
        deal_id: dealId,
        role: advisor.role,
        entity_id: advisor.entityId,
        name: advisor.name,
        note: advisor.note ?? null,
        source_id: sourceId,
      })),
    );
    if (error) throw new Error(error.message);
  }

  if (extraction.facts.length) {
    const { error } = await supabase.from("deal_facts").insert(
      extraction.facts.map((fact) => ({
        deal_id: dealId,
        fact_type: fact.factType,
        fact_value: fact.factValue,
        normalized_value: fact.normalizedValue ?? null,
        source_id: sourceId,
        evidence_chunk_id: firstChunkId,
        evidence_text: fact.evidenceText ?? input.text.slice(0, 360),
        confidence: fact.confidence,
        extraction_method: fact.extractionMethod,
        review_status: fact.reviewStatus,
      })),
    );
    if (error) throw new Error(error.message);
  }

  await persistGraphEdges(dealId, sourceId, parties, advisors, deal.confidence, input.text.slice(0, 360));

  return {
    ...extraction,
    deal: { ...deal, id: externalId },
    persisted: true,
    dealId: externalId,
  };
}

export async function upsertSource(input: {
  title: string;
  url?: string;
  publisher?: string;
  sourceType: string;
  rawText?: string;
  metadata?: Json;
}): Promise<string> {
  const supabase = getSupabaseServiceClient();
  const externalId = input.url || uniqueSlug(input.title);
  const { data, error } = await supabase
    .from("sources")
    .upsert(
      {
        external_id: externalId,
        title: input.title,
        url: input.url ?? null,
        publisher: input.publisher ?? null,
        source_type: input.sourceType,
        raw_text: input.rawText ?? null,
        metadata: input.metadata ?? {},
      },
      { onConflict: "external_id" },
    )
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function persistSourceChunks(
  sourceId: string,
  text: string,
  metadata: Json = {},
): Promise<string | undefined> {
  const supabase = getSupabaseServiceClient();
  const chunks = chunkText(text);
  if (!chunks.length) return undefined;

  await supabase.from("source_chunks").delete().eq("source_id", sourceId);
  const rows = [];
  for (const content of chunks) {
    rows.push({
      source_id: sourceId,
      content,
      token_count: estimateTokenCount(content),
      embedding: hasEmbeddingConfig() ? await embedText(content) : null,
      metadata,
    });
  }

  const { data, error } = await supabase.from("source_chunks").insert(rows).select("id").limit(1);
  if (error) throw new Error(error.message);
  return data?.[0]?.id as string | undefined;
}

export async function upsertEntity(
  entityType: string,
  name: string,
  externalId?: string,
  themeIds: ThemeId[] = [],
): Promise<string> {
  const supabase = getSupabaseServiceClient();
  const id = externalId ?? uniqueSlug(name);
  const { data, error } = await supabase
    .from("graph_entities")
    .upsert(
      {
        entity_type: entityType,
        external_id: id,
        name,
        theme_ids: themeIds,
        metadata: {},
      },
      { onConflict: "entity_type,external_id" },
    )
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

async function persistGraphEdges(
  dealId: string,
  sourceId: string,
  parties: (DealParty & { entityId: string })[],
  advisors: (DealAdvisor & { entityId: string })[],
  confidence: number,
  evidenceText: string,
) {
  const supabase = getSupabaseServiceClient();
  const dealEntityId = await upsertEntity("deal", dealId, dealId);
  const rows = [
    ...parties.map((party) => ({
      from_entity_id: dealEntityId,
      to_entity_id: party.entityId,
      deal_id: dealId,
      relationship_type: party.role,
      source_id: sourceId,
      evidence_text: evidenceText,
      confidence,
    })),
    ...advisors.map((advisor) => ({
      from_entity_id: advisor.entityId,
      to_entity_id: dealEntityId,
      deal_id: dealId,
      relationship_type: advisor.role.startsWith("legal-counsel") ? "legal_counsel_on" : "advised_on",
      source_id: sourceId,
      evidence_text: evidenceText,
      confidence,
    })),
  ];

  if (!rows.length) return;
  const { error } = await supabase.from("graph_edges").insert(rows);
  if (error) throw new Error(error.message);
}

export async function retrieveSourceChunks(query: string, matchCount = 8, filter: Json = {}) {
  if (!hasEmbeddingConfig()) return [];
  const supabase = getSupabaseServiceClient();
  const embedding = await embedText(query);
  const { data, error } = await supabase.rpc("match_source_chunks", {
    query_embedding: embedding,
    match_count: matchCount,
    filter,
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as {
    chunk_id: string;
    source_id: string;
    content: string;
    title: string;
    url: string | null;
    publisher: string | null;
    metadata: Json;
    similarity: number;
  }[];
}

function entityTypeForParty(role: DealParty["role"]): string {
  if (role === "management" || role === "board") return "person";
  if (role === "investor" || role === "co-investor" || role === "existing-shareholder") return "fund";
  return "company";
}

function uniqueSlug(value: string): string {
  const base = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  return `${base || "deal"}-${Date.now().toString(36)}`;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export function confidenceFromFacts(facts: DealFact[]): number {
  return Number(averageConfidence(facts).toFixed(2));
}
