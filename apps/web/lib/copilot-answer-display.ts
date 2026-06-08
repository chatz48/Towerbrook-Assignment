import type { AskResponse, ToolTrace } from "@/lib/ask-types";

export type OutreachDraft = {
  subject: string;
  body: string;
};

export type OutreachExpertProfile = {
  name: string;
  title: string;
  firm: string;
  why: string;
  access?: string;
  relatedCompanyNames?: string[];
  themeName: string;
  basketCompanyNames: string[];
};

export function looksLikeLeakedSynthesis(text: string): boolean {
  const trimmed = text.trim();
  return (
    trimmed.startsWith("{") ||
    trimmed.includes('"answer_summary"') ||
    trimmed.includes('"key_findings"')
  );
}

function isOutreachMetaSummary(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes("here is a full email template") ||
    lower.includes("email template for") ||
    lower.includes("tailored to the diligence")
  );
}

function unescapeJsonString(value: string): string {
  return value.replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\").trim();
}

function extractAnswerSummaryField(text: string): string | undefined {
  const match = text.match(/"answer_summary"\s*:\s*"((?:\\.|[^"\\])*)"/);
  if (!match?.[1]) return undefined;
  return unescapeJsonString(match[1]);
}

/** Strip accidental JSON wrappers from synthesis output (including truncated blobs). */
export function normalizeAnswerSummary(text: string): string {
  const trimmed = text.trim();
  if (!looksLikeLeakedSynthesis(trimmed)) return text;

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      const parsed = JSON.parse(trimmed.slice(start, end + 1)) as Record<string, unknown>;
      if (typeof parsed.answer_summary === "string" && parsed.answer_summary.trim()) {
        return parsed.answer_summary.trim();
      }
      if (typeof parsed.body === "string" && parsed.body.trim()) {
        return parsed.body.trim();
      }
    } catch {
      // fall through to regex extraction for truncated JSON
    }
  }

  const extracted = extractAnswerSummaryField(trimmed);
  if (extracted) return extracted;

  return text;
}

export function isMemoCallPlanQuestion(question: string): boolean {
  const q = question.toLowerCase();
  return (
    /investment memo|partner memo|memo section|memo and call plan|call brief|what each person unlocks/i.test(q) ||
    /\b(write|draft|prepare|create|build)\s+(a\s+|an\s+)?(partner\s+|investment\s+)?memo\b/.test(q) ||
    /\bmemo\s+(for me|from|using|about|on)\b/.test(q)
  );
}

export function isListenForQuestion(question: string): boolean {
  return /listen for|conviction signal|what to ask on calls/i.test(question);
}

function isThemeGuidanceQuestion(question: string): boolean {
  return /which (specific )?theme|what theme|focus on first|prioriti[sz]e theme|theme should we|which investment theme|start with which theme/i.test(
    question,
  );
}

export function isExpertiseQuestion(question: string): boolean {
  return /expertise|specialt(y|ies)|specific areas|tell me about|who is |background of|what does .+ do|areas of|why is .+ relevant|what .+ known for/i.test(
    question,
  );
}

export function buildExpertiseSummary(
  experts: Array<{
    name: string;
    title: string;
    firm: string;
    archetype: string;
    why: string;
    specialties?: string[];
  }>,
): string {
  if (!experts.length) {
    return "No matching experts in the directory — check spelling or broaden the theme filter.";
  }

  return experts
    .map((expert, index) => {
      const role = [expert.title, expert.firm].filter(Boolean).join(" · ");
      const specialtyLine = expert.specialties?.length
        ? `\n   Specialties: ${expert.specialties.join(", ")}`
        : "";
      return `${index + 1}. ${expert.name}${role ? ` — ${role}` : ""}\n   ${expert.archetype}${specialtyLine}\n   ${expert.why}`;
    })
    .join("\n\n");
}

function listenForSectionIsPrimary(question: string): boolean {
  const q = question.toLowerCase();
  const callsInQuestion = /call plan|call sequence|three-call|prepare a call|prepare calls|call order/.test(
    q,
  );
  return /listen for|conviction signal|what to ask/.test(q) && !callsInQuestion;
}

export function buildListenForSummary(
  experts: AskResponse["ranked_experts"],
  listenFor: AskResponse["what_to_listen_for"],
): string | undefined {
  if (!listenFor?.length) return undefined;
  const name = experts[0]?.name ?? "these experts";
  const lines = listenFor
    .map(
      (item, index) =>
        `${index + 1}. ${item.claim}\n   Raises conviction if: ${item.raises_conviction_if}\n   Reduces conviction if: ${item.reduces_conviction_if}`,
    )
    .join("\n\n");
  return `What to listen for on calls with ${name}:\n\n${lines}`;
}

export function buildMemoCallPlanSummary(input: {
  experts: AskResponse["ranked_experts"];
  companies: AskResponse["ranked_companies"];
  gaps: string[];
  call_sequence: AskResponse["call_sequence"];
  themeName?: string;
}): string {
  const { experts, companies, gaps, call_sequence, themeName } = input;
  if (!experts.length) {
    return "No experts matched — name them in the prompt or save experts to the basket first.";
  }

  const theme = themeName ?? "this theme";
  const unlockLines = experts
    .map((expert, index) => `${index + 1}. ${expert.name} (${expert.firm}) — ${expert.why}`)
    .join("\n");

  const orderLines = call_sequence?.length
    ? call_sequence
        .map((step, index) => {
          const expert = experts.find((item) => step.expert_ids.includes(item.expert_id));
          return `${index + 1}. ${step.phase} — ${expert?.name ?? "Expert"}: ${step.goal}`;
        })
        .join("\n")
    : experts.map((expert, index) => `${index + 1}. ${expert.name}`).join("\n");

  const gapLines = gaps.length
    ? gaps.map((gap, index) => `${index + 1}. ${gap}`).join("\n")
    : "Validate buyer-side references and recent deal activity before partner circulation.";

  const companyNote = companies.length
    ? `\n\nPriority targets: ${companies.map((company) => company.name).join(", ")}.`
    : "";

  return `Investment memo + call plan for ${theme}.

What each expert unlocks:
${unlockLines}

Recommended call order:
${orderLines}

Evidence gaps to close:
${gapLines}${companyNote}`;
}

export function formatCallPlanSummary(answer: AskResponse): string {
  if (!answer.call_sequence?.length) {
    return normalizeAnswerSummary(answer.answer_summary);
  }

  const header =
    answer.ranked_experts.length === 1
      ? `Call plan for ${answer.ranked_experts[0].name}`
      : `Suggested call order (${answer.call_sequence.length} calls)`;

  const lines = answer.call_sequence.map((step, index) => {
    const expert = answer.ranked_experts.find((item) => step.expert_ids.includes(item.expert_id));
    const name = expert?.name ?? "Expert";
    return `${index + 1}. ${step.phase} — ${name}: ${step.goal}`;
  });

  return `${header}\n\n${lines.join("\n")}`;
}

function outreachIntro(answer: AskResponse): string {
  const name = answer.ranked_experts[0]?.name ?? "expert";
  return `Outreach draft for ${name}, grounded in their current role and directory background.`;
}

function isOutreachAnswer(answer: AskResponse): boolean {
  return (
    answer.intent === "draft_outreach" ||
    isOutreachQuestion(answer.input_context?.question ?? "") ||
    Boolean(answer.outreach_draft?.body)
  );
}

/** User-facing prose for chat bubbles — never raw synthesis JSON. */
export function resolveDisplaySummary(answer: AskResponse): string {
  if (isOutreachAnswer(answer) && resolveOutreachDraft(answer)) {
    return outreachIntro(answer);
  }

  const question = answer.input_context?.question ?? "";
  if (answer.intent === "prioritize_theme" || isThemeGuidanceQuestion(question)) {
    const summary = normalizeAnswerSummary(answer.answer_summary);
    if (summary && !looksLikeLeakedSynthesis(summary)) return summary;
  }
  if (
    (answer.intent === "profile_experts" || isExpertiseQuestion(question)) &&
    answer.ranked_experts.length
  ) {
    return buildExpertiseSummary(answer.ranked_experts);
  }

  if (answer.intent === "build_call_plan") {
    if (isListenForQuestion(question) && answer.what_to_listen_for?.length) {
      if (listenForSectionIsPrimary(question)) {
        const name = answer.ranked_experts[0]?.name ?? "these experts";
        return `Conviction signals for calls with ${name}.`;
      }
      const listenSummary = buildListenForSummary(answer.ranked_experts, answer.what_to_listen_for);
      if (listenSummary) return listenSummary;
    }
    if (isMemoCallPlanQuestion(question) && answer.ranked_experts.length) {
      return buildMemoCallPlanSummary({
        experts: answer.ranked_experts,
        companies: answer.ranked_companies,
        gaps: answer.gaps ?? [],
        call_sequence: answer.call_sequence,
        themeName: answer.input_context?.theme,
      });
    }
    if (answer.call_sequence?.length) {
      return formatCallPlanSummary(answer);
    }
  }

  const normalized = normalizeAnswerSummary(answer.answer_summary);

  if (looksLikeLeakedSynthesis(normalized) || looksLikeLeakedSynthesis(answer.answer_summary)) {
    const extracted = extractAnswerSummaryField(answer.answer_summary);
    if (extracted && !isOutreachMetaSummary(extracted) && !looksLikeLeakedSynthesis(extracted)) {
      return extracted;
    }
    return "See the structured sections below for the full answer.";
  }

  if (isOutreachMetaSummary(normalized)) {
    return outreachIntro(answer);
  }

  return normalized;
}

export function resolveCompactDisplaySummary(answer: AskResponse): string {
  if (isOutreachAnswer(answer) && resolveOutreachDraft(answer)) {
    const expert = answer.ranked_experts[0];
    return expert
      ? `Outreach email for ${expert.name} (${expert.title || expert.firm})`
      : "Outreach email draft";
  }

  const full = resolveDisplaySummary(answer);
  if (isMemoCallPlanQuestion(answer.input_context?.question ?? "")) {
    const line = full.split("\n").find((part) => part.trim()) ?? full;
    return line.length > 220 ? `${line.slice(0, 217).trim()}...` : line;
  }
  if (answer.intent === "build_call_plan" && answer.call_sequence?.length) {
    const firstStep = answer.call_sequence[0];
    const expert = answer.ranked_experts.find((item) =>
      firstStep.expert_ids.includes(item.expert_id),
    );
    const name = expert?.name ?? "Expert";
    return `${firstStep.phase} with ${name} — ${firstStep.goal}`;
  }
  const line = full.split("\n").find((part) => part.trim()) ?? full;
  return line.length > 220 ? `${line.slice(0, 217).trim()}…` : line;
}

export function buildOutreachDraftFromAnswer(answer: AskResponse): OutreachDraft | undefined {
  const expert = answer.ranked_experts[0];
  if (!expert) return undefined;

  return buildLocalOutreachDraft({
    name: expert.name,
    title: expert.title,
    firm: expert.firm,
    why: expert.why,
    access: expert.access,
    relatedCompanyNames: answer.ranked_companies.map((company) => company.name),
    themeName: answer.input_context.theme,
    basketCompanyNames: answer.ranked_companies.map((company) => company.name),
  });
}

export function sanitizeAnswerForDisplay(answer: AskResponse): AskResponse {
  const outreach_draft =
    answer.outreach_draft?.body && !isOutreachMetaSummary(answer.outreach_draft.body)
      ? answer.outreach_draft
      : resolveOutreachDraft(answer);

  const answer_summary = outreach_draft
    ? outreachIntro({ ...answer, outreach_draft })
    : resolveDisplaySummary(answer);

  return {
    ...answer,
    outreach_draft,
    answer_summary,
    grounded: outreach_draft ? true : answer.grounded,
    backend_enriched: outreach_draft ? false : answer.backend_enriched,
  };
}

export function parseEmailFromText(text: string): OutreachDraft | undefined {
  const normalized = normalizeAnswerSummary(text).trim();
  if (!normalized || isOutreachMetaSummary(normalized)) return undefined;

  const subjectBody = normalized.match(/^Subject:\s*(.+?)(?:\r?\n\r?\n|\r?\n)([\s\S]+)$/i);
  if (subjectBody) {
    return {
      subject: subjectBody[1].trim(),
      body: subjectBody[2].trim(),
    };
  }

  if (/^hi [a-z]/i.test(normalized) || /^dear /i.test(normalized)) {
    const firstLine = normalized.split(/\r?\n/)[0]?.trim() ?? "Outreach email";
    return {
      subject: firstLine.length > 80 ? "Outreach email" : firstLine,
      body: normalized,
    };
  }

  return undefined;
}

export function extractDraftEmailFromTools(
  toolCalls?: ToolTrace[],
): OutreachDraft | undefined {
  const draft = toolCalls?.find((call) => call.tool_name === "draft_email");
  if (!draft?.output) return undefined;

  const body = typeof draft.output.body === "string" ? draft.output.body.trim() : "";
  if (!body || isOutreachMetaSummary(body)) return undefined;

  const subject =
    typeof draft.output.subject === "string" && draft.output.subject.trim()
      ? draft.output.subject.trim()
      : "Outreach email";

  return { subject, body: normalizeAnswerSummary(body) };
}

export function resolveOutreachDraft(answer: AskResponse): OutreachDraft | undefined {
  if (answer.outreach_draft?.body && !isOutreachMetaSummary(answer.outreach_draft.body)) {
    return answer.outreach_draft;
  }

  const fromTools = extractDraftEmailFromTools(answer.tool_calls);
  if (fromTools) return fromTools;

  const fromText = parseEmailFromText(answer.answer_summary);
  if (fromText) return fromText;

  if (isOutreachAnswer(answer) || looksLikeLeakedSynthesis(answer.answer_summary)) {
    return buildOutreachDraftFromAnswer(answer);
  }

  return undefined;
}

export function isOutreachQuestion(question: string): boolean {
  return /draft.*(outreach|email)|outreach email|email template|full email|write.*email|linkedin outreach/i.test(
    question,
  );
}

export function buildLocalOutreachDraft(profile: OutreachExpertProfile): OutreachDraft {
  const first = profile.name.split(" ")[0] || profile.name;
  const role = [profile.title, profile.firm ? `at ${profile.firm}` : ""]
    .filter(Boolean)
    .join(" ")
    .trim();
  const involvement = profile.why.trim() || "your track record in this sector";
  const contactTargets = [
    ...profile.basketCompanyNames,
    ...(profile.relatedCompanyNames ?? []),
  ].filter((name, index, list) => list.indexOf(name) === index);

  const contactAsk = contactTargets.length
    ? `whether you still have active contact with teams at ${contactTargets.slice(0, 2).join(" or ")}, and who else we should be speaking with`
    : "which operators, advisers, or buyers you would call first in this market, and who you could introduce us to";

  const accessNote = profile.access?.toLowerCase().includes("via")
    ? ` I understand ${profile.access.toLowerCase()}.`
    : "";

  return {
    subject: `${profile.themeName} — perspective from ${profile.firm || profile.name}`,
    body: `Hi ${first},

I'm with TowerBrook's investment team. We're diligencing ${profile.themeName.toLowerCase()} and reached out because of your current role as ${role || "a relevant operator/adviser in the space"}.

Our directory notes that ${involvement.endsWith(".") ? involvement.slice(0, -1) : involvement}. I'd value 25 minutes to pressure-test that view and hear what you are seeing on the ground today.

In particular, I'd welcome your read on ${contactAsk}.${accessNote}

Happy to work around your schedule.

Best regards,
[Your name]
TowerBrook`,
  };
}
