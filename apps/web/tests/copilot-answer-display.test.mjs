import assert from "node:assert/strict";
import test from "node:test";
import {
  buildExpertiseSummary,
  buildLocalOutreachDraft,
  buildMemoCallPlanSummary,
  extractDraftEmailFromTools,
  normalizeAnswerSummary,
  parseEmailFromText,
  resolveDisplaySummary,
  resolveOutreachDraft,
} from "../lib/copilot-answer-display.ts";

test("normalizeAnswerSummary extracts truncated JSON blobs", () => {
  const raw =
    '{ "answer_summary": "Call plan for James Knight: single call to understand market dynamics", "key_findings": [';
  assert.equal(
    normalizeAnswerSummary(raw),
    "Call plan for James Knight: single call to understand market dynamics",
  );
});

test("normalizeAnswerSummary extracts answer_summary from JSON blob", () => {
  const raw = `{ "answer_summary": "Subject: Hello\\n\\nHi James,", "key_findings": [] }`;
  assert.equal(normalizeAnswerSummary(raw), "Subject: Hello\n\nHi James,");
});

test("parseEmailFromText splits subject and body", () => {
  const parsed = parseEmailFromText("Subject: TowerBrook intro\n\nHi James,\n\nQuick note.");
  assert.equal(parsed?.subject, "TowerBrook intro");
  assert.match(parsed?.body ?? "", /Hi James/);
});

test("extractDraftEmailFromTools reads draft_email output", () => {
  const draft = extractDraftEmailFromTools([
    {
      tool_name: "draft_email",
      input: { recipient: "James Knight" },
      output: {
        subject: "Intro",
        body: "Hi James,\n\nWould you have time for a call?",
      },
    },
  ]);
  assert.equal(draft?.subject, "Intro");
  assert.match(draft?.body ?? "", /Would you have time/);
});

test("buildLocalOutreachDraft produces a role-aware email", () => {
  const draft = buildLocalOutreachDraft({
    name: "James Knight",
    title: "Managing Partner & co-founder",
    firm: "Augusta & Co",
    why: "Co-founded Augusta & Co and built a leading European renewables M&A advisory platform.",
    access: "Warm intro via portfolio CFO",
    relatedCompanyNames: ["Augusta & Co"],
    themeName: "Clean Energy Advisory",
    basketCompanyNames: ["Acme Solar"],
  });
  assert.match(draft.subject, /Clean Energy Advisory/);
  assert.match(draft.body, /Hi James/);
  assert.match(draft.body, /Managing Partner/i);
  assert.match(draft.body, /renewables M&A advisory/);
  assert.match(draft.body, /Acme Solar/);
  assert.match(draft.body, /active contact/i);
});

test("resolveOutreachDraft rebuilds from ranked expert when synthesis meta leaks", () => {
  const draft = resolveOutreachDraft({
    intent: "draft_outreach",
    answer_summary:
      '{ "answer_summary": "Yes, here is a full email template for James Knight", "key_findings": [] }',
    input_context: {
      question: "Draft outreach for saved basket",
      objective: "Find experts",
      theme: "Clean Energy Advisory",
      geography: "Europe",
      archetypes: [],
      source_scope: "directory",
    },
    ranked_experts: [
      {
        expert_id: "james-knight",
        rank: 1,
        name: "James Knight",
        title: "Managing Partner & co-founder, Augusta & Co",
        firm: "Augusta & Co (Mizuho)",
        archetype: "Banker",
        relevance: 90,
        access: "Warm intro available",
        momentum: "High",
        why: "Co-founded Augusta & Co and built a leading European renewables M&A advisory platform.",
        citations: [],
      },
    ],
    ranked_companies: [],
    call_sequence: [],
    what_to_listen_for: [],
    gaps: [],
    risks: [],
    sources_used: [],
    confidence: { score: 0.8, label: "High", rationale: "test" },
    assumptions: [],
    follow_up_actions: [],
    grounded: false,
    backend_enriched: true,
    model: "test",
  });
  assert.ok(draft);
  assert.match(draft.body, /renewables M&A advisory/);
  assert.doesNotMatch(draft.body, /here is a full email template/i);
});

test("buildExpertiseSummary lists each named expert with why and specialties", () => {
  const text = buildExpertiseSummary([
    {
      name: "James Knight",
      title: "Managing Partner & co-founder",
      firm: "Augusta & Co",
      archetype: "Banker",
      why: "Co-founder of a leading European renewables M&A boutique.",
      specialties: ["M&A advisory", "Renewables"],
    },
    {
      name: "Nicholas Beatty",
      title: "Co-founder & Chairman",
      firm: "Zenobē",
      archetype: "Ex-founder",
      why: "Co-founded the UK's leading grid-scale battery operator.",
      specialties: ["Battery storage (BESS)", "EV charging infrastructure"],
    },
  ]);
  assert.match(text, /James Knight/);
  assert.match(text, /renewables M&A boutique/i);
  assert.match(text, /Nicholas Beatty/);
  assert.match(text, /Battery storage/);
  assert.doesNotMatch(text, /Call .* first/i);
});

test("resolveDisplaySummary answers expertise questions from ranked experts", () => {
  const text = resolveDisplaySummary({
    intent: "profile_experts",
    input_context: {
      question:
        "What are the specific expertise areas of Nicholas Beatty, Jeff McDermott, and James Knight?",
    },
    answer_summary: "ignored",
    ranked_experts: [
      {
        expert_id: "james-knight",
        name: "James Knight",
        title: "Managing Partner",
        firm: "Augusta & Co",
        archetype: "Banker",
        why: "Renewables M&A advisory.",
      },
    ],
  });
  assert.match(text, /James Knight/);
  assert.match(text, /Renewables M&A advisory/);
  assert.doesNotMatch(text, /Call James Knight first/i);
});

test("buildMemoCallPlanSummary covers unlocks, order, and gaps", () => {
  const text = buildMemoCallPlanSummary({
    experts: [
      {
        expert_id: "james-knight",
        name: "James Knight",
        firm: "Augusta & Co",
        why: "Renewables M&A advisory and buyer-side deal flow.",
      },
    ],
    companies: [],
    gaps: ["Coverage may be thin on buyer-side references."],
    call_sequence: [
      {
        phase: "Call plan",
        expert_ids: ["james-knight"],
        goal: "Validate market dynamics.",
        citations: [],
      },
    ],
    themeName: "Energy transition",
  });
  assert.match(text, /Investment memo \+ call plan/);
  assert.match(text, /James Knight/);
  assert.match(text, /Renewables M&A advisory/);
  assert.match(text, /Evidence gaps to close/);
  assert.match(text, /buyer-side references/);
});

test("resolveDisplaySummary uses memo call plan layout for investment memo prompts", () => {
  const text = resolveDisplaySummary({
    intent: "build_call_plan",
    input_context: {
      question:
        "Draft an investment memo and call plan using these experts: James Knight. Summarise evidence gaps.",
      theme: "Energy transition",
    },
    answer_summary: "ignored",
    ranked_experts: [
      {
        expert_id: "james-knight",
        name: "James Knight",
        firm: "Augusta & Co",
        why: "Renewables M&A advisory.",
      },
    ],
    ranked_companies: [],
    gaps: ["Validate buyer-side references."],
    call_sequence: [
      {
        phase: "Call plan",
        expert_ids: ["james-knight"],
        goal: "Validate market dynamics.",
        citations: [],
      },
    ],
  });
  assert.match(text, /What each expert unlocks/);
  assert.match(text, /James Knight/);
  assert.doesNotMatch(text, /No information on James Knight exists/i);
});

test("resolveDisplaySummary uses memo layout for plain write memo prompts", () => {
  const text = resolveDisplaySummary({
    intent: "build_call_plan",
    input_context: {
      question: "write a memo for me",
      theme: "Clean Energy Advisory",
    },
    answer_summary: "ignored",
    ranked_experts: [
      {
        expert_id: "nicholas-beatty",
        name: "Nicholas Beatty",
        firm: "Zenobe",
        why: "Co-founded a grid-scale battery operator backed by infrastructure capital.",
      },
    ],
    ranked_companies: [],
    gaps: ["Confirm buyer-side references."],
    call_sequence: [
      {
        phase: "Market orientation",
        expert_ids: ["nicholas-beatty"],
        goal: "Validate grid-scale battery demand and diligence gaps.",
        citations: [],
      },
    ],
  });
  assert.match(text, /Investment memo \+ call plan/);
  assert.match(text, /What each expert unlocks/);
  assert.match(text, /Nicholas Beatty/);
  assert.doesNotMatch(text, /^Start with/i);
});

test("resolveDisplaySummary formats call plans from call_sequence", () => {
  const text = resolveDisplaySummary({
    intent: "build_call_plan",
    answer_summary: '{ "answer_summary": "broken json',
    ranked_experts: [{ expert_id: "james-knight", name: "James Knight" }],
    call_sequence: [
      {
        phase: "Call plan",
        expert_ids: ["james-knight"],
        goal: "Validate market dynamics and basket targets.",
        citations: [],
      },
    ],
  });
  assert.match(text, /Call plan for James Knight/);
  assert.match(text, /Validate market dynamics/);
  assert.doesNotMatch(text, /"answer_summary"/);
});

test("resolveOutreachDraft prefers explicit outreach_draft field", () => {
  const answer = resolveOutreachDraft({
    answer_summary: "ignored",
    outreach_draft: { subject: "Saved", body: "Body text" },
  });
  assert.equal(answer?.subject, "Saved");
});
