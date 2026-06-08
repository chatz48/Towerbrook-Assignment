"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { isThemeFocus, type ThemeFocus } from "@/lib/theme-focus";
import { expertDiscoveryCount } from "@/lib/discovery-candidates";
import type { PageContext } from "@/lib/ask-types";
import {
  readWorkspace,
  useWorkspaceItems,
  type WorkspaceItem,
} from "@/lib/workspace";
import { CopilotConversation, CopilotConversationInput } from "./CopilotConversation";
import type { AskResponse, CopilotFilters, SourceRecord } from "./types";
import { readSkipBasketAutoRun } from "@/lib/copilot-preferences";
import {
  clearConversationSummary,
  readConversationSummary,
  writeConversationSummary,
} from "@/lib/copilot-session-memory";
import { outreachStorageKey, readOutreachState } from "@/lib/outreach-plan";
import { consumeAskStream, phaseToProgressStep } from "@/lib/ask-stream-client";
import { sanitizeAnswerForDisplay } from "@/lib/copilot-answer-display";
import {
  buildBasketPrompt,
  buildWorkspacePageContext,
  defaultQuestion,
  formatSourceId,
  makeInitialFilters,
  makeMessageId,
  mergePageContext,
  toChatHistory,
  type ConversationMessage,
} from "./utils";

type CopilotTab = "ask" | "notes";

export default function ResearchWorkspace({
  initialTheme,
  includeTowerBrookEmployees,
  initialPrompt,
  initialFocusContext,
  autoRunInitial = false,
}: {
  initialTheme: ThemeFocus;
  includeTowerBrookEmployees: boolean;
  initialPrompt?: string;
  initialFocusContext?: PageContext;
  autoRunInitial?: boolean;
}) {
  const startingFilters = useMemo(
    () => makeInitialFilters(initialTheme, includeTowerBrookEmployees),
    [includeTowerBrookEmployees, initialTheme],
  );
  const startingQuestion = useMemo(() => initialPrompt ?? defaultQuestion(initialTheme), [initialPrompt, initialTheme]);
  const [question, setQuestion] = useState(startingQuestion);
  const filters = startingFilters;
  const [answer, setAnswer] = useState<AskResponse | null>(null);
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [conversationSummary, setConversationSummary] = useState<string | undefined>(
    () => readConversationSummary(),
  );
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingQuestion, setLoadingQuestion] = useState(startingQuestion);
  const [progressStep, setProgressStep] = useState(0);
  const [error, setError] = useState("");
  const activeRequest = useRef<AbortController | null>(null);
  const basketBootstrapped = useRef(false);
  const workspaceItems = useWorkspaceItems();
  const skipBasketAutoRun = readSkipBasketAutoRun();

  function pageContextFor(filters: CopilotFilters) {
    const outreachState = readOutreachState(
      outreachStorageKey(filters.theme, filters.includeTowerBrookEmployees),
    );
    return mergePageContext(
      initialFocusContext,
      buildWorkspacePageContext(workspaceItems, filters, outreachState),
    );
  }

  async function submit(nextQuestion = question, nextFilters = filters) {
    const cleanQuestion = nextQuestion.trim();
    if (!cleanQuestion || loading) return;
    const controller = new AbortController();
    activeRequest.current = controller;
    const chatHistory = toChatHistory(conversation);
    const userMessage: ConversationMessage = {
      id: makeMessageId("user"),
      role: "user",
      content: cleanQuestion,
    };
    setQuestion("");
    setLoadingQuestion(cleanQuestion);
    setConversation((current) => [...current, userMessage]);
    setLoading(true);
    setProgressStep(0);
    setError("");
    const timeout = window.setTimeout(() => controller.abort("timeout"), 180000);
    try {
      let finalAnswer: AskResponse | null = null;
      await consumeAskStream(
        {
          question: cleanQuestion,
          filters: nextFilters,
          chatHistory,
          conversationSummary,
          pageContext: pageContextFor(nextFilters),
        },
        {
          onBaseline: (data) => {
            if (activeRequest.current !== controller) return;
            setAnswer(data);
            setProgressStep(0);
          },
          onPhase: (phase) => {
            if (activeRequest.current !== controller) return;
            setProgressStep(phaseToProgressStep(phase.phase));
          },
          onComplete: (data) => {
            finalAnswer = data;
          },
          onError: (message) => {
            throw new Error(message);
          },
        },
        controller.signal,
      );
      if (activeRequest.current !== controller || !finalAnswer) return;
      const data = sanitizeAnswerForDisplay(finalAnswer);
      setAnswer(data);
      setConversation((current) => [
        ...current,
        {
          id: makeMessageId("assistant"),
          role: "assistant",
          content: data.answer_summary,
          answer: data,
        },
      ]);
      setSelectedSourceId(data.sources_used?.[0]?.source_id ?? null);
      if (data.conversation_summary) {
        setConversationSummary(data.conversation_summary);
        writeConversationSummary(data.conversation_summary);
      }
    } catch (e) {
      if (activeRequest.current !== controller) return;
      const isAbort = e instanceof DOMException && e.name === "AbortError";
      setError(
        isAbort
          ? "The Copilot request was stopped. Ask again when ready."
          : e instanceof Error
            ? e.message
            : "Something went wrong",
      );
    } finally {
      window.clearTimeout(timeout);
      if (activeRequest.current === controller) {
        activeRequest.current = null;
        setLoading(false);
      }
    }
  }

  function cancelRequest() {
    activeRequest.current?.abort("cancelled");
    activeRequest.current = null;
    setLoading(false);
    setError("The Copilot request was stopped. Ask again when ready.");
  }

  function startNewChat() {
    if (loading) return;
    activeRequest.current?.abort("new-chat");
    activeRequest.current = null;
    setConversation([]);
    setAnswer(null);
    setConversationSummary(undefined);
    clearConversationSummary();
    setError("");
    setSelectedSourceId(null);
    setProgressStep(0);
    const nextQuestion = defaultQuestion(isThemeFocus(filters.theme) ? filters.theme : "all");
    setQuestion(nextQuestion);
    setLoadingQuestion(nextQuestion);
  }

  const hasActiveChat = conversation.length > 0 || Boolean(answer);

  useEffect(() => {
    if (!autoRunInitial) {
      return;
    }
    let cancelled = false;
    const controller = new AbortController();
    activeRequest.current = controller;

    async function loadInitialAnswer() {
      setQuestion(startingQuestion);
      setLoadingQuestion(startingQuestion);
      setLoading(true);
      setProgressStep(0);
      setError("");
      const timeout = window.setTimeout(() => controller.abort("timeout"), 180000);
      try {
        let finalAnswer: AskResponse | null = null;
        await consumeAskStream(
          {
            question: startingQuestion,
            filters: startingFilters,
            chatHistory: [],
            pageContext: mergePageContext(
              initialFocusContext,
              buildWorkspacePageContext(
                readWorkspace(),
                startingFilters,
                readOutreachState(
                  outreachStorageKey(
                    startingFilters.theme,
                    startingFilters.includeTowerBrookEmployees,
                  ),
                ),
              ),
            ),
          },
          {
            onBaseline: (data) => {
              if (!cancelled) setAnswer(data);
            },
            onPhase: (phase) => {
              if (!cancelled) setProgressStep(phaseToProgressStep(phase.phase));
            },
            onComplete: (data) => {
              finalAnswer = data;
            },
            onError: (message) => {
              throw new Error(message);
            },
          },
          controller.signal,
        );
        if (!cancelled && finalAnswer) {
          const data = sanitizeAnswerForDisplay(finalAnswer);
          setAnswer(data);
          setConversation([
            {
              id: makeMessageId("user"),
              role: "user",
              content: startingQuestion,
            },
            {
              id: makeMessageId("assistant"),
              role: "assistant",
              content: data.answer_summary,
              answer: data,
            },
          ]);
          setSelectedSourceId(data.sources_used?.[0]?.source_id ?? null);
        }
      } catch (e) {
        if (!cancelled) {
          const isAbort = e instanceof DOMException && e.name === "AbortError";
          setError(isAbort ? "The Copilot request was stopped. Ask again when ready." : e instanceof Error ? e.message : "Something went wrong");
        }
      } finally {
        window.clearTimeout(timeout);
        if (!cancelled) setLoading(false);
      }
    }

    void loadInitialAnswer();
    return () => {
      cancelled = true;
      controller.abort("unmounted");
      if (activeRequest.current === controller) activeRequest.current = null;
    };
  }, [autoRunInitial, initialFocusContext, startingFilters, startingQuestion]);

  useEffect(() => {
    if (
      autoRunInitial ||
      initialPrompt ||
      skipBasketAutoRun ||
      basketBootstrapped.current ||
      !workspaceItems.length
    ) {
      return;
    }
    basketBootstrapped.current = true;
    const prompt = buildBasketPrompt(
      workspaceItems,
      startingFilters.theme,
      "Review my saved basket and recommend the next research, calls, and diligence actions.",
    );
    setQuestion(prompt);
    void submit(prompt, startingFilters);
    // submit is intentionally omitted — basket bootstrap runs once when items load.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot basket auto-run
  }, [autoRunInitial, initialPrompt, skipBasketAutoRun, startingFilters, workspaceItems]);

  const selectedSource = useMemo(() => {
    if (!answer?.sources_used.length) return null;
    return (
      answer.sources_used.find((source) => source.source_id === selectedSourceId) ??
      answer.sources_used[0]
    );
  }, [answer, selectedSourceId]);

  const [tab, setTab] = useState<CopilotTab>("ask");

  const discoveryQueueCount = expertDiscoveryCount();

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-paper text-ink">
      <div className="grid grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_320px]">
        <main className="min-w-0 bg-card">
          <div className="border-b border-line px-3 py-4 sm:px-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-xl font-semibold tracking-tight">AI Copilot</h1>
                <p className="mt-1 text-xs text-ink-faint">
                  Ask in plain language — theme scope follows the global filter bar. Basket quick actions sit in the chat.
                </p>
                <p className="mt-1 text-[11px] text-ink-faint">
                  Chat persists until you start a new chat or refresh. After five Q&A pairs, older turns are summarised for sharper follow-ups.
                </p>
                {conversationSummary ? (
                  <p className="mt-1 text-[11px] text-ink-faint" data-testid="copilot-memory-active">
                    Earlier turns are compressed into session memory ({conversationSummary.split("\n").length} notes).
                  </p>
                ) : null}
              </div>
              {hasActiveChat ? (
                <button
                  type="button"
                  data-testid="copilot-new-chat"
                  onClick={startNewChat}
                  disabled={loading}
                  className="ee-button ee-button-secondary min-h-8 shrink-0 px-3 text-xs"
                >
                  New chat
                </button>
              ) : null}
            </div>

            <div className="mt-3 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-0">
              <div className="flex gap-1">
              {([
                ["ask", "Ask"],
                ["notes", "Notes"],
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className={`px-4 py-2 text-[13px] font-medium border-b-2 -mb-px transition-colors ${
                    tab === key
                      ? "border-accent text-accent"
                      : "border-transparent text-ink-faint hover:text-ink-soft"
                  }`}
                >
                  {label}
                  {key === "notes" && workspaceItems.length > 0 && (
                    <span className="ml-1.5 rounded-full bg-[#f4f8ff] px-1.5 py-0.5 text-[10px] text-accent">
                      {workspaceItems.length}
                    </span>
                  )}
                </button>
              ))}
              </div>
              <Link href="/discover" className="pb-2 text-xs font-semibold text-accent hover:underline">
                Open Discover ({discoveryQueueCount})
              </Link>
            </div>

            {tab === "ask" ? (
              <CopilotConversationInput
                question={question}
                onQuestionChange={setQuestion}
                loading={loading}
                onSubmit={() => submit()}
                onCancel={cancelRequest}
              />
            ) : null}
          </div>

          {tab === "ask" ? (
            <CopilotConversation
              question={question}
              onQuestionChange={setQuestion}
              conversation={conversation}
              loading={loading}
              progressStep={progressStep}
              loadingQuestion={loadingQuestion}
              error={error}
              answer={answer}
              workspaceItems={workspaceItems}
              filtersTheme={filters.theme}
              onPrompt={(prompt) => submit(prompt)}
              onSourceSelect={setSelectedSourceId}
              onOpenNotes={() => setTab("notes")}
            />
          ) : tab === "notes" ? (
            <NotesTab items={workspaceItems} />
          ) : null}
        </main>

        <EvidenceInspector
          sources={answer?.sources_used ?? []}
          selectedSource={selectedSource}
          selectedSourceId={selectedSource?.source_id ?? null}
          onSourceSelect={setSelectedSourceId}
        />
      </div>
    </div>
  );
}

function EvidenceInspector({
  sources,
  selectedSource,
  selectedSourceId,
  onSourceSelect,
}: {
  sources: SourceRecord[];
  selectedSource: SourceRecord | null;
  selectedSourceId: string | null;
  onSourceSelect: (sourceId: string) => void;
}) {
  if (!sources.length) return null;

  return (
    <aside className="hidden bg-paper p-4 2xl:block 2xl:min-h-[calc(100vh-6.5rem)]">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#344054]">
            Source evidence ({sources.length})
          </div>
          <div className="mt-1 text-[11px] text-[#667085]">Highest confidence first</div>
        </div>
      </div>

      {selectedSource ? (
        <div className="mb-3 rounded border border-[#cfd6e2] bg-white shadow-sm">
          <div className="border-b border-[#e6eaf0] p-3">
            <div className="flex items-start gap-3">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded bg-[#eef5ff] font-mono text-xs text-[#0b5bd3]">
                {formatSourceId(selectedSource.source_id)}
              </span>
              <div className="min-w-0">
                <a
                  href={selectedSource.url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold leading-snug text-[#0b5bd3] hover:underline"
                >
                  {selectedSource.title}
                </a>
                <div className="mt-1 text-xs text-[#667085]">{selectedSource.publisher}</div>
              </div>
              <ConfidencePips confidence={selectedSource.confidence} />
            </div>
          </div>
          <div className="space-y-4 p-3">
            <InspectorBlock title="Evidence">
              <p className="text-sm leading-relaxed text-[#344054]">
                &quot;{selectedSource.snippet}&quot;
              </p>
            </InspectorBlock>
            <InspectorBlock title="Extracted entities">
              <div className="flex flex-wrap gap-1.5">
                {selectedSource.entities.map((entity) => (
                  <span
                    key={entity}
                    className="rounded border border-[#cfe0ff] bg-[#f4f8ff] px-2 py-1 text-[11px] text-[#0b5bd3]"
                  >
                    {entity}
                  </span>
                ))}
              </div>
            </InspectorBlock>
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        {sources.map((source) => (
          <button
            key={source.source_id}
            onClick={() => onSourceSelect(source.source_id)}
            className={`w-full rounded border bg-white p-3 text-left transition ${
              selectedSourceId === source.source_id
                ? "border-[#0b5bd3] shadow-sm"
                : "border-[#e0e5ed] hover:border-[#c8d0dc]"
            }`}
          >
            <div className="flex gap-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded bg-[#eef5ff] font-mono text-[11px] text-[#0b5bd3]">
                {formatSourceId(source.source_id)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="line-clamp-2 text-xs font-semibold text-[#0b5bd3]">
                  {source.title}
                </div>
                <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-[#667085]">
                  <span>{source.publisher}</span>
                  <span>{Math.round(source.confidence * 100)}%</span>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </aside>
  );
}

function ConfidencePips({ confidence }: { confidence: number }) {
  return (
    <div className="ml-auto shrink-0 text-right">
      <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#667085]">
        Confidence
      </div>
      <div className="mt-1 flex justify-end gap-1">
        {[0.25, 0.5, 0.75, 0.9].map((threshold) => (
          <span
            key={threshold}
            className={`h-1.5 w-5 rounded-full ${confidence >= threshold ? "bg-[#07883f]" : "bg-[#d8dee8]"}`}
          />
        ))}
      </div>
    </div>
  );
}

function InspectorBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#667085]">
        {title}
      </div>
      {children}
    </div>
  );
}

function NotesTab({ items }: { items: WorkspaceItem[] }) {
  const calls = items.filter((item) => item.kind === "call");
  const targets = items.filter((item) => item.kind === "target");
  const memos = items.filter((item) => item.kind === "memo");

  if (!items.length) {
    return (
      <div className="flex flex-col items-center justify-center px-5 py-16 text-center">
        <div className="text-3xl">📋</div>
        <h3 className="mt-3 text-sm font-semibold">No saved items yet</h3>
        <p className="mt-1 max-w-sm text-xs text-[#667085]">
          Save experts and companies from the call tray and company pages to build your research notes here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 px-5 py-4">
      <div>
        <h2 className="text-sm font-semibold">Copilot Notes</h2>
        <p className="mt-1 text-xs text-[#667085]">
          Your saved calls, targets, and research notes. Use these to prepare for partner meetings and diligence sessions.
        </p>
      </div>

      {calls.length > 0 && (
        <SectionBlock title={`Call list (${calls.length})`}>
          {calls.map((item) => (
            <NoteRow key={`${item.kind}:${item.id}`} item={item} />
          ))}
        </SectionBlock>
      )}

      {targets.length > 0 && (
        <SectionBlock title={`Target watchlist (${targets.length})`}>
          {targets.map((item) => (
            <NoteRow key={`${item.kind}:${item.id}`} item={item} />
          ))}
        </SectionBlock>
      )}

      {memos.length > 0 && (
        <SectionBlock title={`Memos (${memos.length})`}>
          {memos.map((item) => (
            <NoteRow key={`${item.kind}:${item.id}`} item={item} />
          ))}
        </SectionBlock>
      )}

      <p className="text-[11px] text-[#667085]">
        Notes persist in your browser. Clear them from the floating tray at the bottom-right of any page.
      </p>
    </div>
  );
}

function SectionBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded border border-[#dfe3eb] bg-white">
      <div className="border-b border-[#e6eaf0] px-3 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#667085]">
          {title}
        </span>
      </div>
      <div className="divide-y divide-[#edf0f5]">{children}</div>
    </div>
  );
}

function NoteRow({ item }: { item: WorkspaceItem }) {
  return (
    <div className="flex items-start justify-between gap-3 px-3 py-2.5">
      <div className="min-w-0">
        <Link href={item.href} className="text-xs font-semibold text-[#0b5bd3] hover:underline">
          {item.name}
        </Link>
        {item.sub && <div className="mt-0.5 text-[11px] text-[#667085]">{item.sub}</div>}
        {item.note && (
          <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-[#344054]">
            {item.note}
          </p>
        )}
        <div className="mt-1 text-[10px] text-[#667085]">
          {item.status} · {new Date(item.addedAt).toLocaleDateString()}
        </div>
      </div>
      <span
        className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${
          item.kind === "call"
            ? "bg-[#eef5ff] text-[#0b5bd3]"
            : item.kind === "target"
              ? "bg-emerald-50 text-emerald-700"
              : "bg-purple-50 text-purple-700"
        }`}
      >
        {item.kind === "call" ? "Call" : item.kind === "target" ? "Target" : "Memo"}
      </span>
    </div>
  );
}
