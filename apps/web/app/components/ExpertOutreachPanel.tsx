"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  DEFAULT_OUTREACH_STATE,
  effectiveCallObjective,
  OUTREACH_OWNERS,
  OUTREACH_STATUSES,
  outreachItemKey,
  outreachRowState,
  readOutreachState,
  subscribeOutreach,
  type OutreachPlanState,
  writeOutreachState,
} from "@/lib/outreach-plan";
import { updateWorkspaceItem, useWorkspaceItems } from "@/lib/workspace";

export default function ExpertOutreachPanel({
  expertId,
  expertName,
  storageKey,
  defaultObjective,
}: {
  expertId: string;
  expertName: string;
  storageKey: string;
  defaultObjective: string;
}) {
  const [planState, setPlanState] = useState<OutreachPlanState>({});
  const workspaceItems = useWorkspaceItems();
  const inBasket = workspaceItems.some((item) => item.kind === "call" && item.id === expertId);
  const current = outreachRowState(planState, expertId);
  const objectiveValue = current.objective || defaultObjective;
  const hasOutreach =
    current.owner !== "Unassigned" ||
    current.status !== "Not started" ||
    current.note.trim().length > 0 ||
    current.objective.trim().length > 0;

  useEffect(() => {
    const load = () => setPlanState(readOutreachState(storageKey));
    load();
    return subscribeOutreach(storageKey, load);
  }, [storageKey]);

  function update(patch: Partial<typeof DEFAULT_OUTREACH_STATE>) {
    setPlanState((previous) => {
      const next = {
        ...previous,
        [outreachItemKey(expertId)]: {
          ...outreachRowState(previous, expertId),
          ...patch,
        },
      };
      writeOutreachState(storageKey, next);
      if (inBasket && (patch.note !== undefined || patch.objective !== undefined)) {
        updateWorkspaceItem(
          { id: expertId, kind: "call" },
          { note: effectiveCallObjective(next, expertId, defaultObjective) },
        );
      }
      return next;
    });
  }

  return (
    <section className="ee-panel rounded-lg p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="ee-label text-ink">Call list outreach</div>
          <p className="mt-1 text-[11px] leading-relaxed text-ink-faint">
            Shared with the call list and Copilot. Edits sync across this browser.
          </p>
        </div>
        <Link href="/experts" className="shrink-0 text-[11px] font-semibold text-accent hover:underline">
          Open list →
        </Link>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-ink-faint">
            Assigned
          </span>
          <select
            value={current.owner}
            onChange={(event) => update({ owner: event.target.value })}
            className="ee-cell-input w-full"
            aria-label={`Assign owner for ${expertName}`}
          >
            {OUTREACH_OWNERS.map((owner) => (
              <option key={owner} value={owner}>
                {owner}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-ink-faint">
            Status
          </span>
          <select
            value={current.status}
            onChange={(event) => update({ status: event.target.value })}
            className="ee-cell-input w-full"
            aria-label={`Outreach status for ${expertName}`}
          >
            {OUTREACH_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="mt-3 block">
        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-ink-faint">
          Call objective
        </span>
        <textarea
          value={objectiveValue}
          onChange={(event) => update({ objective: event.target.value })}
          rows={2}
          className="w-full rounded-md border border-line-strong bg-white px-3 py-2 text-[12px] outline-none focus:border-accent"
          aria-label={`Call objective for ${expertName}`}
        />
      </label>

      <label className="mt-3 block">
        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-ink-faint">
          Notes
        </span>
        <textarea
          value={current.note}
          onChange={(event) => update({ note: event.target.value })}
          placeholder="Outreach notes, intro path, scheduling…"
          rows={3}
          className="w-full rounded-md border border-line-strong bg-white px-3 py-2 text-[12px] outline-none focus:border-accent"
          aria-label={`Outreach notes for ${expertName}`}
        />
      </label>

      {!hasOutreach ? (
        <p className="mt-2 text-[11px] text-ink-faint">
          No outreach state yet — assign an owner or add notes to track this call.
        </p>
      ) : null}
    </section>
  );
}
