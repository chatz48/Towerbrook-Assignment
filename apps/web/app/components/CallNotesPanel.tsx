"use client";

import { useState } from "react";
import Link from "next/link";
import { userFacingError } from "@/lib/user-errors";

export default function CallNotesPanel({
  expertName,
}: {
  expertId: string;
  expertName: string;
}) {
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function extractFromNotes() {
    if (!notes.trim()) return;
    setLoading(true);
    setMessage("");
    try {
      const body = new FormData();
      body.set("text", notes);
      body.set("title", `Call notes — ${expertName}`);
      const res = await fetch("/api/ingest", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Extraction failed");
      const companies =
        data.extraction?.companies?.length ??
        data.facts?.filter((fact: { factType: string }) => fact.factType === "target_company").length ??
        0;
      setMessage(
        `Extracted ${companies || "new"} entities from your notes. Review in Ingest or add follow-up tasks in the research queue.`,
      );
    } catch (error) {
      setMessage(userFacingError(error, "Could not extract from call notes."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="ee-panel rounded-lg p-5">
      <div className="ee-label text-ink">After-call compounding</div>
      <h2 className="mt-2 text-[16px] font-semibold">Log call notes</h2>
      <p className="mt-2 text-[12px] leading-relaxed text-ink-soft">
        Paste notes from your call with {expertName}. We extract mentioned companies, people, and
        claims into the research queue.
      </p>
      <textarea
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        rows={5}
        placeholder="Companies mentioned, follow-up intros, claims to verify..."
        className="mt-3 w-full resize-y rounded-md border border-line-strong bg-white px-3 py-2 text-[13px] outline-none focus:border-accent"
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={extractFromNotes}
          disabled={loading || !notes.trim()}
          className="ee-button ee-button-primary min-h-8 px-3 disabled:opacity-50"
        >
          {loading ? "Extracting..." : "Extract to research queue"}
        </button>
        <Link href="/discover" className="ee-button ee-button-secondary min-h-8 px-3">
          Open research queue
        </Link>
      </div>
      {message ? <p className="mt-3 text-[12px] text-ink-soft">{message}</p> : null}
    </section>
  );
}
