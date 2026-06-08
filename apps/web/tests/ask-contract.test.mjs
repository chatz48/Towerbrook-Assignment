import assert from "node:assert/strict";
import test from "node:test";

const BASE_URL = process.env.ASK_TEST_BASE_URL ?? "http://localhost:3000";

const REQUIRED_ASK_KEYS = [
  "intent",
  "answer_summary",
  "ranked_experts",
  "ranked_companies",
  "sources_used",
  "confidence",
  "grounded",
  "model",
];

test("AskResponse contract shape", async (t) => {
  let response;
  try {
    response = await fetch(`${BASE_URL}/api/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: "Who should I call first for grid interconnection?",
        filters: {
          objective: "Find experts",
          theme: "grid-infrastructure",
          geography: "North America",
          archetypes: ["operator", "advisor"],
          includeTowerBrookEmployees: false,
        },
      }),
      signal: AbortSignal.timeout(120_000),
    });
  } catch (error) {
    t.skip(`Ask API unavailable at ${BASE_URL}: ${error.message}`);
    return;
  }

  assert.equal(response.status, 200);
  const body = await response.json();
  for (const key of REQUIRED_ASK_KEYS) {
    assert.ok(key in body, `missing ${key}`);
  }
  assert.ok(Array.isArray(body.ranked_experts));
  assert.ok(body.ranked_experts.length > 0);
  assert.ok(typeof body.ranked_experts[0].expert_id === "string");
});
