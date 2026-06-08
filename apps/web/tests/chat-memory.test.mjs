import assert from "node:assert/strict";
import {
  SUMMARIZE_AFTER_PAIRS,
  buildEffectiveChatMemory,
  groupQAPairs,
  heuristicSummarizeConversation,
  questionWithChatMemory,
} from "../lib/chat-memory.ts";

function pairHistory(count) {
  const turns = [];
  for (let index = 0; index < count; index += 1) {
    turns.push({ role: "user", content: `Question ${index + 1}` });
    turns.push({ role: "assistant", content: `Answer ${index + 1} about Expert ${index + 1}` });
  }
  return turns;
}

const fivePairs = buildEffectiveChatMemory(pairHistory(5));
assert.equal(fivePairs.pairsCompressed, 0);
assert.equal(fivePairs.totalPairs, 5);
assert.equal(fivePairs.effectiveHistory.length, 10);

const sixPairs = buildEffectiveChatMemory(pairHistory(6));
assert.equal(sixPairs.pairsCompressed, 4);
assert.equal(sixPairs.totalPairs, 6);
assert.equal(sixPairs.effectiveHistory.length, 4);
assert.ok(sixPairs.summary?.includes("Question 1"));
assert.ok(sixPairs.summary?.includes("Expert 4") === false || sixPairs.summary?.includes("Answer 4"));

const grouped = groupQAPairs(pairHistory(3));
assert.equal(grouped.length, 3);
assert.equal(grouped[0].user, "Question 1");

const prompt = questionWithChatMemory("Follow up", [{ role: "user", content: "Earlier?" }], "Prior theme: grid");
assert.ok(prompt.includes("Prior conversation summary"));
assert.ok(prompt.includes("Earlier?"));

const merged = heuristicSummarizeConversation(
  [{ user: "New ask", assistant: "New answer" }],
  "- User: old → Copilot: kept",
);
assert.ok(merged.includes("old"));
assert.ok(merged.includes("New ask"));

assert.equal(SUMMARIZE_AFTER_PAIRS, 5);

console.log("chat-memory.test.mjs passed");
