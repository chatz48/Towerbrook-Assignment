import assert from "node:assert/strict";
import test from "node:test";
import { inferIntent, isChitchatQuestion, isWarmIntroQuestion, resolveObjective } from "../lib/answer-focus.ts";

test("resolveObjective infers Prepare calls when filters still say Find experts", () => {
  assert.equal(
    resolveObjective("Find experts", "Prepare a call plan from the saved basket: call order and objectives."),
    "Prepare calls",
  );
});

test("resolveObjective keeps explicit non-default objective", () => {
  assert.equal(resolveObjective("Map companies", "Who should I call first?"), "Map companies");
});

test("inferIntent routes basket call plan to build_call_plan", () => {
  assert.equal(
    inferIntent("Prepare a call plan from the saved basket", "Prepare calls"),
    "build_call_plan",
  );
});

test("inferIntent routes plain memo prompts to memo-style call plan", () => {
  assert.equal(resolveObjective("Find experts", "write a memo for me"), "Prepare calls");
  assert.equal(inferIntent("write a memo for me", "Prepare calls"), "build_call_plan");
});

test("inferIntent routes theme focus questions to prioritize_theme", () => {
  assert.equal(
    inferIntent("Which specific theme should we focus on first?", "Find experts"),
    "prioritize_theme",
  );
});

test("inferIntent routes warm intro prompts to warm_intro_paths", () => {
  assert.equal(
    inferIntent("Which warm intro paths are strongest?", "Find experts"),
    "warm_intro_paths",
  );
  assert.equal(
    resolveObjective("Find experts", "Which warm intro paths are strongest?"),
    "Prepare calls",
  );
});

test("warm intro detection avoids generic grid connection questions", () => {
  assert.equal(isWarmIntroQuestion("Who should I call first for grid connection delays?"), false);
  assert.equal(isWarmIntroQuestion("Who can introduce us to Envevo?"), true);
});

test("inferIntent routes greetings to chitchat", () => {
  assert.equal(inferIntent("Hello!", "Find experts"), "chitchat");
  assert.equal(inferIntent("Thanks — that helps.", "Find experts"), "chitchat");
});

test("chitchat detection excludes workflow questions", () => {
  assert.equal(isChitchatQuestion("Hello!"), true);
  assert.equal(isChitchatQuestion("Who should I call first?"), false);
  assert.equal(isChitchatQuestion("Which companies are most actionable?"), false);
  assert.equal(isChitchatQuestion("Warm intros"), false);
});

test("resolveObjective does not treat reduce conviction as red-team", () => {
  assert.equal(
    resolveObjective(
      "Find experts",
      "Prepare a call plan: objectives and what would raise or reduce conviction.",
    ),
    "Prepare calls",
  );
});
