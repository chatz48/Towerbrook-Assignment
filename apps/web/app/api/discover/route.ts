import { callBackendApi } from "@/lib/backend-api";
import { getTheme } from "@/lib/themes";
import { configuredSearchProviders, liveSearch } from "@/lib/live-search";

export async function POST(request: Request) {
  try {
    const {
      themeId,
      query,
      jobType,
      targetType,
      targetId,
      targetName,
      targetWebsite,
      missingFact,
      metadata,
    } = (await request.json()) as {
      themeId: string;
      query?: string;
      jobType?: string;
      targetType?: "company" | "expert";
      targetId?: string;
      targetName?: string;
      targetWebsite?: string;
      missingFact?: string;
      metadata?: Record<string, unknown>;
    };
    const theme = themeId === "all" ? undefined : getTheme(themeId);
    if (themeId !== "all" && !theme) {
      return Response.json({ error: "Unknown theme" }, { status: 400 });
    }
    const objectives: Record<string, string> = {
      deep_discovery:
        "Find named experts and company opportunities from relevant private-equity activity.",
      founder_origination:
        "Use a previously funded founder or ex-founder to uncover new companies, investments, boards and referrals.",
      advisor_expert_gap:
        "Identify named professionals who performed the evidenced transaction role and map their relevant deal activity.",
      identity_resolution:
        "Verify a candidate expert's identity, current role, employment history, LinkedIn profile and canonical match.",
      missing_fact_enrichment:
        "Use targeted search and DeepSeek extraction to fill a missing expert or company fact with sourced evidence.",
    };
    const selectedJobType = jobType && objectives[jobType] ? jobType : "deep_discovery";
    const keywordClause = theme
      ? theme.keywords.slice(0, 4).map((keyword) => `"${keyword}"`).join(" OR ")
      : '"clean energy advisory" OR "grid infrastructure" OR "smart water"';
    const defaultQueries: Record<string, string> = {
      founder_origination: `(${keywordClause}) (founder OR ex-founder OR CEO) ("private equity" OR acquisition OR investment) ("new company" OR portfolio OR board OR advisor)`,
      advisor_expert_gap: `(${keywordClause}) ("financial advisor" OR "legal counsel" OR lender OR diligence) (partner OR managing director OR deal team)`,
      identity_resolution: `(${keywordClause}) expert "current role" "public profile" deal team`,
      missing_fact_enrichment:
        targetName && missingFact
          ? targetedFactQueries({
              targetType,
              targetName,
              targetWebsite,
              missingFact,
              keywordClause,
            })[0]
          : `(${keywordClause}) company funding launch date website product status source evidence`,
      deep_discovery: `(${keywordClause}) ("private equity" OR "portfolio company" OR "secondary buyout" OR "majority investment") (advisor OR counsel OR lender OR founder OR CEO)`,
    };
    const targetedQueries =
      selectedJobType === "missing_fact_enrichment" && targetName && missingFact
        ? targetedFactQueries({
            targetType,
            targetName,
            targetWebsite,
            missingFact,
            keywordClause,
          })
        : undefined;

    const backendJobType =
      selectedJobType === "missing_fact_enrichment" ? "entity_refresh" : selectedJobType;

    const job = await callBackendApi<{ id?: string }>("/discovery/jobs", {
      method: "POST",
      body: JSON.stringify({
        job_type: backendJobType,
        theme_id: theme?.id,
        query: query || defaultQueries[selectedJobType],
        target_type: targetType,
        metadata: {
          ...(metadata ?? {}),
          source: "web-discover",
          objective: objectives[selectedJobType],
          requested_job_type: selectedJobType,
          category:
            metadata?.category ??
            (selectedJobType === "missing_fact_enrichment"
              ? targetType === "expert"
                ? "expert-contact-completion"
                : "company-fact-completion"
              : undefined),
          target_type: targetType,
          target_id: targetId,
          target_name: targetName,
          target_website: targetWebsite,
          missing_fact: missingFact,
          queries: targetedQueries,
          extraction_instructions:
            selectedJobType === "missing_fact_enrichment"
              ? [
                  "Use DeepSeek reasoning to decide which source is authoritative for the requested missing fact.",
                  "Extract only facts grounded in the searched source text.",
                  "Return material facts in facts[] using fact_type values such as seed_round, last_funding, total_funding, launch_date, product_live_status, website, logo_url, linkedin, email.",
                  "Use status needs_review in metadata/review systems unless the evidence is primary-source quality.",
                  "Do not infer venture funding from acquisitions, capex plans, or generic investment announcements.",
                ]
              : undefined,
          review_gated: true,
          supabase_write_path:
            "research_jobs -> sources/source_chunks -> discovery_candidates/facts via graph_builder",
        },
      }),
    });

    if (!job) {
      const providerSearch = await safeLiveSearch(query || defaultQueries[selectedJobType]);
      return Response.json(
        {
          error:
            providerSearch.results.length > 0
              ? "Backend enrichment is not connected, but configured live search returned sources for analyst review."
              : "Live enrichment is not connected in this demo. You can still review the static coverage queue and use the suggested searches.",
          demoMode: true,
          candidates: [],
          liveSearch: providerSearch,
        },
        { status: providerSearch.results.length > 0 ? 200 : 503 },
      );
    }

    // Async: return job immediately; client polls /api/research-jobs/{id}
    if (job.id) {
      void callBackendApi(`/jobs/process/${job.id}`, { method: "POST" }).catch(() => undefined);
    }

    return Response.json({
      job,
      async: true,
      pollUrl: job.id ? `/api/research-jobs/${job.id}` : null,
      candidates: [],
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Discovery failed" },
      { status: 500 },
    );
  }
}

function targetedFactQueries({
  targetType,
  targetName,
  targetWebsite,
  missingFact,
  keywordClause,
}: {
  targetType?: "company" | "expert";
  targetName: string;
  targetWebsite?: string;
  missingFact: string;
  keywordClause: string;
}) {
  const name = `"${targetName}"`;
  const websiteDomain = targetWebsite ? safeDomain(targetWebsite) : undefined;
  const field = missingFact.toLowerCase();
  const companyBase = `${name} (${keywordClause})`;
  const siteClause = websiteDomain ? ` OR site:${websiteDomain} ${name}` : "";

  if (targetType === "expert" || /linkedin|email|contact/.test(field)) {
    if (/email/.test(field)) {
      return [
        `${name} email contact biography profile`,
        `${name} ${keywordClause} email`,
        `${name} current role contact public profile`,
      ];
    }
    return [
      `${name} LinkedIn profile current role`,
      `${name} ${keywordClause} LinkedIn`,
      `${name} public profile biography current organization`,
    ];
  }

  if (/seed/.test(field)) {
    return [
      `${companyBase} "seed round" OR "seed funding" OR "pre-seed" OR "raised" ${siteClause}`,
      `${name} "funding round" seed investors total funding`,
      `${name} "Crunchbase" "seed" "funding"`,
    ];
  }
  if (/last funding|funding/.test(field)) {
    return [
      `${companyBase} "last funding" OR "latest funding" OR "raised" OR "investment" ${siteClause}`,
      `${name} "Series" "funding" investors date amount`,
      `${name} "growth investment" "majority investment" "minority investment"`,
    ];
  }
  if (/total/.test(field)) {
    return [
      `${name} "total funding" OR "funding to date" OR "raised to date"`,
      `${name} funding history total investors`,
      `${name} Crunchbase total funding`,
    ];
  }
  if (/launch|founded/.test(field)) {
    return [
      `${companyBase} "founded" OR "launched" OR "established" ${siteClause}`,
      `${name} company founded launch date history`,
      `${name} about us founded launched`,
    ];
  }
  if (/product|live|website/.test(field)) {
    return [
      `${companyBase} official website product platform customers case study ${siteClause}`,
      `${name} product live platform customers`,
      `${name} official website solutions product`,
    ];
  }
  if (/logo/.test(field)) {
    return [
      `${name} official logo brand assets press kit ${siteClause}`,
      `${name} logo company website`,
      `${name} brand assets media kit`,
    ];
  }
  return [
    `${companyBase} ${field} source evidence ${siteClause}`,
    `${name} ${field} public source`,
    `${name} company profile ${field}`,
  ];
}

function safeDomain(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}

async function safeLiveSearch(query: string) {
  const providers = configuredSearchProviders();
  if (!providers.length) return { configured: false, providers, results: [] };
  try {
    const results = await liveSearch(query, 6);
    return { configured: true, providers, results };
  } catch (error) {
    return {
      configured: true,
      providers,
      results: [],
      error: error instanceof Error ? error.message : "Live search failed",
    };
  }
}
