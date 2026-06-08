"use client";

import { useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { copilotProgressLabel } from "@/lib/copilot-copy";
import { workspaceKindLabel, type WorkspaceItem } from "@/lib/workspace";
import { AskAnswerPanel } from "./AskAnswerPanel";
import type { AskResponse } from "./types";
import { buildBasketPrompt, idlePromptSuggestions, themeLabel, type ConversationMessage } from "./utils";

type CopilotConversationProps = {
  question: string;
  onQuestionChange: (question: string) => void;
  conversation: ConversationMessage[];
  loading: boolean;
  progressStep: number;
  loadingQuestion?: string;
  error: string;
  answer: AskResponse | null;
  workspaceItems: WorkspaceItem[];
  filtersTheme: string;
  onSubmit: () => void;
  onCancel: () => void;
  onPrompt: (prompt: string) => void;
  onSourceSelect: (sourceId: string) => void;
  onOpenNotes: () => void;
};

export function CopilotConversationInput({
  question,
  onQuestionChange,
  loading,
  onSubmit,
  onCancel,
}: Pick<
  CopilotConversationProps,
  "question" | "onQuestionChange" | "loading" | "onSubmit" | "onCancel"
>) {
  return (
    <form
      className="mt-4 flex gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <input
        value={question}
        onChange={(event) => onQuestionChange(event.target.value)}
        className="min-w-0 flex-1 rounded-md border border-line-strong bg-paper px-3 py-2.5 text-sm outline-none transition focus:border-accent focus:bg-card"
        placeholder="Ask over experts, companies, relationships, and sources..."
      />
      <button
        type="submit"
        disabled={loading || !question.trim()}
        className="ee-button ee-button-primary min-h-10 px-4 disabled:opacity-50"
      >
        {loading ? "Running" : "Ask"}
      </button>
      {loading ? (
        <button
          type="button"
          onClick={onCancel}
          className="rounded border border-[#cfd6e2] bg-white px-3 py-2.5 text-sm font-semibold text-[#344054] transition hover:border-[#0b5bd3] hover:text-[#0b5bd3]"
        >
          Cancel
        </button>
      ) : null}
    </form>
  );
}

export function CopilotConversation({
  question,
  onQuestionChange,
  conversation,
  loading,
  progressStep,
  loadingQuestion,
  error,
  answer,
  workspaceItems,
  filtersTheme,
  onPrompt,
  onSourceSelect,
  onOpenNotes,
}: Omit<CopilotConversationProps, "onSubmit" | "onCancel">) {
  const latestAssistantId = [...conversation]
    .reverse()
    .find((message) => message.role === "assistant" && message.answer)?.id;
  const activityRef = useRef<HTMLDivElement>(null);

  const visibleConversation = useMemo(() => {
    if (!loading || conversation.length === 0) return conversation;
    const last = conversation[conversation.length - 1];
    if (last?.role === "user") return conversation.slice(0, -1);
    return conversation;
  }, [conversation, loading]);

  useEffect(() => {
    activityRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [loading, conversation.length, loadingQuestion]);

  return (
    <div className="space-y-3 px-3 py-4 sm:px-5">
        <BasketContextPanel
          items={workspaceItems}
          theme={filtersTheme}
          onOpenNotes={onOpenNotes}
          onPrompt={onPrompt}
        />
        {error ? (
          <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
        {loading ? (
          <div ref={activityRef} className="space-y-2" data-testid="copilot-activity">
            {loadingQuestion ? (
              <div className="rounded-md border border-line bg-paper px-3 py-2">
                <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-faint">
                  You
                </div>
                <p className="mt-1 text-[13px] leading-relaxed text-ink">{loadingQuestion}</p>
              </div>
            ) : null}
            <div className="text-[11px] text-ink-faint">{copilotProgressLabel(progressStep)}</div>
            <LoadingBlocks />
            {answer ? (
              <div className="rounded-lg border border-dashed border-line bg-paper/60 p-2">
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-faint">
                  Initial answer (from directory)
                </div>
                <AskAnswerPanel
                  answer={answer}
                  onSourceSelect={onSourceSelect}
                  onPrompt={onPrompt}
                  compact
                />
              </div>
            ) : null}
          </div>
        ) : null}
        {visibleConversation.length > 0 ? (
          <div className="space-y-3">
            {conversationTurnsNewestFirst(visibleConversation).map((message) => (
              <div key={message.id} className="space-y-1">
                <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-faint">
                  {message.role === "user" ? "You" : "Copilot"}
                </div>
                <div className="text-[13px] leading-relaxed text-ink">
                  {message.role === "user"
                    ? message.content
                    : message.answer
                      ? (
                          <AskAnswerPanel
                            answer={message.answer}
                            onSourceSelect={onSourceSelect}
                            onPrompt={onPrompt}
                            compact={message.id !== latestAssistantId}
                          />
                        )
                      : message.content}
                </div>
              </div>
            ))}
          </div>
        ) : !loading ? (
          <IdlePrompt
            question={answer?.input_context.question ?? question}
            theme={filtersTheme}
            onPrompt={(prompt) => {
              onQuestionChange(prompt);
              onPrompt(prompt);
            }}
          />
        ) : null}
    </div>
  );
}

/** Newest Q&A turns first; within each turn, user message stays above the assistant reply. */
function conversationTurnsNewestFirst(messages: ConversationMessage[]): ConversationMessage[] {
  const turns: ConversationMessage[][] = [];
  let current: ConversationMessage[] = [];

  for (const message of messages) {
    if (message.role === "user") {
      if (current.length) turns.push(current);
      current = [message];
      continue;
    }
    current.push(message);
  }
  if (current.length) turns.push(current);

  return turns.reverse().flat();
}

function IdlePrompt({
  question,
  theme,
  onPrompt,
}: {
  question: string;
  theme: string;
  onPrompt: (prompt: string) => void;
}) {
  const starters = idlePromptSuggestions(theme);

  return (
    <div className="space-y-4 rounded border border-[#dfe3eb] bg-[#fbfcfe] p-4" data-testid="copilot-idle-prompt">
      <div className="flex gap-3">
        <Avatar label="AB" />
        <div>
          <div className="text-xs">
            <span className="font-semibold">Ready to ask</span>
            <span className="ml-2 text-[#667085]">Theme scope follows the global filter bar</span>
          </div>
          <p className="mt-1 text-sm text-[#344054]">{question}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {starters.map((starter) =>
          starter.kind === "link" ? (
            <Link
              key={starter.href}
              href={starter.href}
              className="rounded border border-[#d8dee8] bg-white px-3 py-2 text-xs font-medium text-[#344054] transition hover:border-[#0b5bd3] hover:text-[#0b5bd3]"
            >
              {starter.label}
            </Link>
          ) : (
            <button
              key={starter.prompt}
              type="button"
              onClick={() => onPrompt(starter.prompt)}
              className="rounded border border-[#d8dee8] bg-white px-3 py-2 text-xs font-medium text-[#344054] transition hover:border-[#0b5bd3] hover:text-[#0b5bd3]"
            >
              {starter.label}
            </button>
          ),
        )}
      </div>
    </div>
  );
}

function BasketContextPanel({
  items,
  theme,
  onOpenNotes,
  onPrompt,
}: {
  items: WorkspaceItem[];
  theme: string;
  onOpenNotes: () => void;
  onPrompt: (prompt: string) => void;
}) {
  const calls = items.filter((item) => item.kind === "call");
  const targets = items.filter((item) => item.kind === "target");
  const memos = items.filter((item) => item.kind === "memo");
  const selectedItems = items.slice(0, 5);
  const quickActions = [
    {
      label: "Gather research",
      prompt: buildBasketPrompt(
        items,
        theme,
        "Gather the next research needed for these saved experts, companies, and notes. Prioritise missing evidence, source checks, and companies to validate.",
      ),
    },
    {
      label: "Draft outreach",
      prompt: buildBasketPrompt(
        items,
        theme,
        "Draft concise expert outreach for the saved people and explain which saved companies or diligence questions each outreach should mention.",
      ),
    },
    {
      label: "Prepare calls",
      prompt: buildBasketPrompt(
        items,
        theme,
        "Prepare a call plan from the saved basket: call order, objective for each call, questions to ask, and what would raise or reduce conviction.",
      ),
    },
    {
      label: "Draft memo section",
      prompt: buildBasketPrompt(
        items,
        theme,
        "Draft a partner memo section using the saved basket. Include thesis, priority experts, target companies, evidence gaps, and recommended next actions.",
      ),
    },
  ];

  if (!items.length) return null;

  return (
    <section data-testid="basket-context-panel" className="rounded border border-[#cfd6e2] bg-[#f8fbff] p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#344054]">
            Basket context
          </div>
          <p className="mt-1 text-xs text-[#667085]">
            Current saved context for {themeLabel(theme)} AI actions.
          </p>
        </div>
        <div className="flex overflow-hidden rounded border border-[#d8dee8] bg-white">
          <BasketStat label="Experts" value={calls.length} />
          <BasketStat label="Companies" value={targets.length} />
          <BasketStat label="Notes" value={memos.length} />
        </div>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div>
          {items.length ? (
            <div className="flex flex-wrap gap-1.5">
              {selectedItems.map((item) => (
                <Link
                  key={`${item.kind}:${item.id}`}
                  href={item.href}
                  className="rounded border border-[#d8dee8] bg-white px-2 py-1 text-[11px] font-medium text-[#344054] hover:border-[#0b5bd3] hover:text-[#0b5bd3]"
                >
                  {workspaceKindLabel(item.kind)}: {item.name}
                </Link>
              ))}
              {items.length > selectedItems.length ? (
                <button
                  type="button"
                  onClick={onOpenNotes}
                  className="rounded border border-[#d8dee8] bg-white px-2 py-1 text-[11px] font-medium text-[#667085] hover:border-[#0b5bd3] hover:text-[#0b5bd3]"
                >
                  +{items.length - selectedItems.length} more
                </button>
              ) : null}
            </div>
          ) : (
            <div className="rounded border border-dashed border-[#cfd6e2] bg-white px-3 py-2 text-xs text-[#667085]">
              Basket is empty. Saved experts, companies, and AI notes will appear here.
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {quickActions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={() => onPrompt(action.prompt)}
              className="rounded border border-[#0b5bd3] bg-white px-3 py-2 text-left text-xs font-semibold text-[#0b5bd3] hover:bg-[#eef5ff]"
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function BasketStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-r border-[#d8dee8] px-3 py-2 text-center last:border-r-0">
      <div className="font-mono text-sm font-semibold text-[#111827]">{value}</div>
      <div className="text-[10px] uppercase tracking-[0.12em] text-[#667085]">{label}</div>
    </div>
  );
}

function Avatar({ label, active = false }: { label: string; active?: boolean }) {
  return (
    <span
      className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-semibold ${
        active ? "bg-[#0b5bd3] text-white" : "border border-[#cfd6e2] bg-[#eef1f6] text-[#344054]"
      }`}
    >
      {label}
    </span>
  );
}

function LoadingBlocks() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((item) => (
        <div key={item} className="h-28 animate-pulse rounded border border-[#dfe3eb] bg-[#f5f7fa]" />
      ))}
    </div>
  );
}
