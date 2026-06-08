#!/usr/bin/env node
/**
 * Prototype source-to-review-to-graph pipeline.
 *
 * This script deliberately writes review artifacts only. It never mutates
 * data/experts.json or data/companies.json.
 *
 * Usage:
 *   node scripts/data-pipeline.mjs run --offline
 *   node scripts/data-pipeline.mjs fetch-clean
 *   node scripts/data-pipeline.mjs build-candidates
 *   node scripts/data-pipeline.mjs build-graph
 *   node scripts/data-pipeline.mjs review candidate-tb-gmc-investment approved --reviewer analyst
 *   node scripts/data-pipeline.mjs validate
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, "..");

const DEFAULTS = {
  register: join(root, "data/source-register.json"),
  cleaned: join(root, "data/pipeline-clean.json"),
  candidates: join(root, "data/candidates.json"),
  graphReady: join(root, "data/graph-ready.json"),
};

const REVIEW_STATUSES = new Set(["needs_review", "approved", "rejected", "merge", "needs_more_evidence"]);

function usage(exitCode = 0) {
  const text = `Usage:
  node scripts/data-pipeline.mjs run [--offline]
  node scripts/data-pipeline.mjs fetch-clean [--offline] [--source source_id]
  node scripts/data-pipeline.mjs build-candidates
  node scripts/data-pipeline.mjs build-graph
  node scripts/data-pipeline.mjs review <candidate_id> <needs_review|approved|rejected|merge|needs_more_evidence> [--reviewer name] [--notes text]
  node scripts/data-pipeline.mjs validate`;
  (exitCode === 0 ? console.log : console.error)(text);
  process.exit(exitCode);
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) {
      args._.push(arg);
      continue;
    }
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
      continue;
    }
    args[key] = next;
    i += 1;
  }
  return args;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function normalizeText(text) {
  return text.replace(/\s+/g, " ").trim();
}

function decodeEntities(text) {
  const named = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
  };
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, token) => {
    if (token[0] === "#") {
      const code = token[1].toLowerCase() === "x" ? Number.parseInt(token.slice(2), 16) : Number.parseInt(token.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    return named[token.toLowerCase()] ?? match;
  });
}

function cleanHtml(html) {
  const withoutNoise = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");
  const text = withoutNoise.replace(/<[^>]+>/g, " ");
  return normalizeText(decodeEntities(text));
}

function extractionEvidence(source) {
  return source.prototype_extractions
    .flatMap((candidate) => candidate.evidence ?? [])
    .map((evidence) => evidence.evidence_text)
    .filter(Boolean)
    .join("\n\n");
}

async function fetchSource(source, offline) {
  const fallbackText = normalizeText([source.why_useful, extractionEvidence(source)].filter(Boolean).join("\n\n"));

  if (offline) {
    return {
      source_id: source.source_id,
      url: source.url,
      fetched: false,
      fetch_status: "offline_seed",
      cleaned_text: fallbackText,
      cleaned_char_count: fallbackText.length,
    };
  }

  try {
    const res = await fetch(source.url, {
      headers: {
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "user-agent": "TowerBrookExpertEnginePrototype/0.1",
      },
    });
    const raw = await res.text();
    const cleaned = cleanHtml(raw);
    return {
      source_id: source.source_id,
      url: source.url,
      fetched: res.ok,
      fetch_status: `${res.status} ${res.statusText}`.trim(),
      cleaned_text: cleaned || fallbackText,
      cleaned_char_count: (cleaned || fallbackText).length,
    };
  } catch (error) {
    return {
      source_id: source.source_id,
      url: source.url,
      fetched: false,
      fetch_status: `fetch_error: ${error.message}`,
      cleaned_text: fallbackText,
      cleaned_char_count: fallbackText.length,
    };
  }
}

async function fetchClean(options) {
  const register = readJson(DEFAULTS.register);
  const sourceFilter = options.source;
  const sources = sourceFilter ? register.sources.filter((source) => source.source_id === sourceFilter) : register.sources;
  if (sourceFilter && sources.length === 0) {
    throw new Error(`Unknown source_id: ${sourceFilter}`);
  }

  const documents = [];
  for (const source of sources) {
    documents.push(await fetchSource(source, Boolean(options.offline)));
  }

  const output = {
    schema_version: "pipeline-clean.v1",
    generated_by: "scripts/data-pipeline.mjs fetch-clean",
    source_register: "data/source-register.json",
    mode: options.offline ? "offline_seed" : "live_fetch_with_seed_fallback",
    documents,
  };
  writeJson(DEFAULTS.cleaned, output);
  console.log(`Wrote ${documents.length} cleaned source document(s) to data/pipeline-clean.json`);
}

function evidenceFound(cleanedBySource, sourceId, evidenceText) {
  const cleaned = cleanedBySource.get(sourceId);
  if (!cleaned || !evidenceText) return false;
  return normalizeText(cleaned.cleaned_text).toLowerCase().includes(normalizeText(evidenceText).toLowerCase());
}

function existingReviews() {
  if (!existsSync(DEFAULTS.candidates)) return new Map();
  const existing = readJson(DEFAULTS.candidates);
  return new Map(
    (existing.candidates ?? []).map((candidate) => [
      candidate.candidate_id,
      {
        review: candidate.review,
        duplicate_warning: candidate.duplicate_warning,
      },
    ]),
  );
}

function buildCandidates() {
  const register = readJson(DEFAULTS.register);
  const cleaned = existsSync(DEFAULTS.cleaned) ? readJson(DEFAULTS.cleaned) : { documents: [] };
  const cleanedBySource = new Map((cleaned.documents ?? []).map((document) => [document.source_id, document]));
  const previous = existingReviews();

  const candidates = register.sources.flatMap((source) =>
    (source.prototype_extractions ?? []).map((seed) => {
      const prior = previous.get(seed.candidate_id);
      const review = prior?.review ?? seed.review ?? { status: "needs_review", reviewer: "", notes: "" };
      return {
        candidate_id: seed.candidate_id,
        theme: source.theme,
        source: {
          source_id: source.source_id,
          title: source.title,
          url: source.url,
          publisher: source.publisher,
          date: source.date,
          source_type: source.source_type,
          source_origin: source.source_origin,
        },
        terminal_ui: {
          route: "/discover",
          queue: "Discovery Review Queue",
          evidence_rail: true,
          source_register_route: "/sources",
          primary_row_label: seed.primary_row_label,
        },
        evidence: (seed.evidence ?? []).map((evidence, index) => ({
          evidence_id: `${seed.candidate_id}:e${index + 1}`,
          source_url: source.url,
          evidence_text: evidence.evidence_text,
          confidence: evidence.confidence,
          found_in_clean_text: evidenceFound(cleanedBySource, source.source_id, evidence.evidence_text),
        })),
        confidence: seed.confidence,
        review,
        duplicate_warning: prior?.duplicate_warning ?? seed.duplicate_warning ?? "",
        proposed_entities: seed.proposed_entities ?? [],
        proposed_relationships: seed.proposed_relationships ?? [],
      };
    }),
  );

  const output = {
    schema_version: "candidates.v1",
    generated_by: "scripts/data-pipeline.mjs build-candidates",
    review_policy: "Candidates are proposals. Only review.status === 'approved' is eligible for graph-ready output.",
    review_status_enum: [...REVIEW_STATUSES],
    candidates,
  };

  writeJson(DEFAULTS.candidates, output);
  console.log(`Wrote ${candidates.length} review candidate(s) to data/candidates.json`);
}

function relationshipId(candidateId, index, relationship) {
  return `${candidateId}:r${index + 1}:${relationship.relationship_type}`;
}

function buildGraph() {
  const candidateFile = readJson(DEFAULTS.candidates);
  const approved = (candidateFile.candidates ?? []).filter((candidate) => candidate.review?.status === "approved");
  const nodes = new Map();
  const edges = [];
  const sources = new Map();

  for (const candidate of approved) {
    sources.set(candidate.source.source_id, candidate.source);
    for (const entity of candidate.proposed_entities) {
      const existing = nodes.get(entity.entity_id);
      const evidenceIds = candidate.evidence.map((evidence) => evidence.evidence_id);
      nodes.set(entity.entity_id, {
        ...(existing ?? {}),
        ...entity,
        evidence_ids: [...new Set([...(existing?.evidence_ids ?? []), ...evidenceIds])],
        source_urls: [...new Set([...(existing?.source_urls ?? []), candidate.source.url])],
        candidate_ids: [...new Set([...(existing?.candidate_ids ?? []), candidate.candidate_id])],
      });
    }
    candidate.proposed_relationships.forEach((relationship, index) => {
      edges.push({
        relationship_id: relationshipId(candidate.candidate_id, index, relationship),
        candidate_id: candidate.candidate_id,
        from_entity_id: relationship.from_entity_id,
        to_entity_id: relationship.to_entity_id,
        relationship_type: relationship.relationship_type,
        label: relationship.label,
        confidence: relationship.confidence,
        evidence_text: relationship.evidence_text,
        source_url: candidate.source.url,
        source_id: candidate.source.source_id,
        review_status: candidate.review.status,
      });
    });
  }

  const allCandidates = candidateFile.candidates ?? [];
  const output = {
    schema_version: "graph-ready.v1",
    generated_by: "scripts/data-pipeline.mjs build-graph",
    production_mutation: false,
    review_gate: "approved_candidates_only",
    review_summary: {
      total_candidates: allCandidates.length,
      approved: approved.length,
      needs_review: allCandidates.filter((candidate) => candidate.review?.status === "needs_review").length,
      needs_more_evidence: allCandidates.filter((candidate) => candidate.review?.status === "needs_more_evidence").length,
      rejected: allCandidates.filter((candidate) => candidate.review?.status === "rejected").length,
      merge: allCandidates.filter((candidate) => candidate.review?.status === "merge").length,
    },
    sources: [...sources.values()],
    nodes: [...nodes.values()],
    relationships: edges,
  };

  writeJson(DEFAULTS.graphReady, output);
  console.log(`Wrote ${output.nodes.length} graph node(s) and ${output.relationships.length} relationship(s) to data/graph-ready.json`);
}

function updateReview(args) {
  const [candidateId, status] = args._.slice(1);
  if (!candidateId || !status) usage(1);
  if (!REVIEW_STATUSES.has(status)) {
    throw new Error(`Invalid review status: ${status}`);
  }

  const candidateFile = readJson(DEFAULTS.candidates);
  const candidate = (candidateFile.candidates ?? []).find((item) => item.candidate_id === candidateId);
  if (!candidate) {
    throw new Error(`Unknown candidate_id: ${candidateId}`);
  }
  candidate.review = {
    status,
    reviewer: args.reviewer ?? candidate.review?.reviewer ?? "",
    notes: args.notes ?? candidate.review?.notes ?? "",
  };
  writeJson(DEFAULTS.candidates, candidateFile);
  console.log(`Set ${candidateId} review.status to ${status}`);
}

function validate() {
  const register = readJson(DEFAULTS.register);
  const candidatesFile = readJson(DEFAULTS.candidates);
  const graphFile = existsSync(DEFAULTS.graphReady) ? readJson(DEFAULTS.graphReady) : null;
  const sourceIds = new Set((register.sources ?? []).map((source) => source.source_id));
  const errors = [];

  for (const source of register.sources ?? []) {
    for (const field of ["source_id", "theme", "url", "source_type", "publisher", "why_useful", "priority"]) {
      if (!source[field]) errors.push(`source ${source.source_id ?? "(missing id)"} is missing ${field}`);
    }
  }

  for (const candidate of candidatesFile.candidates ?? []) {
    if (!candidate.candidate_id) errors.push("candidate missing candidate_id");
    if (!sourceIds.has(candidate.source?.source_id)) errors.push(`${candidate.candidate_id} references unknown source ${candidate.source?.source_id}`);
    if (!REVIEW_STATUSES.has(candidate.review?.status)) errors.push(`${candidate.candidate_id} has invalid review status ${candidate.review?.status}`);
    if (!candidate.evidence?.length) errors.push(`${candidate.candidate_id} has no evidence`);
    for (const evidence of candidate.evidence ?? []) {
      if (!evidence.source_url || !evidence.evidence_text || typeof evidence.confidence !== "number") {
        errors.push(`${candidate.candidate_id} has incomplete evidence ${evidence.evidence_id}`);
      }
    }
    if (!candidate.proposed_entities?.length) errors.push(`${candidate.candidate_id} has no proposed entities`);
    if (!candidate.proposed_relationships?.length) errors.push(`${candidate.candidate_id} has no proposed relationships`);
  }

  if (graphFile) {
    const approvedIds = new Set(
      (candidatesFile.candidates ?? [])
        .filter((candidate) => candidate.review?.status === "approved")
        .map((candidate) => candidate.candidate_id),
    );
    for (const relationship of graphFile.relationships ?? []) {
      if (!approvedIds.has(relationship.candidate_id)) {
        errors.push(`graph relationship ${relationship.relationship_id} came from non-approved candidate ${relationship.candidate_id}`);
      }
    }
  }

  if (errors.length) {
    console.error(errors.map((error) => `- ${error}`).join("\n"));
    process.exit(1);
  }
  console.log("Validation passed: register, candidates, and graph-ready review gate are consistent.");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  if (!command || command === "help" || command === "--help") usage(0);

  if (command === "fetch-clean") {
    await fetchClean(args);
  } else if (command === "build-candidates") {
    buildCandidates();
  } else if (command === "build-graph") {
    buildGraph();
  } else if (command === "review") {
    updateReview(args);
  } else if (command === "validate") {
    validate();
  } else if (command === "run") {
    await fetchClean(args);
    buildCandidates();
    buildGraph();
    validate();
  } else {
    usage(1);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
