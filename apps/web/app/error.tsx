"use client";

import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="ee-shell flex min-h-[60vh] items-center justify-center px-5 py-16">
      <div className="ee-panel max-w-lg rounded-lg p-8 text-center">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
          Expert Engine
        </div>
        <h1 className="mt-3 text-[22px] font-semibold tracking-tight">Something went wrong</h1>
        <p className="mt-3 text-[13px] leading-relaxed text-ink-soft">
          The page could not load. This is usually temporary — try again or return to the Command
          Centre.
        </p>
        {process.env.NODE_ENV === "development" ? (
          <p className="mt-3 text-left text-[11px] text-ink-faint">{error.message}</p>
        ) : null}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={reset} className="ee-button ee-button-primary">
            Try again
          </button>
          <Link href="/" className="ee-button ee-button-secondary">
            Command Centre
          </Link>
        </div>
      </div>
    </div>
  );
}
