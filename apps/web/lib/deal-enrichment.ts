import { getDbDeal, persistSourceChunks, upsertSource } from "./deal-db";
import { getSupabaseServiceClient } from "./supabase";
import { complete, hasModel } from "./llm";
import { callBackendApi, hasBackendApi } from "./backend-api";
import type { DealFact } from "./types";

type EnrichedSource = {
  title: string;
  url: string;
  publisher?: string;
  snippet?: string;
};

type EnrichedFact = {
  factType: string;
  factValue: string;
  normalizedValue?: string;
  sourceUrl: string;
  evidenceText: string;
  confidence: number;
  reviewStatus?: DealFact["reviewStatus"];
};

type EnrichedConflict = {
  factType: string;
  values: string[];
  note: string;
};

type EnrichmentPayload = {
  sources?: EnrichedSource[];
  facts?: EnrichedFact[];
  conflicts?: EnrichedConflict[];
  remainingMissingFacts?: string[];
};

type BackendChatResponse = {
  answer?: string;
  citations?: {
    title?: string;
    url?: string;
    evidence?: string;
  }[];
};

const SYSTEM = `You enrich private-equity deal facts using web search.
Use authoritative sources first: buyer, seller, target, investor, bank, law firm, regulator, reputable trade press.
Never invent undisclosed economics. Return strict JSON only. Low-confidence or uncertain facts must be review-gated.`;

export async function runDealEnrichment(externalDealId: string) {
  if (!hasModel()) {
    throw new Error("Set DEEPSEEK_API_KEY to run deal enrichment.");
  }
  if (!hasBackendApi()) {
    throw new Error("Set BACKEND_API_URL so deal enrichment can use backend web search.");
  }

  const deal = await getDbDeal(externalDealId);
  if (!deal) throw new Error(`Unknown persisted deal: ${externalDealId}`);

  const supabase = getSupabaseServiceClient();
  const { data: dealRow, error: dealRowError } = await supabase
    .from("deals")
    .select("id")
    .eq("external_id", externalDealId)
    .single();
  if (dealRowError) throw new Error(dealRowError.message);
  const dealUuid = dealRow.id as string;

  const { data: run, error: runError } = await supabase
    .from("deal_enrichment_runs")
    .insert({
      trigger: "manual",
      status: "running",
      queries: deal.followUpSearches,
      metadata: { dealExternalId: externalDealId },
    })
    .select("id")
    .single();
  if (runError) throw new Error(runError.message);

  try {
    const searchSources = await collectSearchEvidence(deal.name, deal.followUpSearches);
    const text = await complete(
      SYSTEM,
      `Deal: ${deal.name}
Theme: ${deal.theme}
Known facts:
${deal.facts.map((fact) => `- ${fact.factType}: ${fact.factValue}`).join("\n")}

Missing facts:
${deal.missingFacts.map((fact) => `- ${fact}`).join("\n")}

Run targeted searches using these query ideas:
${deal.followUpSearches.map((query) => `- ${query}`).join("\n")}

Source snippets from backend web search:
${searchSources
  .map(
    (source, index) =>
      `${index + 1}. ${source.title}\nURL: ${source.url}\nPublisher: ${source.publisher ?? ""}\nSnippet: ${
        source.snippet ?? ""
      }`,
  )
  .join("\n\n")}

Return strict JSON:
{
  "sources": [{"title": string, "url": string, "publisher": string, "snippet": string}],
  "facts": [{"factType": string, "factValue": string, "normalizedValue": string, "sourceUrl": string, "evidenceText": string, "confidence": number, "reviewStatus": "verified" | "needs_review" | "not_disclosed"}],
  "conflicts": [{"factType": string, "values": string[], "note": string}],
  "remainingMissingFacts": string[]
}`,
      { maxTokens: 3000, responseFormat: "json_object" },
    );

    const payload = parseJson<EnrichmentPayload>(text) ?? {};
    const sourceIdByUrl = new Map<string, string>();
    const sourcesToPersist = payload.sources?.length ? payload.sources : searchSources;

    for (const source of sourcesToPersist) {
      const sourceId = await upsertSource({
        title: source.title,
        url: source.url,
        publisher: source.publisher,
        sourceType: "web_enrichment",
        rawText: source.snippet,
        metadata: { dealExternalId: externalDealId },
      });
      sourceIdByUrl.set(source.url, sourceId);
      if (source.snippet) {
        await persistSourceChunks(sourceId, source.snippet, {
          dealExternalId: externalDealId,
          enrichmentRunId: run.id,
        });
      }
    }

    const factRows = [];
    for (const fact of payload.facts ?? []) {
      const sourceId =
        sourceIdByUrl.get(fact.sourceUrl) ??
        (fact.sourceUrl
          ? await upsertSource({
              title: fact.sourceUrl,
              url: fact.sourceUrl,
              sourceType: "web_enrichment",
              rawText: fact.evidenceText,
              metadata: { dealExternalId: externalDealId },
            })
          : undefined);
      factRows.push({
        deal_id: dealUuid,
        fact_type: fact.factType,
        fact_value: fact.factValue,
        normalized_value: fact.normalizedValue ?? null,
        source_id: sourceId ?? null,
        evidence_text: fact.evidenceText,
        confidence: Math.max(0, Math.min(1, fact.confidence ?? 0.7)),
        extraction_method: "web_search",
        review_status: fact.reviewStatus ?? "needs_review",
      });
    }

    if (factRows.length) {
      const { error } = await supabase.from("deal_facts").insert(factRows);
      if (error) throw new Error(error.message);
    }

    const conflictRows = (payload.conflicts ?? []).map((conflict) => ({
      deal_id: dealUuid,
      fact_type: conflict.factType,
      values: conflict.values,
      note: conflict.note,
    }));
    if (conflictRows.length) {
      const { error } = await supabase.from("deal_fact_conflicts").insert(conflictRows);
      if (error) throw new Error(error.message);
    }

    const { error: updateDealError } = await supabase
      .from("deals")
      .update({
        missing_facts: payload.remainingMissingFacts ?? deal.missingFacts,
        updated_at: new Date().toISOString(),
      })
      .eq("external_id", externalDealId);
    if (updateDealError) throw new Error(updateDealError.message);

    const { error: completeError } = await supabase
      .from("deal_enrichment_runs")
      .update({
        status: "completed",
        sources_found: sourcesToPersist.length,
        facts_created: factRows.length,
        completed_at: new Date().toISOString(),
      })
      .eq("id", run.id);
    if (completeError) throw new Error(completeError.message);

    return {
      runId: run.id as string,
      sourcesFound: sourcesToPersist.length,
      factsCreated: factRows.length,
      conflictsCreated: conflictRows.length,
      remainingMissingFacts: payload.remainingMissingFacts ?? deal.missingFacts,
    };
  } catch (error) {
    await supabase
      .from("deal_enrichment_runs")
      .update({
        status: "failed",
        error: error instanceof Error ? error.message : "Enrichment failed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", run.id);
    throw error;
  }
}

async function collectSearchEvidence(dealName: string, queries: string[]): Promise<EnrichedSource[]> {
  const seen = new Map<string, EnrichedSource>();
  const selectedQueries = (queries.length ? queries : [`${dealName} transaction advisor completion`]).slice(0, 4);

  for (const query of selectedQueries) {
    const response = await callBackendApi<BackendChatResponse>("/chat", {
      method: "POST",
      body: JSON.stringify({
        message: query,
        tools: ["web_search"],
      }),
    });
    for (const citation of response?.citations ?? []) {
      const url = citation.url;
      if (!url || seen.has(url)) continue;
      seen.set(url, {
        title: citation.title || url,
        url,
        publisher: safePublisher(url),
        snippet: citation.evidence,
      });
    }
  }

  return [...seen.values()].slice(0, 12);
}

function parseJson<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]) as T;
    } catch {
      return null;
    }
  }
}

function safePublisher(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Web source";
  }
}
