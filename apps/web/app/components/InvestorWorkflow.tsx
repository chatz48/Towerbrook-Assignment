export function CallPrepChecklist({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    <section className="rounded-lg border border-line bg-paper p-4">
      <div className="ee-label text-ink">{title}</div>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-[12px] leading-relaxed text-ink-soft">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
