import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const root = process.cwd();
const deals = readJson("data/deals.json");
const companies = readJson("data/companies.json");
const experts = readJson("data/experts.json");

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceKey) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const entityIds = new Map();
const sourceIds = new Map();

for (const company of companies) {
  const id = await upsertEntity("company", company.id, company.name, company.themes, {
    category: company.category,
    description: company.description,
  });
  entityIds.set(`company:${company.id}`, id);
}

for (const expert of experts) {
  const id = await upsertEntity("person", expert.id, expert.name, expert.themes, {
    headline: expert.headline,
    type: expert.type,
  });
  entityIds.set(`person:${expert.id}`, id);
}

for (const deal of deals) {
  const sourceIdByLabel = new Map();
  for (const [index, source] of deal.sources.entries()) {
    const externalId = `${deal.id}:source:${index + 1}`;
    const sourceId = await upsertSource(externalId, source, "curated_seed", {
      dealExternalId: deal.id,
      theme: deal.theme,
    });
    sourceIds.set(externalId, sourceId);
    if (deal.sourceIds?.[index]) sourceIdByLabel.set(deal.sourceIds[index], sourceId);
    await persistChunks(sourceId, source.title, {
      dealExternalId: deal.id,
      dealName: deal.name,
      theme: deal.theme,
    });
  }

  const targetEntityId = deal.targetCompanyId ? entityIds.get(`company:${deal.targetCompanyId}`) : null;
  const buyerEntityId = deal.buyerCompanyId ? entityIds.get(`company:${deal.buyerCompanyId}`) : null;
  const investorEntityId = deal.investorCompanyId ? entityIds.get(`company:${deal.investorCompanyId}`) : null;
  const sellerEntityId = deal.sellerCompanyId ? entityIds.get(`company:${deal.sellerCompanyId}`) : null;
  const metadata = {
    targetCompanyId: deal.targetCompanyId,
    buyerCompanyId: deal.buyerCompanyId,
    investorCompanyId: deal.investorCompanyId,
    sellerCompanyId: deal.sellerCompanyId,
    companiesSurfaced: deal.companiesSurfaced ?? [],
    expertsSurfaced: deal.expertsSurfaced ?? [],
    comparableDealIds: deal.comparableDealIds ?? [],
  };

  const { data: dealRow, error: dealError } = await supabase
    .from("deals")
    .upsert(
      {
        external_id: deal.id,
        name: deal.name,
        theme: deal.theme,
        geography: deal.geography,
        status: deal.status,
        deal_type: deal.dealType,
        announcement_date: deal.announcementDate ?? null,
        completion_date: deal.completionDate ?? null,
        target_entity_id: targetEntityId,
        buyer_entity_id: buyerEntityId,
        investor_entity_id: investorEntityId,
        seller_entity_id: sellerEntityId,
        investment_relevance: deal.investmentRelevance,
        strategic_rationale: deal.strategicRationale ?? null,
        completion_score: completionScore(deal),
        confidence: deal.confidence,
        missing_facts: deal.missingFacts ?? [],
        follow_up_searches: deal.followUpSearches ?? [],
        metadata,
      },
      { onConflict: "external_id" },
    )
    .select("id")
    .single();
  if (dealError) throw dealError;

  const dealUuid = dealRow.id;
  await Promise.all([
    supabase.from("deal_parties").delete().eq("deal_id", dealUuid),
    supabase.from("deal_advisors").delete().eq("deal_id", dealUuid),
    supabase.from("deal_facts").delete().eq("deal_id", dealUuid),
    supabase.from("deal_fact_conflicts").delete().eq("deal_id", dealUuid),
    supabase.from("graph_edges").delete().eq("deal_id", dealUuid),
  ]);

  for (const party of deal.parties ?? []) {
    const entityId = party.companyId
      ? entityIds.get(`company:${party.companyId}`)
      : party.personId
        ? entityIds.get(`person:${party.personId}`)
        : await upsertEntity(entityTypeForParty(party.role), slug(party.name), party.name, [deal.theme], {});
    await insert("deal_parties", {
      deal_id: dealUuid,
      role: party.role,
      entity_id: entityId,
      name: party.name,
      note: party.note ?? null,
      source_id: sourceIdByLabel.get(party.sourceId) ?? firstValue(sourceIdByLabel) ?? null,
    });
    if (entityId) {
      await insert("graph_edges", {
        from_entity_id: entityId,
        to_entity_id: await upsertEntity("deal", deal.id, deal.name, [deal.theme], {}),
        deal_id: dealUuid,
        relationship_type: party.role,
        source_id: sourceIdByLabel.get(party.sourceId) ?? firstValue(sourceIdByLabel) ?? null,
        evidence_text: party.note ?? deal.investmentRelevance,
        confidence: deal.confidence,
      });
    }
  }

  for (const advisor of deal.advisors ?? []) {
    const entityId = advisor.companyId
      ? entityIds.get(`company:${advisor.companyId}`)
      : await upsertEntity(advisor.role.startsWith("legal-counsel") ? "law_firm" : "bank", slug(advisor.name), advisor.name, [deal.theme], {});
    await insert("deal_advisors", {
      deal_id: dealUuid,
      role: advisor.role,
      entity_id: entityId,
      name: advisor.name,
      note: advisor.note ?? null,
      source_id: sourceIdByLabel.get(advisor.sourceId) ?? firstValue(sourceIdByLabel) ?? null,
    });
  }

  for (const fact of deal.facts ?? []) {
    await insert("deal_facts", {
      deal_id: dealUuid,
      fact_type: fact.factType,
      fact_value: fact.factValue,
      normalized_value: fact.normalizedValue ?? null,
      source_id: sourceIdByLabel.get(fact.sourceId) ?? firstValue(sourceIdByLabel) ?? null,
      evidence_text: fact.evidenceText ?? null,
      confidence: fact.confidence,
      extraction_method: fact.extractionMethod,
      review_status: fact.reviewStatus,
    });
  }

  for (const conflict of deal.contradictoryFacts ?? []) {
    await insert("deal_fact_conflicts", {
      deal_id: dealUuid,
      fact_type: conflict.factType,
      values: conflict.values,
      note: conflict.note,
    });
  }
}

console.log(`Seeded ${companies.length} companies, ${experts.length} experts and ${deals.length} deals.`);

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

async function upsertEntity(entityType, externalId, name, themeIds, metadata) {
  const { data, error } = await supabase
    .from("graph_entities")
    .upsert(
      {
        entity_type: entityType,
        external_id: externalId,
        name,
        theme_ids: themeIds ?? [],
        metadata: metadata ?? {},
      },
      { onConflict: "entity_type,external_id" },
    )
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

async function upsertSource(externalId, source, sourceType, metadata) {
  const { data, error } = await supabase
    .from("sources")
    .upsert(
      {
        external_id: externalId,
        title: source.title,
        url: source.url ?? null,
        publisher: source.publisher ?? null,
        source_type: sourceType,
        metadata,
      },
      { onConflict: "external_id" },
    )
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

async function persistChunks(sourceId, text, metadata) {
  await supabase.from("source_chunks").delete().eq("source_id", sourceId);
  const chunks = chunkText(text);
  const rows = [];
  for (const content of chunks) {
    rows.push({
      source_id: sourceId,
      content,
      token_count: Math.ceil(content.length / 4),
      embedding: process.env.OPENAI_API_KEY ? await embed(content) : null,
      metadata,
    });
  }
  if (!rows.length) return;
  const { error } = await supabase.from("source_chunks").insert(rows);
  if (error) throw error;
}

async function insert(table, row) {
  const { error } = await supabase.from(table).insert(row);
  if (error) throw error;
}

async function embed(input) {
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small",
      input,
      dimensions: 1536,
    }),
  });
  if (!response.ok) throw new Error(await response.text());
  const data = await response.json();
  return data.data[0].embedding;
}

function chunkText(text) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  if (clean.length <= 1800) return [clean];
  const chunks = [];
  for (let i = 0; i < clean.length; i += 1600) chunks.push(clean.slice(i, i + 1800));
  return chunks;
}

function completionScore(deal) {
  const found = [
    deal.parties?.some((party) => party.role === "target"),
    deal.parties?.some((party) => party.role === "buyer" || party.role === "investor"),
    deal.dealType,
    deal.announcementDate || deal.completionDate,
    deal.theme,
    deal.sources?.length,
    (deal.parties?.length ?? 0) + (deal.advisors?.length ?? 0) > 1,
    deal.investmentRelevance,
  ].filter(Boolean).length;
  return found / 8;
}

function entityTypeForParty(role) {
  if (role === "management" || role === "board") return "person";
  if (role === "investor" || role === "co-investor" || role === "existing-shareholder") return "fund";
  return "company";
}

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

function firstValue(map) {
  for (const value of map.values()) return value;
  return undefined;
}
