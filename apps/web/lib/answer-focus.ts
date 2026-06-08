/** Which answer sections match what the user actually asked for. */
export type SectionKey =
  | "experts"
  | "companies"
  | "callSequence"
  | "listenFor"
  | "gapsRisks"
  | "sources";

export type SectionMode = "primary" | "expandable" | "hidden";

export type SectionPlan = {
  mode: SectionMode;
  limit: number;
};

const HIDDEN: SectionPlan = { mode: "hidden", limit: 0 };
const expandable = (limit: number): SectionPlan => ({ mode: "expandable", limit });
const primary = (limit: number): SectionPlan => ({ mode: "primary", limit });

/** Prefer question-derived objective when filters still carry the workspace default. */
export function resolveObjective(stated: string | undefined, question: string): string {
  const inferred = inferObjectiveFromQuestion(question);
  if (!stated || stated === "Find experts") return inferred;
  return stated;
}

export function inferObjectiveFromQuestion(question: string): string {
  const q = question.toLowerCase();
  if (isMemoDraftQuestion(question)) {
    return "Prepare calls";
  }
  if (isWarmIntroQuestion(question)) return "Prepare calls";
  if (q.includes("company") || q.includes("target")) return "Map companies";
  if (/red[- ]team|\brisk\b|disconfirm|bear case/.test(q)) return "Red-team thesis";
  if (/call plan|prepare calls|call order|outreach|listen for|\bcall\b|\bprep\b/.test(q)) {
    return "Prepare calls";
  }
  return "Find experts";
}

export function isChitchatQuestion(question: string): boolean {
  const q = question.trim().toLowerCase();
  if (!q || q.length > 240) return false;

  if (
    /expert|compan(y|ies)|target|call plan|memo|outreach|intro|introduction|warm path|basket|who should|investment|deal|diligence|ranked|graph|sourc|validate|actionable|listen for|red[- ]team|disconfirm|bear case|expertise|specialt|theme should|which theme|focus on first/i.test(
      q,
    )
  ) {
    return false;
  }

  const patterns = [
    /^(hi|hello|hey|howdy|good (morning|afternoon|evening))\b/,
    /^thanks?( you)?[!.\s]*$/i,
    /\bthank you\b/,
    /\bhow are you\b/,
    /\bwhat can you (do|help)\b/,
    /\bhow (do|can) (you|i) (work|use)\b/,
    /\bwho are you\b/,
    /\bnice to meet\b/,
    /^(ok|okay|got it|sounds good|great|perfect|cool|lovely)[!.\s]*$/i,
    /\byou're welcome\b/,
    /\bno problem\b/,
  ];
  if (patterns.some((pattern) => pattern.test(q))) return true;

  const wordCount = q.split(/\s+/).length;
  if (wordCount <= 5 && !q.includes("?")) return true;

  return false;
}

export function inferIntent(question: string, objective: string): string {
  if (isChitchatQuestion(question)) return "chitchat";

  const q = question.toLowerCase();
  if (isWarmIntroQuestion(question)) return "warm_intro_paths";
  if (objective === "Map companies" || /compan(y|ies)|target|actionable/.test(q)) {
    if (objective === "Map companies" || (/(compan(y|ies)|target)/.test(q) && !/who should|call|expert/.test(q))) {
      return "map_companies";
    }
  }
  if (objective === "Red-team thesis" || /red team|red-team|disconfirm|bear case/.test(q)) {
    return "red_team";
  }
  if (
    objective === "Prepare calls" ||
    /call plan|three-call|call sequence|memo and call plan|call brief/i.test(q) ||
    isMemoDraftQuestion(question)
  ) {
    return "build_call_plan";
  }
  if (/listen for|conviction signal|what to ask/.test(q)) {
    return "build_call_plan";
  }
  if (/draft.*(outreach|email)|outreach email|email template|full email|write.*email|linkedin outreach/i.test(q)) {
    return "draft_outreach";
  }
  if (
    /expertise|specialt(y|ies)|specific areas|tell me about|who is |background of|what does .+ do|what .+ known for/i.test(
      q,
    )
  ) {
    return "profile_experts";
  }
  if (
    /which (specific )?theme|what theme|focus on first|prioriti[sz]e theme|theme should we|which investment theme|start with which theme/i.test(
      q,
    )
  ) {
    return "prioritize_theme";
  }
  return "find_experts";
}

export function isWarmIntroQuestion(question: string): boolean {
  const q = question.toLowerCase();
  return (
    /\bwarm\s+(intro|introduction|path|route|access)\b/.test(q) ||
    /\b(intro|introduction)\s+(path|route|paths|routes)\b/.test(q) ||
    /\b(strongest|best)\s+(intro|introduction|access)\s+(path|route|paths|routes)\b/.test(q) ||
    /\bwho\s+can\s+(introduce|connect)\s+us\b/.test(q)
  );
}

export function isMemoDraftQuestion(question: string): boolean {
  const q = question.toLowerCase();
  return (
    /investment memo|partner memo|memo section|memo and call plan/i.test(q) ||
    /\b(write|draft|prepare|create|build)\s+(a\s+|an\s+)?(partner\s+|investment\s+)?memo\b/.test(q) ||
    /\bmemo\s+(for me|from|using|about|on)\b/.test(q)
  );
}

/** Primary sections open by default; supplementary sections stay collapsed until expanded. */
export function planSections(question: string, objective: string): Record<SectionKey, SectionPlan> {
  const intent = inferIntent(question, objective);
  const q = question.toLowerCase();
  const mentionsCompanies =
    objective === "Map companies" || /compan(y|ies)|target|actionable/.test(q);
  const callsInQuestion = /call plan|call sequence|three-call|prepare a call|prepare calls|call order/.test(
    q,
  );
  const mentionsCalls = objective === "Prepare calls" || callsInQuestion;
  const mentionsListen = /listen for|conviction signal|what to ask/.test(q);
  const mentionsRisks =
    objective === "Red-team thesis" || /risk|red team|disconfirm|bear case|\bgaps?\b/.test(q);

  const sources = expandable(6);

  if (intent === "chitchat") {
    return {
      experts: HIDDEN,
      companies: HIDDEN,
      callSequence: HIDDEN,
      listenFor: HIDDEN,
      gapsRisks: HIDDEN,
      sources: HIDDEN,
    };
  }

  if (intent === "map_companies") {
    return {
      experts: /expert|call|who/.test(q) ? expandable(3) : expandable(2),
      companies: primary(4),
      callSequence: HIDDEN,
      listenFor: HIDDEN,
      gapsRisks: HIDDEN,
      sources,
    };
  }

  if (intent === "build_call_plan") {
    const listenPrimary = mentionsListen && !callsInQuestion;
    const memoStyle = isMemoDraftQuestion(question) || /what each person unlocks/i.test(q);
    return {
      experts: memoStyle ? primary(4) : expandable(4),
      companies: mentionsCompanies ? expandable(3) : expandable(2),
      callSequence: listenPrimary ? expandable(3) : primary(3),
      listenFor: listenPrimary ? primary(1) : mentionsListen ? expandable(1) : HIDDEN,
      gapsRisks: mentionsRisks || memoStyle ? primary(2) : HIDDEN,
      sources: expandable(4),
    };
  }

  if (intent === "warm_intro_paths") {
    return {
      experts: primary(5),
      companies: HIDDEN,
      callSequence: HIDDEN,
      listenFor: HIDDEN,
      gapsRisks: expandable(2),
      sources: expandable(6),
    };
  }

  if (intent === "red_team") {
    return {
      experts: expandable(3),
      companies: mentionsCompanies ? expandable(2) : HIDDEN,
      callSequence: HIDDEN,
      listenFor: HIDDEN,
      gapsRisks: primary(2),
      sources,
    };
  }

  if (intent === "draft_outreach") {
    return {
      experts: primary(3),
      companies: mentionsCompanies ? expandable(2) : HIDDEN,
      callSequence: HIDDEN,
      listenFor: HIDDEN,
      gapsRisks: HIDDEN,
      sources: expandable(4),
    };
  }

  if (intent === "profile_experts") {
    return {
      experts: primary(6),
      companies: mentionsCompanies ? expandable(2) : HIDDEN,
      callSequence: HIDDEN,
      listenFor: HIDDEN,
      gapsRisks: HIDDEN,
      sources: expandable(4),
    };
  }

  if (intent === "prioritize_theme") {
    return {
      experts: expandable(3),
      companies: expandable(3),
      callSequence: HIDDEN,
      listenFor: HIDDEN,
      gapsRisks: HIDDEN,
      sources: HIDDEN,
    };
  }

  return {
    experts: primary(3),
    companies: mentionsCompanies ? expandable(3) : expandable(2),
    callSequence: mentionsCalls ? expandable(3) : HIDDEN,
    listenFor: mentionsListen ? expandable(1) : HIDDEN,
    gapsRisks: mentionsRisks ? expandable(2) : HIDDEN,
    sources,
  };
}
