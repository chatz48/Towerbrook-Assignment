export function PriorityScore({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-2.5 py-1 text-[12px] font-semibold tabular-nums">
      <span className="h-2 w-2 rounded-full bg-[var(--success)]" />
      {value}
    </span>
  );
}

export function EmptyQueue() {
  return (
    <div className="p-8 text-center text-[13px] text-ink-soft">
      No leads match the current filters. Broaden the theme or clear the search.
    </div>
  );
}
