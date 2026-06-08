"use client";

import type { ReactNode } from "react";

export function ExpandChevron({ expanded }: { expanded: boolean }) {
  return (
    <span
      className={`inline-block text-ink-faint transition-transform ${expanded ? "rotate-90 text-accent" : ""}`}
      aria-hidden="true"
    >
      ▸
    </span>
  );
}

export function ExpandedRowPanel({
  colSpan,
  children,
}: {
  colSpan: number;
  children: ReactNode;
}) {
  return (
    <tr className="bg-[#f7f9fc]">
      <td colSpan={colSpan} className="border-b border-line !p-0">
        <div className="border-l-2 border-accent px-4 py-4">{children}</div>
      </td>
    </tr>
  );
}

export function rowExpandClass(expanded: boolean, saved = false) {
  return [
    "cursor-pointer transition-colors",
    expanded ? "bg-[#edf5ff]" : "hover:bg-[#fbfcff]",
    saved && !expanded ? "bg-emerald-50/40" : "",
  ]
    .filter(Boolean)
    .join(" ");
}
