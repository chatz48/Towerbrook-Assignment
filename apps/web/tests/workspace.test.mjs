import assert from "node:assert/strict";
import test from "node:test";

function installFakeWindow() {
  const store = new Map();
  const listeners = new Map();
  global.window = {
    localStorage: {
      getItem(key) {
        return store.has(key) ? store.get(key) : null;
      },
      setItem(key, value) {
        store.set(key, String(value));
      },
      removeItem(key) {
        store.delete(key);
      },
    },
    addEventListener(name, callback) {
      const current = listeners.get(name) ?? new Set();
      current.add(callback);
      listeners.set(name, current);
    },
    removeEventListener(name, callback) {
      listeners.get(name)?.delete(callback);
    },
    dispatchEvent(event) {
      for (const callback of listeners.get(event.type) ?? []) callback(event);
      return true;
    },
  };
  return { store, listeners };
}

const { store, listeners } = installFakeWindow();
const workspace = await import("../lib/workspace.ts");

test("workspace store validates, dedupes, and updates saved items", () => {
  store.clear();
  listeners.clear();

  workspace.upsertWorkspaceItem({
    id: "james-knight",
    kind: "call",
    name: "James Knight",
    href: "/experts/james-knight",
    sub: "Managing Partner, Augusta & Co",
  });
  workspace.upsertWorkspaceItem({
    id: "james-knight",
    kind: "call",
    name: "James Knight",
    href: "/experts/james-knight",
    sub: "Managing Partner, Augusta & Co",
    status: "scheduled",
  });
  workspace.upsertWorkspaceItem({
    id: "zenobe",
    kind: "target",
    name: "Zenobe",
    href: "/companies/zenobe",
  });

  assert.deepEqual(
    workspace.readWorkspace().map((item) => `${item.kind}:${item.id}:${item.status}`),
    ["target:zenobe:watchlist", "call:james-knight:scheduled"],
  );
  assert.equal(workspace.isWorkspaceSaved("james-knight", "call"), true);

  workspace.updateWorkspaceItem({ id: "james-knight", kind: "call" }, { status: "completed" });
  assert.equal(
    workspace.readWorkspace().find((item) => item.id === "james-knight")?.status,
    "completed",
  );

  for (const status of ["watchlist", "research candidate", "promoted target", "comparable"]) {
    assert.equal(
      workspace.WORKSPACE_STATUS_OPTIONS.target.includes(status),
      true,
      `${status} should be selectable for saved target items`,
    );
  }
});

test("workspace parser drops malformed records", () => {
  const parsed = workspace.parseWorkspace(
    JSON.stringify([
      { id: "missing-fields", kind: "call" },
      {
        id: "note-1",
        kind: "memo",
        name: "Memo note",
        href: "/reports",
        status: "memo draft",
        addedAt: "2026-06-07T00:00:00.000Z",
      },
      {
        id: "bad-kind",
        kind: "other",
        name: "Bad",
        href: "/bad",
        status: "saved",
        addedAt: "2026-06-07T00:00:00.000Z",
      },
    ]),
  );

  assert.deepEqual(
    parsed.map((item) => item.id),
    ["note-1"],
  );
});
