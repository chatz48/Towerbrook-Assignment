#!/usr/bin/env node
/**
 * Stress-test /api/ask streaming and JSON endpoints.
 * Usage: node apps/web/scripts/stress-copilot.mjs [baseUrl]
 */

const baseUrl = process.argv[2] ?? "http://localhost:3000";

const QUESTIONS = [
  "Who should I call first for PJM interconnection bottlenecks?",
  "Red-team the grid infrastructure thesis",
  "Find more experts on utility software operators",
  "Which companies are most actionable in smart water?",
  "Build a three-call plan for clean energy advisory",
];

async function askJson(question) {
  const started = Date.now();
  const res = await fetch(`${baseUrl}/api/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question,
      filters: { objective: "Find experts", theme: "grid-infrastructure" },
    }),
  });
  const body = await res.json();
  const toolTrace = body.tool_calls ?? body.tool_trace ?? [];
  return {
    mode: "json",
    ok: res.ok,
    ms: Date.now() - started,
    experts: body.ranked_experts?.length ?? 0,
    intent: body.intent,
    model: body.model,
    backendEnriched: Boolean(body.backend_enriched),
    requestId: body.request_id ?? null,
    keiroLive: toolTrace.some((t) => t.output?.keiro_live),
    tools: toolTrace.length,
    error: body.error,
  };
}

async function askStream(question) {
  const started = Date.now();
  let baselineMs = null;
  let completeMs = null;
  let phases = 0;
  let experts = 0;
  let intent = null;
  let model = null;
  let backendEnriched = false;
  let requestId = null;
  let keiroLive = false;
  let tools = 0;

  const res = await fetch(`${baseUrl}/api/ask?stream=1`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
    body: JSON.stringify({
      question,
      filters: { objective: "Find experts", theme: "grid-infrastructure" },
    }),
  });

  if (!res.ok || !res.body) {
    return { mode: "stream", ok: false, ms: Date.now() - started, error: `HTTP ${res.status}` };
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const blocks = buffer.split("\n\n");
    buffer = blocks.pop() ?? "";
    for (const block of blocks) {
      const lines = block.split("\n");
      const event = lines.find((l) => l.startsWith("event:"))?.slice(6).trim();
      const dataLine = lines.find((l) => l.startsWith("data:"))?.slice(5).trim();
      if (!event || !dataLine) continue;
      const data = JSON.parse(dataLine);
      if (event === "baseline" && baselineMs === null) baselineMs = Date.now() - started;
      if (event === "phase") phases += 1;
      if (event === "complete") {
        completeMs = Date.now() - started;
        experts = data.ranked_experts?.length ?? 0;
        intent = data.intent;
        model = data.model;
        backendEnriched = Boolean(data.backend_enriched);
        requestId = data.request_id ?? null;
        const toolTrace = data.tool_calls ?? data.tool_trace ?? [];
        keiroLive = toolTrace.some((t) => t.output?.keiro_live);
        tools = toolTrace.length;
      }
      if (event === "error") {
        return { mode: "stream", ok: false, ms: Date.now() - started, error: data.message };
      }
    }
  }

  return {
    mode: "stream",
    ok: true,
    ms: completeMs ?? Date.now() - started,
    baselineMs,
    phases,
    experts,
    intent,
    model,
    backendEnriched,
    requestId,
    keiroLive,
    tools,
  };
}

async function stressConcurrent(question, concurrency = 3) {
  const started = Date.now();
  const runs = await Promise.all(Array.from({ length: concurrency }, () => askStream(question)));
  const ok = runs.filter((r) => r.ok).length;
  return { concurrency, ok, ms: Date.now() - started, runs };
}

async function main() {
  console.log(`Stress testing copilot at ${baseUrl}\n`);
  const results = [];

  for (const question of QUESTIONS) {
    const streamResult = await askStream(question);
    results.push({ question, ...streamResult });
    const sseHealthy = streamResult.baselineMs != null && streamResult.phases >= 1;
    console.log(
      `[stream] ${streamResult.ok && sseHealthy ? "OK" : "WARN"} ${streamResult.ms}ms baseline=${streamResult.baselineMs ?? "-"} phases=${streamResult.phases ?? 0} experts=${streamResult.experts ?? 0} intent=${streamResult.intent ?? "-"} enriched=${streamResult.backendEnriched ?? false} tools=${streamResult.tools ?? 0} keiro=${streamResult.keiroLive ?? false} model=${streamResult.model ?? "-"}`,
    );
    if (streamResult.error) console.log(`  error: ${streamResult.error}`);
    if (!sseHealthy) {
      console.log("  warn: response was not SSE (deploy streaming build or check backend wiring)");
    }
  }

  const jsonResult = await askJson(QUESTIONS[0]);
  console.log(
    `\n[json] ${jsonResult.ok ? "OK" : "FAIL"} ${jsonResult.ms}ms experts=${jsonResult.experts} intent=${jsonResult.intent ?? "-"} enriched=${jsonResult.backendEnriched} tools=${jsonResult.tools} keiro=${jsonResult.keiroLive} model=${jsonResult.model ?? "-"}`,
  );

  const burst = await stressConcurrent(QUESTIONS[0], 3);
  console.log(
    `\n[burst] ${burst.ok}/${burst.concurrency} concurrent streams in ${burst.ms}ms`,
  );

  const failed = results.filter((r) => !r.ok).length;
  const weakSse = results.filter((r) => r.baselineMs == null || (r.phases ?? 0) < 1).length;
  console.log(`\n${results.length - failed}/${results.length} stream requests succeeded`);
  if (weakSse) console.log(`${weakSse} stream response(s) missing SSE baseline/phases`);
  process.exit(failed > 0 || weakSse > 0 || burst.ok < burst.concurrency ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
