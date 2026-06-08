"use client";

import { useMemo, useSyncExternalStore } from "react";

export type WorkspaceKind = "call" | "target" | "memo";

export interface WorkspaceItem {
  id: string;
  kind: WorkspaceKind;
  name: string;
  sub?: string;
  href: string;
  theme?: string;
  note?: string;
  status: string;
  addedAt: string;
}

export const WORKSPACE_STORAGE_KEY = "towerbrook-investor-workspace-v1";
export const WORKSPACE_EVENT = "towerbrook-investor-workspace-updated";

export const DEFAULT_WORKSPACE_STATUS: Record<WorkspaceKind, string> = {
  call: "shortlisted",
  target: "watchlist",
  memo: "copilot note",
};

export const WORKSPACE_KIND_LABEL: Record<WorkspaceKind, string> = {
  call: "Experts to call",
  target: "Companies to validate",
  memo: "Memo notes",
};

export const WORKSPACE_STATUS_OPTIONS: Record<WorkspaceKind, string[]> = {
  call: ["shortlisted", "owner assigned", "outreach sent", "scheduled", "completed"],
  target: [
    "watchlist",
    "research candidate",
    "needs validation",
    "owner assigned",
    "promoted target",
    "comparable",
    "rejected",
  ],
  memo: ["copilot note", "memo draft", "reviewed", "included"],
};

export function useWorkspaceItems(): WorkspaceItem[] {
  const snapshot = useSyncExternalStore(subscribeWorkspace, readWorkspaceSnapshot, () => "[]");
  return useMemo(() => parseWorkspace(snapshot), [snapshot]);
}

export function readWorkspace(): WorkspaceItem[] {
  return parseWorkspace(readWorkspaceSnapshot());
}

export function readWorkspaceSnapshot(): string {
  if (typeof window === "undefined") return "[]";
  return window.localStorage.getItem(WORKSPACE_STORAGE_KEY) ?? "[]";
}

export function parseWorkspace(value: string): WorkspaceItem[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(isWorkspaceItem) : [];
  } catch {
    return [];
  }
}

export function subscribeWorkspace(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(WORKSPACE_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener(WORKSPACE_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

export function writeWorkspace(items: WorkspaceItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(WORKSPACE_EVENT));
}

export function upsertWorkspaceItem(
  item: Omit<WorkspaceItem, "addedAt" | "status"> & { status?: string },
) {
  const current = readWorkspace();
  const nextItem: WorkspaceItem = {
    ...item,
    status: item.status ?? DEFAULT_WORKSPACE_STATUS[item.kind],
    addedAt: new Date().toISOString(),
  };
  writeWorkspace([
    nextItem,
    ...current.filter((existing) => !(existing.id === item.id && existing.kind === item.kind)),
  ].slice(0, 30));
}

export function updateWorkspaceItem(
  item: Pick<WorkspaceItem, "id" | "kind">,
  patch: Partial<Pick<WorkspaceItem, "status" | "note">>,
) {
  writeWorkspace(
    readWorkspace().map((existing) =>
      existing.id === item.id && existing.kind === item.kind
        ? { ...existing, ...patch }
        : existing,
    ),
  );
}

export function isWorkspaceSaved(id: string, kind: WorkspaceKind): boolean {
  return readWorkspace().some((item) => item.id === id && item.kind === kind);
}

export function removeWorkspaceItem(id: string, kind: WorkspaceKind) {
  writeWorkspace(readWorkspace().filter((item) => !(item.id === id && item.kind === kind)));
}

export function toggleWorkspaceItem(
  item: Omit<WorkspaceItem, "addedAt" | "status"> & { status?: string },
) {
  if (isWorkspaceSaved(item.id, item.kind)) {
    removeWorkspaceItem(item.id, item.kind);
    return false;
  }
  upsertWorkspaceItem(item);
  return true;
}

export function pulseWorkspaceBasket() {
  if (typeof document === "undefined") return;
  const counter = document.getElementById("towerbrook-basket-counter");
  if (!counter) return;
  counter.classList.add("scale-110");
  window.setTimeout(() => counter.classList.remove("scale-110"), 180);
}

export function workspaceKindLabel(kind: string): string {
  if (kind === "call") return "Expert";
  if (kind === "target") return "Company";
  return "Note";
}

function isWorkspaceItem(item: unknown): item is WorkspaceItem {
  if (!item || typeof item !== "object") return false;
  const candidate = item as Partial<WorkspaceItem>;
  return Boolean(
    candidate.id &&
      candidate.name &&
      candidate.href &&
      candidate.status &&
      candidate.addedAt &&
      (candidate.kind === "call" || candidate.kind === "target" || candidate.kind === "memo"),
  );
}
