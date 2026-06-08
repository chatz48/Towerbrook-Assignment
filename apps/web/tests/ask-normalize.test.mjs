import assert from "node:assert/strict";
import test from "node:test";
import { normalizeModelResponse } from "../lib/ask-normalize.ts";

const baseline = {
  answer_summary: "Start with Alice.",
  ranked_experts: [{ expert_id: "alice", name: "Alice", rank: 1, citations: ["S1"] }],
  ranked_companies: [{ company_id: "acme", name: "Acme", rank: 1, citations: [] }],
  sources_used: [{ source_id: "S1", title: "Source", publisher: "Pub", url: "", source_type: "test", snippet: "", entities: [], confidence: 0.8 }],
  call_sequence: [{ phase: "Call", expert_ids: ["alice"], goal: "Test", citations: ["S1", "P9"] }],
  what_to_listen_for: [],
  gaps: [],
  risks: [],
  assumptions: [],
  follow_up_actions: [],
  confidence: { score: 0.8, label: "High", rationale: "test" },
  intent: "find_experts",
  generated_at: new Date().toISOString(),
  input_context: {
    question: "test",
    objective: "Find experts",
    theme: "All",
    geography: "Global",
    archetypes: [],
    source_scope: "local",
  },
  grounded: false,
  model: "test-model",
};

test("normalizeModelResponse strips hallucinated expert ids", () => {
  const result = normalizeModelResponse(
    {
      answer_summary: "Refined summary",
      ranked_experts: [
        { expert_id: "fake-person", name: "Fake" },
        { expert_id: "alice", name: "Alice" },
      ],
    },
    baseline,
  );
  assert.equal(result.answer_summary, baseline.answer_summary);
  assert.equal(result.ranked_experts.length, 1);
  assert.equal(result.ranked_experts[0].expert_id, "alice");
  assert.deepEqual(result.sources_used, baseline.sources_used);
});

test("normalizeModelResponse strips invalid citations from call_sequence", () => {
  const result = normalizeModelResponse(
    {
      call_sequence: [{ phase: "Call", expert_ids: ["alice"], goal: "Test", citations: ["S1", "P9"] }],
    },
    baseline,
  );
  assert.deepEqual(result.call_sequence[0].citations, ["S1"]);
});

test("normalizeModelResponse falls back when model returns garbage", () => {
  const result = normalizeModelResponse(null, baseline);
  assert.equal(result.answer_summary, baseline.answer_summary);
});
