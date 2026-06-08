import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

loadEnv(path.join(process.cwd(), "..", "..", ".env"));

const execute = process.argv.includes("--execute");
const verifiedAt = new Date().toISOString();
const verifiedBy = "verify-discovery-candidates.v1";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceKey) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const before = await statusSummary();
const candidates = await readAll("discovery_candidates", [
  "id",
  "candidate_type",
  "name",
  "priority",
  "review_status",
  "theme_ids",
  "source_ids",
  "job_id",
  "payload",
  "canonical_entity_type",
  "canonical_entity_id",
].join(","));
const matches = await readAll("entity_match_candidates", [
  "id",
  "discovery_candidate_id",
  "canonical_entity_type",
  "canonical_entity_id",
  "match_method",
  "match_score",
  "evidence",
  "review_status",
].join(","));
const sourceIds = unique(
  candidates.flatMap((candidate) => candidate.source_ids ?? []),
);
const sourceRows = sourceIds.length
  ? await readInBatches("sources", "id,title,url,publisher", "id", sourceIds)
  : [];
const sourceById = new Map(sourceRows.map((source) => [source.id, source]));

const matchesByCandidate = groupBy(matches, (match) => match.discovery_candidate_id);
const approvedMatchesByCandidate = new Map();
const matchUpdates = [];
for (const match of matches.filter((item) => item.review_status === "needs_review")) {
  const approved = isStrongEntityMatch(match);
  const review_status = approved ? "approved" : "rejected";
  const reason = approved
    ? "Exact canonical entity match at or above confidence threshold."
    : "Match score or method is not strong enough for automatic merge.";
  const evidence = {
    ...(match.evidence ?? {}),
    verification: {
      verified_at: verifiedAt,
      verified_by: verifiedBy,
      review_status,
      reason,
      rule_version: 1,
    },
  };
  matchUpdates.push({ id: match.id, review_status, evidence });
  if (approved) approvedMatchesByCandidate.set(match.discovery_candidate_id, match);
}

const candidateUpdates = [];
const skippedCandidates = [];
for (const candidate of candidates.filter((item) => item.review_status === "needs_review")) {
  const candidateMatches = matchesByCandidate.get(candidate.id) ?? [];
  const approvedMatch =
    approvedMatchesByCandidate.get(candidate.id) ??
    candidateMatches.find((match) => match.review_status === "approved");
  const assessment = assessCandidate(candidate, approvedMatch, sourceById);
  candidateUpdates.push(assessment);
}

if (execute) {
  for (const update of matchUpdates) {
    const { error } = await supabase
      .from("entity_match_candidates")
      .update({
        review_status: update.review_status,
        evidence: update.evidence,
      })
      .eq("id", update.id);
    if (error) throw new Error(`entity_match_candidates ${update.id}: ${error.message}`);
  }

  for (const update of candidateUpdates) {
    const values = {
      review_status: update.review_status,
      payload: update.payload,
      canonical_entity_type: update.canonical_entity_type ?? null,
      canonical_entity_id: update.canonical_entity_id ?? null,
      updated_at: verifiedAt,
    };
    const { error } = await supabase
      .from("discovery_candidates")
      .update(values)
      .eq("id", update.id);
    if (error) throw new Error(`discovery_candidates ${update.id}: ${error.message}`);
  }
}

const after = execute ? await statusSummary() : before;
const output = {
  mode: execute ? "execute" : "dry-run",
  candidates_scanned: candidates.length,
  candidates_pending_before: before.discovery_candidates.needs_review ?? 0,
  entity_matches_pending_before: before.entity_match_candidates.needs_review ?? 0,
  candidate_updates: countBy(candidateUpdates, (item) => item.review_status),
  match_updates: countBy(matchUpdates, (item) => item.review_status),
  before,
  after,
  sample_rejections: candidateUpdates
    .filter((item) => item.review_status === "rejected")
    .slice(0, 10)
    .map((item) => ({ name: item.name, type: item.candidate_type, reasons: item.reasons })),
  skipped_candidates: skippedCandidates.length,
};

console.log(JSON.stringify(output, null, 2));

function assessCandidate(candidate, approvedMatch, sourceById) {
  const reasons = [];
  const sourceCount = (candidate.source_ids ?? []).filter((id) => sourceById.has(id)).length;
  const payload = candidate.payload ?? {};
  const confidence = Number(payload.confidence ?? candidate.priority / 100 ?? 0);
  const base = {
    id: candidate.id,
    name: candidate.name,
    candidate_type: candidate.candidate_type,
    canonical_entity_type: undefined,
    canonical_entity_id: undefined,
    reasons,
  };

  if (approvedMatch) {
    reasons.push("Merged into exact canonical entity match.");
    return {
      ...base,
      review_status: "merged",
      canonical_entity_type: approvedMatch.canonical_entity_type,
      canonical_entity_id: approvedMatch.canonical_entity_id,
      payload: withVerification(payload, "merged", reasons, sourceCount, confidence),
    };
  }

  if (!validName(candidate.name)) {
    reasons.push("Candidate name is missing, placeholder-like, or too short.");
  }
  if (sourceCount === 0) {
    reasons.push("No persisted source record supports the candidate.");
  }
  if (confidence < 0.45) {
    reasons.push("Extraction confidence is below automatic verification threshold.");
  }

  if (candidate.candidate_type === "person") {
    if (!validPerson(candidate, sourceById)) {
      reasons.push("Person candidate lacks a credible full name, profile source, role, or organization signal.");
    }
  } else if (candidate.candidate_type === "company") {
    if (!validCompany(candidate)) {
      reasons.push("Company candidate lacks a usable company/entity name.");
    }
  } else if (candidate.candidate_type === "relationship") {
    if (!validRelationship(candidate)) {
      reasons.push("Relationship endpoint or relation is too weak for automatic verification.");
    }
  } else {
    reasons.push(`Unsupported candidate type: ${candidate.candidate_type}`);
  }

  const review_status = reasons.length ? "rejected" : "approved";
  if (!reasons.length) {
    reasons.push("Source-backed candidate passed structural verification and confidence checks.");
  }
  return {
    ...base,
    review_status,
    payload: withVerification(payload, review_status, reasons, sourceCount, confidence),
  };
}

function validPerson(candidate, sourceById) {
  const payload = candidate.payload ?? {};
  const sourceUrls = (candidate.source_ids ?? [])
    .map((id) => sourceById.get(id)?.url ?? "")
    .join(" ");
  const hasProfileSource =
    Boolean(payload.linkedin_url || payload.website) ||
    /linkedin\.com\/in\//i.test(sourceUrls) ||
    /profile|bio|biography/i.test(String(payload.source?.title ?? ""));
  const hasRoleSignal = Boolean(
    payload.current_organization ||
      payload.headline ||
      payload.summary ||
      payload.why_relevant,
  );
  const fullName = candidate.name.trim().split(/\s+/).length >= 2;
  return validName(candidate.name) && (fullName || hasProfileSource) && (hasProfileSource || hasRoleSignal);
}

function validCompany(candidate) {
  const name = candidate.name.trim();
  if (!validName(name)) return false;
  if (/^(company|target|advisor|buyer|seller|investor)$/i.test(name)) return false;
  return true;
}

function validRelationship(candidate) {
  const payload = candidate.payload ?? {};
  const from = String(payload.from_name ?? "");
  const to = String(payload.to_name ?? "");
  const relation = String(payload.relationship_type ?? "");
  if (!validName(from) || !validName(to) || !validName(relation)) return false;
  if (isSlugLike(from) || isSlugLike(to)) return false;
  if (/^related_to$/i.test(relation) && Number(payload.confidence ?? 0) <= 0.7) return false;
  return true;
}

function validName(value) {
  const text = String(value ?? "").trim();
  if (text.length < 3) return false;
  if (!/[a-z]/i.test(text)) return false;
  if (/^\[.*\]$/.test(text)) return false;
  if (/\b(unknown|missing|n\/a|none|null|undefined|untitled|not captured)\b/i.test(text)) return false;
  return true;
}

function isSlugLike(value) {
  const text = String(value ?? "").trim();
  return /^[a-z0-9]+(?:-[a-z0-9]+)+$/.test(text);
}

function isStrongEntityMatch(match) {
  return (
    Number(match.match_score ?? 0) >= 0.9 &&
    /^exact_name/.test(String(match.match_method ?? ""))
  );
}

function withVerification(payload, reviewStatus, reasons, sourceCount, confidence) {
  return {
    ...payload,
    verification: {
      verified_at: verifiedAt,
      verified_by: verifiedBy,
      review_status: reviewStatus,
      reasons,
      source_count: sourceCount,
      confidence,
      rule_version: 1,
    },
  };
}

async function statusSummary() {
  return {
    discovery_candidates: await tableStatusSummary("discovery_candidates"),
    entity_match_candidates: await tableStatusSummary("entity_match_candidates"),
  };
}

async function tableStatusSummary(table) {
  const rows = await readAll(table, "review_status");
  return countBy(rows, (row) => row.review_status);
}

async function readAll(table, select) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return rows;
}

async function readInBatches(table, select, column, values) {
  const output = [];
  for (let index = 0; index < values.length; index += 200) {
    const batch = values.slice(index, index + 200);
    const { data, error } = await supabase.from(table).select(select).in(column, batch);
    if (error) throw new Error(`${table}: ${error.message}`);
    output.push(...(data ?? []));
  }
  return output;
}

function groupBy(items, keyFn) {
  const grouped = new Map();
  for (const item of items) {
    const key = keyFn(item);
    grouped.set(key, [...(grouped.get(key) ?? []), item]);
  }
  return grouped;
}

function countBy(items, keyFn) {
  const counts = {};
  for (const item of items) {
    const key = keyFn(item);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort());
}

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index);
    const value = trimmed.slice(index + 1).replace(/^['"]|['"]$/g, "");
    if (!(key in process.env)) process.env[key] = value;
  }
}
