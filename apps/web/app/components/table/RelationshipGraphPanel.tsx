"use client";

import Link from "next/link";
import ThemeGraph from "@/app/components/ThemeGraph";
import type { EntityGraphModel } from "@/lib/entity-graph";

export default function RelationshipGraphPanel({
  graph,
  active,
}: {
  graph: EntityGraphModel;
  active: boolean;
}) {
  if (!active) return null;

  return (
    <section className="overflow-hidden rounded-md border border-line bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-3 py-2.5">
        <span className="text-[13px] font-semibold text-ink">
          Relationship graph
          {graph.links.length ? (
            <span className="ml-2 text-[12px] font-normal text-ink-faint">
              {graph.experts.length} people · {graph.companies.length} companies
            </span>
          ) : null}
        </span>
        <Link href={graph.fullGraphHref} className="text-[12px] font-semibold text-accent hover:underline">
          Open full graph →
        </Link>
      </div>

      {graph.links.length ? (
        <ThemeGraph
          experts={graph.experts}
          companies={graph.companies}
          links={graph.links}
          accent={graph.accent}
        />
      ) : (
        <div className="space-y-2 px-3 py-4 text-[13px] text-ink-soft">
          <p>No mapped connections match the current theme and confidence filters.</p>
          <Link href={graph.fullGraphHref} className="font-semibold text-accent hover:underline">
            Browse full graph explorer →
          </Link>
        </div>
      )}
    </section>
  );
}
