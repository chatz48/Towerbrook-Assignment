import { PageShell } from "@/app/components/ui";

export default function Loading() {
  return (
    <PageShell innerClassName="mx-auto max-w-[1540px] animate-pulse space-y-5">
        <div className="ee-panel rounded-lg p-6">
          <div className="h-4 w-32 rounded bg-line" />
          <div className="mt-4 h-8 w-2/3 max-w-lg rounded bg-line" />
          <div className="mt-3 h-4 w-full max-w-xl rounded bg-line" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="ee-panel h-44 rounded-lg" />
          ))}
        </div>
        <div className="ee-panel h-72 rounded-lg" />
    </PageShell>
  );
}
