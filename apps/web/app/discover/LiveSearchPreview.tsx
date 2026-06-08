import type { LiveSearchPreview } from "./discover-types";

export function LiveSearchPreviewCard({ preview }: { preview: LiveSearchPreview }) {
  return (
    <div className="mt-4 rounded-md border border-blue-200 bg-blue-50 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[12px] font-semibold text-blue-800">Live search preview</div>
          <p className="mt-1 text-[11px] leading-relaxed text-blue-700">
            {preview.results.length
              ? `Found ${preview.results.length} source${preview.results.length === 1 ? "" : "s"} from ${preview.providers.join(", ")}. Review before promoting to the graph.`
              : preview.configured
                ? preview.error ?? "A provider is configured, but no sources were returned."
                : "No live search provider configured; using static queues."}
          </p>
        </div>
      </div>
      {preview.results.length ? (
        <div className="mt-3 space-y-2">
          {preview.results.slice(0, 4).map((source) => (
            <a
              key={source.url}
              href={source.url}
              target="_blank"
              rel="noreferrer"
              className="block rounded border border-blue-100 bg-white p-2 text-[11px] hover:border-blue-300"
            >
              <span className="font-semibold text-accent line-clamp-1">{source.title}</span>
              <span className="mt-1 block line-clamp-2 leading-relaxed text-ink-soft">{source.snippet || source.url}</span>
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}
