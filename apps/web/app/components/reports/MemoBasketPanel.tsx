"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { askHref } from "@/lib/links";
import {
  useWorkspaceItems,
  WORKSPACE_KIND_LABEL,
  workspaceKindLabel,
  type WorkspaceItem,
} from "@/lib/workspace";

function basketMemoMarkdown(items: WorkspaceItem[]): string {
  if (!items.length) return "";
  const groups: Record<string, WorkspaceItem[]> = {
    call: [],
    target: [],
    memo: [],
  };
  for (const item of items) groups[item.kind]?.push(item);
  const lines = ["## Basket inputs for memo", ""];
  for (const kind of ["call", "target", "memo"] as const) {
    const group = groups[kind];
    if (!group.length) continue;
    lines.push(`### ${WORKSPACE_KIND_LABEL[kind]}`, "");
    for (const item of group) {
      lines.push(`- **${item.name}**${item.sub ? ` — ${item.sub}` : ""}`);
      if (item.note) lines.push(`  - Note: ${item.note}`);
      if (item.status) lines.push(`  - Status: ${item.status}`);
    }
    lines.push("");
  }
  return lines.join("\n").trim();
}

export default function MemoBasketPanel({ themeLabel }: { themeLabel: string }) {
  const items = useWorkspaceItems();
  const [copied, setCopied] = useState(false);
  const markdown = useMemo(() => basketMemoMarkdown(items), [items]);
  const calls = items.filter((item) => item.kind === "call");
  const targets = items.filter((item) => item.kind === "target");
  const memos = items.filter((item) => item.kind === "memo");

  const copilotPrompt = items.length
    ? `Draft a partner memo section for ${themeLabel} using my saved basket.\n\nBasket: ${items
        .slice(0, 12)
        .map((item) => `${workspaceKindLabel(item.kind)} ${item.name}${item.note ? ` (${item.note})` : ""}`)
        .join("; ")}\n\nInclude thesis, priority experts, target companies, evidence gaps, and recommended next actions.`
    : "";

  async function copyMarkdown() {
    if (!markdown) return;
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  if (!items.length) {
    return (
      <section className="ee-panel rounded-lg p-3">
        <div className="ee-label text-ink">Insert from basket</div>
        <p className="mt-2 text-[11px] leading-relaxed text-ink-faint">
          Save experts and targets from the call list or company pages. They appear here for memo
          drafting and Copilot.
        </p>
        <div className="mt-3 grid gap-2">
          <Link href="/experts" className="ee-button ee-button-secondary w-full">
            Open call list
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="ee-panel rounded-lg p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="ee-label text-ink">Insert from basket</div>
          <p className="mt-1 text-[11px] text-ink-faint">
            {calls.length} experts · {targets.length} targets · {memos.length} notes
          </p>
        </div>
      </div>

      <ul className="mt-3 max-h-48 space-y-1.5 overflow-y-auto text-[11px]">
        {items.slice(0, 10).map((item) => (
          <li key={`${item.kind}:${item.id}`} className="flex gap-2">
            <span className="shrink-0 font-semibold uppercase tracking-wide text-ink-faint">
              {workspaceKindLabel(item.kind).split(" ")[0]}
            </span>
            <Link href={item.href} className="min-w-0 truncate font-medium text-accent hover:underline">
              {item.name}
            </Link>
          </li>
        ))}
        {items.length > 10 ? (
          <li className="text-ink-faint">+{items.length - 10} more in tray</li>
        ) : null}
      </ul>

      <div className="mt-3 grid gap-2">
        <button
          type="button"
          onClick={() => void copyMarkdown()}
          className="ee-button ee-button-secondary w-full text-[11px]"
        >
          {copied ? "Copied markdown" : "Copy basket as markdown"}
        </button>
        {copilotPrompt ? (
          <Link href={askHref(copilotPrompt)} className="ee-button ee-button-primary w-full text-[11px]">
            Draft section in Copilot
          </Link>
        ) : null}
      </div>
    </section>
  );
}
