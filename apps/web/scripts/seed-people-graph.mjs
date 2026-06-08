import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

loadEnv(path.join(process.cwd(), "..", "..", ".env"));

const experts = readJson("data/experts.json");
const companies = readJson("data/companies.json");
const sourceRegister = readJson("data/source-register.json");

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceKey) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const MODEL = process.env.BGE_MODEL ?? "BAAI/bge-small-en-v1.5";
const SEEDED_BY = "seed-people-graph";

await clearGeneratedRows();

const companyIds = new Map();
for (const company of companies) {
  const row = await upsert("companies", {
    external_id: company.id,
    name: company.name,
    category: normalizeCategory(company.category),
    theme_ids: company.themes ?? [],
    specialties: company.specialties ?? [],
    website: company.website ?? null,
    hq: company.hq ?? null,
    description: company.description ?? null,
    why_interesting: company.whyInteresting ?? null,
    ownership_status: company.ownershipStatus ?? null,
    owner: company.owner ?? null,
    stage: company.stage ?? null,
    size_band: company.sizeBand ?? null,
    relevance_score: scoreCompany(company),
    momentum_score: scoreMomentum(company),
    confidence: company.confidence ?? 0.7,
    metadata: {
      seeded_by: SEEDED_BY,
      funding: company.funding,
      similarCompanyIds: company.similarCompanyIds ?? [],
      news: company.news ?? [],
    },
  }, "external_id");
  companyIds.set(company.id, row.id);
  await persistSourcesAndChunks(`company:${company.id}`, company.sources ?? [], company.themes ?? [], {
    company_id: row.id,
    company_name: company.name,
  });
  await upsertEntityEmbedding("company", row.id, companyProfile(company));
}

const personIds = new Map();
for (const expert of experts) {
  const row = await upsert("people", {
    external_id: expert.id,
    name: expert.name,
    headline: expert.headline ?? null,
    current_organization: expert.org ?? null,
    location: expert.location ?? null,
    expert_type: normalizeExpertType(expert.type),
    theme_ids: expert.themes ?? [],
    specialties: expert.specialties ?? [],
    linkedin_url: expert.linkedin ?? null,
    summary: expert.bio ?? null,
    why_relevant: expert.whyRelevant ?? null,
    relevance_score: scoreExpert(expert),
    momentum_score: scoreMomentum(expert),
    confidence: expert.confidence ?? 0.7,
    metadata: {
      seeded_by: SEEDED_BY,
      access: expert.access,
      signals: expert.signals ?? [],
      news: expert.news ?? [],
    },
  }, "external_id");
  personIds.set(expert.id, row.id);
  await persistSourcesAndChunks(`person:${expert.id}`, expert.sources ?? [], expert.themes ?? [], {
    person_id: row.id,
    person_name: expert.name,
  });
  await upsertEntityEmbedding("person", row.id, expertProfile(expert));
}

let relationshipCount = 0;
for (const expert of experts) {
  const fromId = personIds.get(expert.id);
  for (const link of expert.companies ?? []) {
    const toId = companyIds.get(link.companyId);
    if (!fromId || !toId) continue;
    const source = expert.sources?.[0] ?? companies.find((company) => company.id === link.companyId)?.sources?.[0];
    const sourceId = source ? await upsertSource(`relationship:${expert.id}:${link.companyId}:${source.url ?? source.title}`, source, expert.themes ?? []) : null;
    const relationship = await insert("relationships", {
      from_entity_type: "person",
      from_entity_id: fromId,
      to_entity_type: "company",
      to_entity_id: toId,
      theme_id: expert.themes?.[0] ?? null,
      relationship_type: normalizeRelationship(link.relationship),
      source_id: sourceId,
      evidence_text: link.note ?? expert.whyRelevant,
      confidence: expert.confidence ?? 0.7,
      metadata: {
        seeded_by: SEEDED_BY,
        expert_id: expert.id,
        company_id: link.companyId,
        note: link.note,
      },
    });
    relationshipCount += 1;
    await upsert("relationship_embeddings", {
      relationship_id: relationship.id,
      profile_text: `${expert.name} ${link.relationship} ${link.companyId}. ${link.note ?? expert.whyRelevant}`,
      embedding: embed(`${expert.name} ${link.relationship} ${link.companyId}. ${link.note ?? expert.whyRelevant}`),
      embedding_model: MODEL,
      profile_hash: hash(`${expert.name}:${link.companyId}:${link.relationship}:${link.note ?? ""}`),
      metadata: { seeded_by: SEEDED_BY, theme_ids: expert.themes ?? [] },
    }, "relationship_id,embedding_model");
  }
}

let registerSourceCount = 0;
for (const source of sourceRegister.sources ?? []) {
  const sourceId = await upsertSource(`register:${source.source_id}`, {
    title: source.title ?? source.url,
    url: source.url,
    publisher: source.publisher,
  }, Array.isArray(source.theme) ? source.theme : [source.theme].filter(Boolean), {
    source_register_id: source.source_id,
    source_type: source.source_type,
    expected_entities: source.expected_entities,
    expected_relationships: source.expected_relationships,
    priority: source.priority,
    why_useful: source.why_useful,
  });
  if (sourceId) registerSourceCount += 1;
}

console.log(
  `Seeded graph: ${experts.length} people, ${companies.length} companies, ${relationshipCount} relationships, ${registerSourceCount} registered sources.`,
);

async function clearGeneratedRows() {
  await supabase.from("relationship_embeddings").delete().contains("metadata", { seeded_by: SEEDED_BY });
  await supabase.from("entity_embeddings").delete().contains("metadata", { seeded_by: SEEDED_BY });
  await supabase.from("relationships").delete().contains("metadata", { seeded_by: SEEDED_BY });
  await supabase.from("facts").delete().contains("metadata", { seeded_by: SEEDED_BY });
}

async function persistSourcesAndChunks(ownerExternalId, sources, themeIds, metadata) {
  for (const [index, source] of sources.entries()) {
    const sourceId = await upsertSource(`${ownerExternalId}:source:${index + 1}`, source, themeIds, metadata);
    await supabase.from("source_chunks").delete().eq("source_id", sourceId);
    const content = [source.title, source.publisher, source.url, metadata.person_name, metadata.company_name]
      .filter(Boolean)
      .join("\n");
    await insert("source_chunks", {
      source_id: sourceId,
      content,
      token_count: Math.max(1, Math.ceil(content.length / 4)),
      embedding: embed(content),
      theme_ids: themeIds ?? [],
      person_ids: metadata.person_id ? [metadata.person_id] : [],
      company_ids: metadata.company_id ? [metadata.company_id] : [],
      metadata: { seeded_by: SEEDED_BY, ...metadata },
    });
  }
}

async function upsertSource(externalId, source, themeIds, metadata = {}) {
  const row = await upsert("sources", {
    external_id: externalId,
    title: source.title ?? source.url ?? externalId,
    url: source.url ?? null,
    publisher: source.publisher ?? null,
    source_type: metadata.source_type ?? "curated_seed",
    metadata: { seeded_by: SEEDED_BY, theme_ids: themeIds ?? [], ...metadata },
  }, "external_id");
  return row.id;
}

async function upsertEntityEmbedding(entityType, entityId, profileText) {
  await upsert("entity_embeddings", {
    entity_type: entityType,
    entity_id: entityId,
    profile_text: profileText,
    embedding: embed(profileText),
    embedding_model: MODEL,
    profile_hash: hash(profileText),
    metadata: { seeded_by: SEEDED_BY },
  }, "entity_type,entity_id,embedding_model");
}

async function upsert(table, row, onConflict) {
  const { data, error } = await supabase.from(table).upsert(row, { onConflict }).select("*").single();
  if (error) throw new Error(`${table}: ${error.message}`);
  return data;
}

async function insert(table, row) {
  const { data, error } = await supabase.from(table).insert(row).select("*").single();
  if (error) throw new Error(`${table}: ${error.message}`);
  return data;
}

function embed(text) {
  const vector = Array.from({ length: 384 }, () => 0);
  const tokens = String(text || "empty").toLowerCase().split(/\s+/).filter(Boolean);
  for (const token of tokens.length ? tokens : ["empty"]) {
    const digest = crypto.createHash("sha256").update(token).digest();
    const index = digest.readUInt32BE(0) % vector.length;
    vector[index] += digest[4] % 2 ? 1 : -1;
  }
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
  return vector.map((value) => Number((value / norm).toFixed(8)));
}

function expertProfile(expert) {
  return [
    expert.name,
    expert.headline,
    expert.org,
    expert.type,
    expert.location,
    expert.whyRelevant,
    expert.bio,
    ...(expert.specialties ?? []),
    ...(expert.themes ?? []),
  ].filter(Boolean).join(" ");
}

function companyProfile(company) {
  return [
    company.name,
    company.category,
    company.description,
    company.whyInteresting,
    company.hq,
    company.website,
    company.stage,
    company.ownershipStatus,
    ...(company.specialties ?? []),
    ...(company.themes ?? []),
  ].filter(Boolean).join(" ");
}

function normalizeCategory(value) {
  if (["target", "advisory", "service-provider", "investor", "incumbent"].includes(value)) return value;
  return "target";
}

function normalizeExpertType(value) {
  if (["ex-founder", "operator", "advisor", "banker", "lawyer", "service-provider", "investor"].includes(value)) return value;
  return "operator";
}

function normalizeRelationship(value) {
  return String(value ?? "connected_to").replaceAll("-", "_");
}

function scoreExpert(expert) {
  const base = { "ex-founder": 82, operator: 76, investor: 72, advisor: 68, banker: 66, lawyer: 62, "service-provider": 60 }[expert.type] ?? 58;
  return Math.min(100, Math.round(base * (expert.confidence ?? 0.7) + (expert.companies?.length ?? 0) * 4));
}

function scoreCompany(company) {
  const base = { target: 78, advisory: 66, "service-provider": 62, investor: 58, incumbent: 54 }[company.category] ?? 55;
  return Math.min(100, Math.round(base * (company.confidence ?? 0.7)));
}

function scoreMomentum(item) {
  return Math.min(100, Math.round(((item.news?.length ?? 0) * 8 + (item.signals?.length ?? 0) * 6 + (item.confidence ?? 0.7) * 45)));
}

function hash(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), relativePath), "utf8"));
}

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index);
    const value = trimmed.slice(index + 1);
    if (!process.env[key]) process.env[key] = value;
  }
}
