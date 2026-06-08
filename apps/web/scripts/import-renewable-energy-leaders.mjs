import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const envCandidates = [
  path.join(process.cwd(), "..", "..", "..", ".env"),
  path.join(process.cwd(), "..", "..", ".env"),
  path.join(process.cwd(), ".env"),
];
for (const candidate of envCandidates) {
  if (fs.existsSync(candidate)) {
    loadEnv(candidate);
    break;
  }
}

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
const SEEDED_BY = "import-renewable-energy-leaders";
const THEME_ID = "clean-energy-advisory";

const csvPath = process.argv[2];
if (!csvPath) {
  console.error("Usage: node import-renewable-energy-leaders.mjs <path-to-csv>");
  process.exit(1);
}

const csvText = fs.readFileSync(csvPath, "utf8");
const rows = parseCSV(csvText);
console.log(`Parsed ${rows.length} rows from CSV`);

let companyCount = 0;
let personCount = 0;
let relationshipCount = 0;
let jobCount = 0;

const companyDomainMap = new Map();

for (const row of rows) {
  const companyName = String(row["Company Name"] || "").trim();
  const domain = String(row["Company Domain"] || row["Domain"] || "").trim();
  const firstName = String(row["First Name"] || "").trim();
  const lastName = String(row["Last Name"] || "").trim();
  const fullName = String(row["Full Name"] || `${firstName} ${lastName}`).trim();
  const jobTitle = String(row["Job Title"] || "").trim();
  const location = String(row["Location"] || "").trim();
  const linkedinUrl = String(row["LinkedIn Profile"] || "").trim();
  const linkedinHeadline = String(row["Headline"] || "").trim();
  const summary = String(row["Summary"] || "").trim();
  const workEmail = String(row["Work Email"] || row["Work Email (2)"] || "").trim();
  const latestFunding = String(row["Latest Funding"] || "").trim();
  const connections = String(row["Connections"] || "").trim();
  const jobsCount = String(row["Jobs Count"] || "").trim();
  const enrichedSummary = String(row["Summarize LinkedIn profile"] || "").trim();

  if (!fullName && !companyName) continue;

  const companyExternalId = domain || slugify(companyName);
  const personExternalId = linkedinUrl
    ? `linkedin:${linkedinUrl.split("/in/")[1]?.replace(/\/$/, "")}`
    : `csv:${slugify(fullName)}`;

  if (companyName && !companyDomainMap.has(companyExternalId)) {
    const { data: existing } = await supabase
      .from("companies")
      .select("id")
      .or(`external_id.eq.${companyExternalId},website.eq.${domain}`)
      .limit(1);

    let companyRow;
    if (existing?.length) {
      companyRow = await supabase
        .from("companies")
        .update({
          website: domain || existing[0].website,
          theme_ids: existing[0].theme_ids?.includes(THEME_ID)
            ? existing[0].theme_ids
            : [...(existing[0].theme_ids || []), THEME_ID],
          description: existing[0].description || (summary ? summary.slice(0, 500) : null),
          metadata: {
            ...(existing[0].metadata || {}),
            seeded_by: SEEDED_BY,
            funding: latestFunding || existing[0].metadata?.funding,
            csv_source: true,
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing[0].id)
        .select("*")
        .single()
        .then((r) => r.data);
    } else {
      companyRow = await supabase
        .from("companies")
        .upsert(
          {
            external_id: companyExternalId,
            name: companyName,
            category: "target",
            theme_ids: [THEME_ID],
            website: domain || null,
            description: summary ? summary.slice(0, 500) : null,
            relevance_score: 70,
            momentum_score: 65,
            confidence: 0.75,
            metadata: {
              seeded_by: SEEDED_BY,
              funding: latestFunding || null,
              csv_source: true,
            },
          },
          { onConflict: "external_id" }
        )
        .select("*")
        .single()
        .then((r) => r.data);
    }

    if (companyRow) {
      companyDomainMap.set(companyExternalId, companyRow.id);
      companyCount++;
      await upsertEntityEmbedding("company", companyRow.id, [
        companyName,
        "renewable energy",
        "clean energy",
        domain,
        summary?.slice(0, 300),
      ].filter(Boolean).join(" "));
    }
  }

  if (!fullName) continue;

  const expertType = inferExpertType(jobTitle);

  const personPayload = {
    external_id: personExternalId,
    name: fullName,
    headline: linkedinHeadline || jobTitle || null,
    current_organization: companyName || null,
    location: location || null,
    expert_type: expertType,
    theme_ids: [THEME_ID],
    specialties: extractSpecialties(summary, linkedinHeadline, enrichedSummary),
    linkedin_url: linkedinUrl || null,
    website: domain ? `https://${domain}` : null,
    summary: summary || null,
    why_relevant: enrichedSummary || summary?.slice(0, 300) || null,
    relevance_score: scorePerson(expertType, connections),
    momentum_score: scoreMomentum(connections, jobsCount, latestFunding),
    confidence: 0.8,
    metadata: {
      seeded_by: SEEDED_BY,
      connections: parseInt(connections) || null,
      jobs_count: parseInt(jobsCount) || null,
      work_email: workEmail || null,
      funding: latestFunding || null,
      csv_source: true,
    },
  };

  const personResult = await supabase
    .from("people")
    .upsert(personPayload, { onConflict: "external_id" })
    .select("*")
    .single();

  if (personResult.error) {
    console.error(`Error upserting person ${fullName}:`, personResult.error.message);
    continue;
  }

  const personRow = personResult.data;
  personCount++;

  await upsertEntityEmbedding("person", personRow.id, [
    fullName,
    jobTitle,
    linkedinHeadline,
    companyName,
    location,
    enrichedSummary,
    ...personPayload.specialties,
  ].filter(Boolean).join(" "));

  const companyId = companyDomainMap.get(companyExternalId);
  if (companyId) {
    const relCheck = await supabase
      .from("relationships")
      .select("id")
      .eq("from_entity_type", "person")
      .eq("from_entity_id", personRow.id)
      .eq("to_entity_type", "company")
      .eq("to_entity_id", companyId)
      .limit(1);

    if (!relCheck.data?.length) {
      await supabase.from("relationships").insert({
        from_entity_type: "person",
        from_entity_id: personRow.id,
        to_entity_type: "company",
        to_entity_id: companyId,
        theme_id: THEME_ID,
        relationship_type: inferRelationshipType(jobTitle),
        evidence_text: `${fullName} is ${jobTitle} at ${companyName}`,
        confidence: 0.85,
        metadata: {
          seeded_by: SEEDED_BY,
          job_title: jobTitle,
        },
      });
      relationshipCount++;
    }
  }

  const hasMissingData = !workEmail || !summary || !companyName || !domain;
  if (hasMissingData) {
    await supabase.from("research_jobs").insert({
      job_type: "expert_profile_completion",
      status: "queued",
      theme_id: THEME_ID,
      target_type: "person",
      target_id: personRow.id,
      priority: 70,
      metadata: {
        target_name: fullName,
        target_organizations: companyName ? [companyName] : [],
        target_companies: companyName ? [companyName] : [],
        reason: [
          !workEmail && "missing_email",
          !summary && "missing_summary",
          !companyName && "missing_company",
          !domain && "missing_domain",
        ].filter(Boolean),
        category: "expert-profile-completion",
        max_rounds: 2,
        max_queries: 6,
        results_per_query: 3,
      },
    });
    jobCount++;
  }
}

console.log(
  `Imported: ${companyCount} companies, ${personCount} people, ${relationshipCount} relationships, ${jobCount} enrichment jobs created.`
);

function parseCSV(text) {
  const lines = [];
  let current = "";
  let inQuotes = false;
  for (const char of text) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "\n" && !inQuotes) {
      lines.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  if (current) lines.push(current);

  const headers = parseCSVLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0 || values.every((v) => !v)) continue;
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || "";
    });
    if (Object.values(row).some((v) => v)) rows.push(row);
  }
  return rows;
}

function parseCSVLine(line) {
  const fields = [];
  let current = "";
  let inQuotes = false;
  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current.trim());
  return fields;
}

function inferExpertType(title) {
  const t = title.toLowerCase();
  if (/\bfounder\b/.test(t) && /\b(co[- ]?founder|ceo|chief)\b/.test(t)) return "ex-founder";
  if (/\bfounder\b/.test(t)) return "ex-founder";
  if (/\bceo\b|\bchief executive\b/.test(t)) return "operator";
  if (/\bdirector\b|\bmanaging director\b|\bexecutive director\b/.test(t)) return "operator";
  if (/\bconsultant\b|\bconsulting\b/.test(t)) return "consultant";
  if (/\badvisor\b|\badvisory\b/.test(t)) return "advisor";
  if (/\binvestor\b|\bpartner\b/.test(t)) return "investor";
  if (/\bchairperson\b|\bchair\b/.test(t)) return "operator";
  return "operator";
}

function inferRelationshipType(title) {
  const t = title.toLowerCase();
  if (/\bfounder\b/.test(t)) return "founder";
  if (/\bceo\b|\bchief executive\b/.test(t)) return "ceo";
  if (/\bdirector\b/.test(t)) return "director";
  if (/\bconsultant\b/.test(t)) return "consultant";
  if (/\badvisor\b/.test(t)) return "advisor";
  if (/\bpartner\b/.test(t)) return "partner";
  if (/\bchairperson\b|\bchair\b/.test(t)) return "chairperson";
  return "employee";
}

function extractSpecialties(summary, headline, enriched) {
  const text = [summary, headline, enriched].filter(Boolean).join(" ").toLowerCase();
  const specialties = [];
  const patterns = [
    { regex: /\b(solar|solar pv|solar energy|solar power)\b/i, label: "Solar Energy" },
    { regex: /\b(wind|wind energy|wind power)\b/i, label: "Wind Energy" },
    { regex: /\b(green hydrogen|hydrogen)\b/i, label: "Green Hydrogen" },
    { regex: /\b(energy storage|bess|battery storage)\b/i, label: "Energy Storage" },
    { regex: /\b(renewable energy|clean energy|energy transition)\b/i, label: "Renewable Energy" },
    { regex: /\b(electric vehicle|ev|ev charging)\b/i, label: "Electric Vehicles" },
    { regex: /\b(sustainability|sustainable)\b/i, label: "Sustainability" },
    { regex: /\b(private equity|venture capital|investment)\b/i, label: "Investment" },
    { regex: /\b(grid|transmission|distribution|infrastructure)\b/i, label: "Grid Infrastructure" },
    { regex: /\b(project management|project development)\b/i, label: "Project Management" },
    { regex: /\b(recruitment|talent|executive search|headhunt)\b/i, label: "Recruitment" },
    { regex: /\b(data centre|data center|digital infrastructure)\b/i, label: "Digital Infrastructure" },
    { regex: /\b(lithium|battery manufacturing|battery)\b/i, label: "Battery Technology" },
    { regex: /\b(epc|engineering procurement)\b/i, label: "EPC" },
    { regex: /\b(aerodynamics|cfd|wind tunnel)\b/i, label: "Aerodynamics" },
    { regex: /\b(logistics|supply chain|freight)\b/i, label: "Logistics" },
    { regex: /\b(semiconductor|chip)\b/i, label: "Semiconductors" },
    { regex: /\b(training|leadership development)\b/i, label: "Training & Development" },
    { regex: /\b(legal|law)\b/i, label: "Legal" },
    { regex: /\b(ai|artificial intelligence|machine learning)\b/i, label: "AI & ML" },
  ];
  for (const { regex, label } of patterns) {
    if (regex.test(text) && !specialties.includes(label)) {
      specialties.push(label);
    }
  }
  return specialties.length ? specialties : ["Renewable Energy"];
}

function scorePerson(expertType, connections) {
  const base = { "ex-founder": 85, operator: 78, investor: 72, advisor: 70, consultant: 68, banker: 66, lawyer: 62 }[expertType] ?? 65;
  const connBonus = Math.min(20, Math.floor((parseInt(connections) || 0) / 2000));
  return Math.min(100, base + connBonus);
}

function scoreMomentum(connections, jobsCount, funding) {
  let score = 50;
  const conn = parseInt(connections) || 0;
  if (conn > 10000) score += 20;
  else if (conn > 5000) score += 12;
  const jobs = parseInt(jobsCount) || 0;
  if (jobs > 10) score += 15;
  else if (jobs > 5) score += 8;
  const fund = parseInt(funding) || 0;
  if (fund > 50000000) score += 15;
  else if (fund > 1000000) score += 8;
  return Math.min(100, score);
}

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function upsertEntityEmbedding(entityType, entityId, profileText) {
  const existing = await supabase
    .from("entity_embeddings")
    .select("id")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .eq("embedding_model", MODEL)
    .limit(1);

  if (existing.data?.length) return;

  await supabase.from("entity_embeddings").insert({
    entity_type: entityType,
    entity_id: entityId,
    profile_text: profileText,
    embedding: embed(profileText),
    embedding_model: MODEL,
    profile_hash: hash(profileText),
    metadata: { seeded_by: SEEDED_BY },
  });
}

function embed(text) {
  const vector = Array.from({ length: 384 }, () => 0);
  const tokens = String(text || "empty").toLowerCase().split(/\s+/).filter(Boolean);
  for (const token of tokens.length ? tokens : ["empty"]) {
    const digest = crypto.createHash("sha256").update(token).digest();
    const index = digest.readUInt32BE(0) % vector.length;
    vector[index] += digest[4] % 2 ? 1 : -1;
  }
  const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) || 1;
  return vector.map((v) => Number((v / norm).toFixed(8)));
}

function hash(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx);
    const value = trimmed.slice(idx + 1);
    if (!process.env[key]) process.env[key] = value;
  }
}
