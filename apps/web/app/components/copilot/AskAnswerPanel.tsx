"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { WorkspaceActionButton } from "@/app/components/InvestorWorkspaceTray";
import { copilotTrustLabel } from "@/lib/copilot-copy";
import {
  resolveCompactDisplaySummary,
  resolveDisplaySummary,
  resolveOutreachDraft,
} from "@/lib/copilot-answer-display";
import { planSections, type SectionMode } from "@/lib/answer-focus";
import type { AskResponse, ToolTrace } from "./types";
import { formatTime, themeLabel } from "./utils";

export function AskAnswerPanel({
  answer,
  onSourceSelect,
  onPrompt,
  compact = false,
}: {
  answer: AskResponse;
  onSourceSelect: (sourceId: string) => void;
  onPrompt: (prompt: string) => void;
  compact?: boolean;
}) {
  const theme = themeLabel(answer.input_context.theme);
  const sections = planSections(answer.input_context.question, answer.input_context.objective);
  const followUps = answer.follow_up_actions.slice(0, 3);
  const outreachDraft = resolveOutreachDraft(answer);
  const displaySummary = resolveDisplaySummary(answer);
  const compactSummary = resolveCompactDisplaySummary(answer);

  if (compact) {
    return (
      <div className="rounded-md border border-line bg-paper px-3 py-2">
        <p className="text-[13px] leading-relaxed text-ink-soft">{compactSummary}</p>
        {outreachDraft ? (
          <p className="mt-1 text-[11px] text-ink-faint">Email draft included — expand for full text.</p>
        ) : null}
        {answer.ranked_experts.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
            <span className="text-ink-faint">{answer.ranked_experts.length} experts</span>
            <Link href="/experts?readiness=actionable" className="font-semibold text-accent hover:underline">
              Open call list
            </Link>
          </div>
        ) : null}
      </div>
    );
  }

  const expertPreview = answer.ranked_experts
    .slice(0, 3)
    .map((expert) => expert.name)
    .join(", ");
  const companyPreview = answer.ranked_companies
    .slice(0, 2)
    .map((company) => company.name)
    .join(", ");

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start gap-3">
        <Avatar label="EE" active />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold">Expert Engine</span>
            <span className="text-ink-faint">{formatTime(answer.generated_at)}</span>
            <span
              data-testid="copilot-trust-badge"
              className="rounded-full border border-line px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-soft"
            >
              {copilotTrustLabel(answer)}
            </span>
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink">{displaySummary}</p>
          <AnswerMetaStrip answer={answer} />
          {outreachDraft ? <OutreachEmailDraft draft={outreachDraft} /> : null}
          {answer.backend_error ? (
            <p className="mt-2 text-[11px] font-semibold text-amber-800">
              Live research unavailable: {answer.backend_error}
            </p>
          ) : null}
        </div>
      </div>

      {followUps.length > 0 ? (
        <div className="rounded-lg border border-line bg-paper p-3">
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
            Suggested follow-ups
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {followUps.map((action) => (
              <button
                key={action.action}
                type="button"
                onClick={() => onPrompt(action.prompt)}
                className="rounded border border-line bg-white px-3 py-2 text-left text-xs text-ink-soft transition hover:border-accent hover:text-accent"
              >
                {action.prompt}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {sections.experts.mode !== "hidden" && answer.ranked_experts.length > 0 ? (
        <Panel
          title="Ranked experts"
          meta={`${answer.ranked_experts.length} to call`}
          mode={sections.experts.mode}
          preview={expertPreview}
          testId="ranked-experts"
        >
          <ul className="space-y-2">
            {answer.ranked_experts.map((expert) => (
              <li
                key={expert.expert_id}
                className="flex flex-wrap items-start gap-3 rounded border border-line bg-paper px-3 py-2"
              >
                <span className="font-mono text-sm text-accent">{expert.rank}</span>
                <div className="min-w-0 flex-1">
                  <Link href={`/experts/${expert.expert_id}`} className="font-semibold text-accent hover:underline">
                    {expert.name}
                  </Link>
                  <p className="mt-0.5 text-[11px] text-ink-faint">
                    {expert.title} · {expert.firm}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <EvidencePill label={expert.access} tone="accent" />
                    <EvidencePill label={`${expert.relevance}% relevance`} />
                    {expert.citations.length ? (
                      <EvidencePill label={`${expert.citations.length} citation${expert.citations.length === 1 ? "" : "s"}`} />
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-ink-soft">{expert.why}</p>
                </div>
                <WorkspaceActionButton
                  item={{
                    id: expert.expert_id,
                    kind: "call",
                    name: expert.name,
                    sub: `${expert.title}, ${expert.firm}`,
                    href: `/experts/${expert.expert_id}`,
                    theme,
                    note: expert.why,
                    status: "call shortlist",
                  }}
                  className="rounded border border-line bg-white px-2 py-1.5 text-[11px] font-semibold text-ink-soft hover:border-accent hover:text-accent"
                >
                  Save
                </WorkspaceActionButton>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      {sections.companies.mode !== "hidden" && answer.ranked_companies.length > 0 ? (
        <Panel title="Ranked companies" meta="Targets" mode={sections.companies.mode} preview={companyPreview}>
          <ul className="space-y-2">
            {answer.ranked_companies.map((company) => (
              <li
                key={company.company_id}
                className="flex flex-wrap items-start gap-3 rounded border border-line bg-paper px-3 py-2"
              >
                <span className="font-mono text-sm text-accent">{company.rank}</span>
                <div className="min-w-0 flex-1">
                  <Link href={`/companies/${company.company_id}`} className="font-semibold text-accent hover:underline">
                    {company.name}
                  </Link>
                  <p className="mt-0.5 text-[11px] text-ink-faint">
                    {company.category} · {company.stage}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <EvidencePill label={`${Math.round(company.confidence * 100)}% confidence`} />
                    <EvidencePill label={`${company.expert_density} linked expert${company.expert_density === 1 ? "" : "s"}`} />
                    {company.citations.length ? (
                      <EvidencePill label={`${company.citations.length} citation${company.citations.length === 1 ? "" : "s"}`} />
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-ink-soft">{company.why}</p>
                </div>
                <WorkspaceActionButton
                  item={{
                    id: company.company_id,
                    kind: "target",
                    name: company.name,
                    sub: `${company.category} / ${company.stage}`,
                    href: `/companies/${company.company_id}`,
                    theme,
                    note: company.why,
                    status: "copilot target",
                  }}
                  className="rounded border border-line bg-white px-2 py-1.5 text-[11px] font-semibold text-ink-soft hover:border-accent hover:text-accent"
                >
                  Save
                </WorkspaceActionButton>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      {sections.callSequence.mode !== "hidden" && answer.call_sequence.length > 0 ? (
        <Panel
          title="Suggested call sequence"
          meta={`${answer.call_sequence.length} phase${answer.call_sequence.length === 1 ? "" : "s"}`}
          mode={sections.callSequence.mode}
          preview={answer.call_sequence.map((step) => step.phase).join(" → ")}
        >
          <div className="space-y-2">
            {answer.call_sequence.map((step, index) => {
              const expertNames = step.expert_ids
                .map((id) => answer.ranked_experts.find((expert) => expert.expert_id === id)?.name)
                .filter(Boolean)
                .join(", ");
              return (
                <div key={`${step.phase}-${index}`} className="rounded border border-line bg-paper p-3">
                  <div className="text-xs font-semibold">
                    {index + 1}. {step.phase}
                  </div>
                  {expertNames ? <div className="mt-0.5 text-[11px] text-ink-faint">{expertNames}</div> : null}
                  <p className="mt-1 text-xs leading-relaxed text-ink-soft">{step.goal}</p>
                </div>
              );
            })}
          </div>
        </Panel>
      ) : null}

      {sections.listenFor.mode !== "hidden" && answer.what_to_listen_for.length > 0 ? (
        <Panel
          title="What to listen for"
          meta="On calls"
          mode={sections.listenFor.mode}
          preview="Conviction signals for expert calls"
        >
          <div className="space-y-2">
            {answer.what_to_listen_for.map((item) => (
              <div key={item.claim} className="rounded border border-line bg-paper p-3 text-xs leading-relaxed text-ink-soft">
                <p className="font-semibold text-ink">{item.claim}</p>
                <p className="mt-1">
                  <span className="font-semibold text-emerald-700">Raises:</span> {item.raises_conviction_if}
                </p>
                <p className="mt-1">
                  <span className="font-semibold text-orange-700">Reduces:</span> {item.reduces_conviction_if}
                </p>
              </div>
            ))}
          </div>
        </Panel>
      ) : null}

      {sections.gapsRisks.mode !== "hidden" && (answer.gaps.length > 0 || answer.risks.length > 0) ? (
        <Panel
          title="Gaps and risks"
          meta={answer.confidence.label}
          mode={sections.gapsRisks.mode}
          preview={answer.gaps[0] ?? answer.risks[0]?.risk}
        >
          {answer.gaps.length > 0 ? (
            <ul className="space-y-1.5 text-xs leading-relaxed text-ink-soft">
              {answer.gaps.map((gap) => (
                <li key={gap}>{gap}</li>
              ))}
            </ul>
          ) : null}
          {answer.risks.map((risk) => (
            <div key={risk.risk} className="mt-2 rounded border border-line bg-paper p-2 text-xs">
              <div className="font-semibold text-ink">{risk.risk}</div>
              <p className="mt-1 text-ink-soft">{risk.why_it_matters}</p>
            </div>
          ))}
        </Panel>
      ) : null}

      {sections.sources.mode !== "hidden" && answer.sources_used.length > 0 ? (
        <Panel
          title="Sources cited"
          meta={`${answer.sources_used.length} records`}
          mode={sections.sources.mode}
          preview={answer.sources_used
            .slice(0, 2)
            .map((source) => source.title)
            .join(" · ")}
          citations={answer.sources_used.map((source) => source.source_id)}
          onSourceSelect={onSourceSelect}
        >
          <ul className="space-y-2">
            {answer.sources_used.map((source) => (
              <li key={source.source_id} className="rounded border border-line bg-paper px-3 py-2 text-xs">
                <button
                  type="button"
                  onClick={() => onSourceSelect(source.source_id)}
                  className="font-mono text-[11px] font-semibold text-accent hover:underline"
                >
                  [{source.source_id.replace("S", "")}]
                </button>{" "}
                <a href={source.url} target="_blank" rel="noreferrer" className="font-semibold text-ink hover:text-accent">
                  {source.title}
                </a>
                {source.snippet ? (
                  <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-ink-soft">{source.snippet}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      {answer.structured?.key_findings?.length ? (
        <Panel
          title="Key findings"
          meta={`${answer.structured.key_findings.length} points`}
          mode="expandable"
          preview={answer.structured.key_findings[0]}
        >
          <ul className="list-disc space-y-1 pl-4 text-xs leading-relaxed text-ink-soft">
            {answer.structured.key_findings.map((finding) => (
              <li key={finding}>{finding}</li>
            ))}
          </ul>
        </Panel>
      ) : null}

      {answer.tool_calls?.length ? (
        <ToolTracePanel traces={answer.tool_calls} />
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Link href="/experts?readiness=actionable" className="ee-button ee-button-secondary min-h-7 px-2.5 text-[11px]">
          Open call list
        </Link>
        <WorkspaceActionButton
          item={{
            id: `copilot-${answer.generated_at}`,
            kind: "memo",
            name: `Copilot brief: ${theme}`,
            sub: answer.input_context.question,
            href: "/ask",
            theme,
            note: answer.answer_summary,
            status: "memo input",
          }}
          className="ee-button ee-button-secondary min-h-8 px-3 text-xs"
        >
          Save to basket
        </WorkspaceActionButton>
      </div>
    </div>
  );
}

function OutreachEmailDraft({ draft }: { draft: { subject: string; body: string } }) {
  return (
    <div
      className="mt-3 rounded-lg border border-line bg-paper"
      data-testid="outreach-email-draft"
    >
      <div className="border-b border-line px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
        Email draft
      </div>
      <div className="space-y-3 px-4 py-3 font-mono text-[13px] leading-relaxed text-ink">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-faint">
            Subject
          </span>
          <p className="mt-1 text-ink">{draft.subject}</p>
        </div>
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-faint">
            Body
          </span>
          <pre className="mt-1 whitespace-pre-wrap font-sans text-sm leading-relaxed text-ink-soft">
            {draft.body}
          </pre>
        </div>
      </div>
    </div>
  );
}

function AnswerMetaStrip({ answer }: { answer: AskResponse }) {
  const items = [
    answer.grounded
      ? "Directory grounded"
      : answer.backend_enriched
        ? "Live synthesis"
        : "AI-assisted",
    `${answer.confidence.label} confidence`,
    `${answer.ranked_experts.length} expert${answer.ranked_experts.length === 1 ? "" : "s"}`,
    answer.ranked_companies.length
      ? `${answer.ranked_companies.length} compan${answer.ranked_companies.length === 1 ? "y" : "ies"}`
      : null,
    answer.sources_used.length
      ? `${answer.sources_used.length} source${answer.sources_used.length === 1 ? "" : "s"}`
      : null,
  ].filter((item): item is string => Boolean(item));

  return (
    <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Answer evidence summary">
      {items.map((item, index) => (
        <EvidencePill
          key={item}
          label={item}
          tone={index === 0 && answer.grounded ? "success" : index === 0 ? "accent" : "neutral"}
        />
      ))}
    </div>
  );
}

function EvidencePill({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "accent" | "success";
}) {
  const toneClass =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "accent"
        ? "border-accent/20 bg-[#eef5ff] text-accent"
        : "border-line bg-white text-ink-faint";

  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${toneClass}`}>
      {label}
    </span>
  );
}

function Panel({
  title,
  meta,
  mode,
  preview,
  citations,
  children,
  onSourceSelect,
  testId,
}: {
  title: string;
  meta?: string;
  mode: SectionMode;
  preview?: string;
  citations?: string[];
  children: ReactNode;
  onSourceSelect?: (sourceId: string) => void;
  testId?: string;
}) {
  const defaultOpen = mode === "primary";

  return (
    <details data-testid={testId} className="ee-panel overflow-hidden rounded-lg" open={defaultOpen}>
      <summary className="flex min-h-9 cursor-pointer list-none items-center gap-2 border-b border-line px-3 py-2 marker:hidden">
        <h2 className="shrink-0 text-sm font-semibold">{title}</h2>
        {meta ? <span className="shrink-0 text-[11px] text-ink-faint">{meta}</span> : null}
        {!defaultOpen && preview ? (
          <span className="min-w-0 flex-1 truncate text-[11px] text-ink-faint">{preview}</span>
        ) : (
          <span className="flex-1" />
        )}
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {citations?.length && onSourceSelect ? (
            <div onClick={(event) => event.stopPropagation()}>
              <CitationList citations={citations} onSourceSelect={onSourceSelect} />
            </div>
          ) : null}
          <span className="text-[11px] font-semibold text-accent">{defaultOpen ? "Collapse" : "Expand"}</span>
        </div>
      </summary>
      <div className="p-3">{children}</div>
    </details>
  );
}

function CitationList({
  citations,
  onSourceSelect,
}: {
  citations: string[];
  onSourceSelect: (sourceId: string) => void;
}) {
  if (!citations.length) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {citations.slice(0, 3).map((citation) => (
        <button
          key={citation}
          type="button"
          onClick={() => onSourceSelect(citation)}
          className="font-mono text-[11px] text-accent hover:underline"
        >
          [{citation.replace("S", "")}]
        </button>
      ))}
    </div>
  );
}

function ToolTracePanel({ traces }: { traces: ToolTrace[] }) {
  return (
    <details className="rounded border border-line bg-paper px-2 py-1.5">
      <summary className="cursor-pointer text-[11px] font-semibold text-ink-faint">
        Research steps ({traces.length})
      </summary>
      <ol className="mt-2 space-y-2 text-[11px] text-ink-soft">
        {traces.map((trace, index) => (
          <li key={`${trace.tool_name}-${index}`} className="rounded border border-line bg-white px-2 py-1.5">
            <div className="font-semibold text-ink">{trace.tool_name}</div>
          </li>
        ))}
      </ol>
    </details>
  );
}

function Avatar({ label, active = false }: { label: string; active?: boolean }) {
  return (
    <span
      className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-semibold ${
        active ? "bg-accent text-white" : "border border-line bg-paper text-ink-soft"
      }`}
    >
      {label}
    </span>
  );
}
