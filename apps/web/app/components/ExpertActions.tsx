"use client";

import { useState } from "react";
import Link from "next/link";
import { WorkspaceActionButton } from "@/app/components/InvestorWorkspaceTray";

type Mode = "call-prep" | "outreach";

const CALL_GOALS = [
  ["Market orientation", "Trends, size, growth, cycles"],
  ["Customer validation", "Customer needs, budgets, pain"],
  ["Deal process intelligence", "Sourcing, diligence, deal terms"],
  ["Target referrals", "Introductions to companies, operators or founders"],
  ["Skeptical thesis testing", "Challenge assumptions, risks"],
] as const;

export default function ExpertActions({
  expertId,
  expertName,
}: {
  expertId: string;
  expertName: string;
}) {
  const [mode, setMode] = useState<Mode>("call-prep");
  const [context, setContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [goals, setGoals] = useState<string[]>(
    CALL_GOALS.slice(0, 4).map(([label]) => label),
  );

  async function run(which: Mode) {
    setMode(which);
    setLoading(true);
    setError("");
    setOutput("");
    setCopied(false);
    const payload = {
      expertId,
      stream: true,
      context: [
        goals.length ? `Call objectives: ${goals.join("; ")}.` : "",
        context,
      ]
        .filter(Boolean)
        .join(" "),
    };
    try {
      const res = await fetch(`/api/${which}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const contentType = res.headers.get("content-type") ?? "";
      if (contentType.includes("text/event-stream") && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data:")) continue;
            const data = line.slice(5).trim();
            if (data === "[DONE]") break;
            try {
              const json = JSON.parse(data) as { text?: string; error?: string };
              if (json.error) throw new Error(json.error);
              if (json.text) setOutput((prev) => prev + json.text);
            } catch (parseError) {
              if (parseError instanceof Error && parseError.message !== "Unexpected end of JSON input") {
                throw parseError;
              }
            }
          }
        }
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      setOutput(data.text);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="ee-panel rounded-lg p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[16px] font-semibold">Prepare the sourcing call</h2>
          <p className="mt-1 text-[12px] text-ink-faint">
            Uses {expertName}&apos;s sourced profile, company edges and deal evidence.
          </p>
        </div>
        <button
          onClick={() => {
            setOutput("");
            setError("");
            setContext("");
            setGoals(CALL_GOALS.slice(0, 4).map(([label]) => label));
          }}
          className="text-[12px] text-accent"
        >
          Reset
        </button>
      </div>

      <div className="mt-5">
        <div className="text-[13px] font-semibold">What should this call produce?</div>
        <div className="mt-3 space-y-3 text-[12px] text-ink-soft">
          {CALL_GOALS.map(([label, description]) => (
            <label key={label} className="flex gap-3">
              <input
                type="checkbox"
                checked={goals.includes(label)}
                onChange={() =>
                  setGoals((current) =>
                    current.includes(label)
                      ? current.filter((goal) => goal !== label)
                      : [...current, label],
                  )
                }
                className="mt-0.5 h-4 w-4 accent-[var(--accent)]"
              />
              <span>
                <span className="block font-medium text-ink">{label}</span>
                <span>{description}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      <label className="mt-5 block text-[12px] font-medium text-ink-soft">
        Optional diligence angle
        <input
          value={context}
          onChange={(e) => setContext(e.target.value)}
          placeholder="e.g. find founder-led grid services targets with PE readiness"
          className="mt-1 w-full rounded-md border border-line-strong px-3 py-2 text-[13px] outline-none focus:border-accent"
        />
      </label>

      <div className="mt-4 space-y-2">
        <button
          onClick={() => run("call-prep")}
          disabled={loading}
          className="ee-button ee-button-primary w-full disabled:opacity-50"
        >
          {loading && mode === "call-prep" ? "Preparing..." : "Prepare call brief"}
        </button>
        <button
          onClick={() => run("outreach")}
          disabled={loading}
          className="ee-button ee-button-secondary w-full disabled:opacity-50"
        >
          {loading && mode === "outreach" ? "Drafting..." : "Draft outreach note"}
        </button>
        <div className="grid grid-cols-2 gap-2">
          <WorkspaceActionButton
            item={{
              id: expertId,
              kind: "call",
              name: expertName,
              sub: "Prepared expert call",
              href: `/experts/${expertId}`,
            }}
          >
            Add to tray
          </WorkspaceActionButton>
          <Link href={`/graph?focus=expert:${expertId}`} className="ee-button ee-button-secondary min-h-8 px-3">
            View relationships
          </Link>
          <Link href={`/ask?expert=${expertId}`} className="ee-button ee-button-secondary min-h-8 px-3">
            Use in Copilot
          </Link>
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-600">
          {error}
        </div>
      ) : null}

      {output ? (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="ee-label">
              {mode === "call-prep" ? "Source-backed call brief" : "Outreach note"}
            </span>
            <button
              onClick={copy}
              className="text-xs text-accent hover:underline"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <div className="max-h-[420px] overflow-auto rounded-md border border-line bg-paper p-3.5 text-sm leading-relaxed whitespace-pre-wrap">
            {output}
          </div>
          <WorkspaceActionButton
            item={{
              id: `${expertId}:${mode}`,
              kind: "memo",
              name: `${expertName} ${mode === "call-prep" ? "call brief" : "outreach note"}`,
              sub: output.slice(0, 160),
              href: `/experts/${expertId}#call-actions`,
              status: "ready for memo",
            }}
            className="ee-button ee-button-secondary mt-3 w-full"
          >
            Add output to memo basket
          </WorkspaceActionButton>
        </div>
      ) : null}
    </div>
  );
}
